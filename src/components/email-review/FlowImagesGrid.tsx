"use client";
import { useEffect, useRef, useState } from "react";
import ImagePromptCard from "@/components/email-review/ImagePromptCard";
import type { FlowReviewImagePrompt, SavedFlowReview } from "@/lib/types";

type Props = {
  review: SavedFlowReview;
  onReviewUpdate: (next: SavedFlowReview) => void;
};

export default function FlowImagesGrid({ review, onReviewUpdate }: Props) {
  const [batching, setBatching] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for status updates while any prompt is generating. Self-stops when
  // every prompt is settled (ready or error).
  useEffect(() => {
    const anyGenerating = review.imagePrompts.some((p) => p.status === "generating");
    if (!anyGenerating) {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    if (pollingRef.current) return; // already polling
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/email-review/${review.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.review) onReviewUpdate(data.review as SavedFlowReview);
      } catch { /* swallow */ }
    }, 4_000);
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [review, onReviewUpdate]);

  async function generateAll() {
    // Fan out in the BROWSER — one /generate-image POST per prompt, in
    // parallel. Server-side fan-out hits Vercel's deployment-protection
    // auth wall (child requests don't carry the user's session cookie)
    // which leaves prompts stuck on "generating" forever.
    //
    // Re-trigger cancels in-flight fetches via AbortController so a second
    // click during a slow render restarts cleanly.
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBatching(true);
    setBatchError(null);

    const targets = review.imagePrompts.filter((p) => p.status !== "ready");
    if (targets.length === 0) { setBatching(false); return; }

    // Optimistically mark every target as generating so the cards show
    // loaders immediately while requests are in flight.
    onReviewUpdate({
      ...review,
      imagePrompts: review.imagePrompts.map((p) =>
        p.status === "ready" ? p : { ...p, status: "generating", errorMessage: undefined },
      ),
    });

    const results = await Promise.allSettled(
      targets.map((p) =>
        fetch("/api/email-review/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewId: review.id, promptId: p.id }),
          signal: ctrl.signal,
        }).then(async (r) => {
          const data = await r.json().catch(() => ({}));
          return { id: p.id, ok: r.ok && !!data.prompt, prompt: data.prompt as FlowReviewImagePrompt | undefined, error: data.error as string | undefined };
        }),
      ),
    );

    if (ctrl.signal.aborted) return; // user re-clicked; the new run owns state

    // After Promise.allSettled returns, we re-fetch the review once so we
    // get the canonical state (including any updates the polling hook
    // already merged). This also keeps the UI accurate when individual
    // fetches failed at the network layer.
    try {
      const res = await fetch(`/api/email-review/${review.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.review) onReviewUpdate(data.review as SavedFlowReview);
      }
    } catch { /* ignore */ }

    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0) {
      const first = failed[0];
      const detail = first.status === "rejected"
        ? (first.reason instanceof Error ? first.reason.message : String(first.reason))
        : (first.value.error ?? "render failed");
      setBatchError(`${failed.length} of ${targets.length} renders failed. First: ${detail}`);
    }
    setBatching(false);
  }

  function updatePrompt(next: FlowReviewImagePrompt) {
    onReviewUpdate({
      ...review,
      imagePrompts: review.imagePrompts.map((p) => (p.id === next.id ? next : p)),
    });
  }

  const total = review.imagePrompts.length;
  const ready = review.imagePrompts.filter((p) => p.status === "ready").length;
  const generating = review.imagePrompts.filter((p) => p.status === "generating").length;

  if (total === 0) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, color: "#102635" }}>
            Recommended images
          </h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {ready} of {total} rendered{generating > 0 ? ` · ${generating} generating` : ""}
          </div>
        </div>
        <button
          onClick={generateAll}
          disabled={batching}
          style={{
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 700,
            background: batching ? "rgba(16, 38, 53, 0.6)" : "#102635",
            color: "#fff",
            border: "1px solid #102635",
            borderRadius: 6,
            cursor: batching ? "wait" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          {batching ? "Restarting batch…" : generating > 0 ? `Restart batch (cancels ${generating})` : "🌄 Generate all images"}
        </button>
      </header>
      {batchError && (
        <div style={{ padding: "8px 12px", background: "rgba(176, 65, 62, 0.08)", border: "1px solid rgba(176, 65, 62, 0.3)", borderRadius: 6, fontSize: 12, color: "#B0413E" }}>
          {batchError}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
        {review.imagePrompts.map((p) => (
          <ImagePromptCard key={p.id} reviewId={review.id} prompt={p} onUpdate={updatePrompt} />
        ))}
      </div>
    </section>
  );
}
