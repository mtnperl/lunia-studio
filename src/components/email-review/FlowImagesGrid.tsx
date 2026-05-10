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
    // If already generating, abort and restart fresh — per the AbortController
    // UX decision in the plan.
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBatching(true);
    setBatchError(null);
    try {
      const res = await fetch("/api/email-review/generate-images-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setBatchError(data.error ?? `${res.status}`);
        return;
      }
      // Optimistically mark every non-ready prompt as generating; the polling
      // hook above will pick up the real status as fal lands each render.
      const next: SavedFlowReview = {
        ...review,
        imagePrompts: review.imagePrompts.map((p) => p.status === "ready" ? p : { ...p, status: "generating", errorMessage: undefined }),
      };
      onReviewUpdate(next);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return; // intentional
      setBatchError(err instanceof Error ? err.message : String(err));
    } finally {
      setBatching(false);
    }
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
