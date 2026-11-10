"use client";
import { useEffect, useRef, useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow, SavedCarousel } from "@/lib/types";
import { Button } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  carousel: SavedCarousel;
  onConvert: (flow: EmailFlow) => void;
  onCancel: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a short list of slide headline strings for the E2 preview. */
function getSlideHeadlines(carousel: SavedCarousel): string[] {
  if (carousel.format === "did_you_know" && carousel.didYouKnowContent) {
    return [carousel.didYouKnowContent.slide1.header];
  }
  const slides = carousel.content.slides ?? [];
  return slides
    .slice(0, 3)
    .map((s) => s.headline)
    .filter(Boolean);
}

// ─── CarouselPicker ────────────────────────────────────────────────────────────

type PickerProps = {
  current: SavedCarousel;
  onPick: (c: SavedCarousel) => void;
  onClose: () => void;
};

function CarouselPicker({ current, onPick, onClose }: PickerProps) {
  const [carousels, setCarousels] = useState<SavedCarousel[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/carousel/library")
      .then(async (r) => {
        const data = await r.json();
        if (!alive) return;
        if (!r.ok) { setLoadError(data.error ?? `${r.status}`); return; }
        setCarousels((data.carousels ?? data) as SavedCarousel[]);
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : String(err)));
    return () => { alive = false; };
  }, []);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text)" }}>
          Choose a carousel
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "var(--muted)", lineHeight: 1, padding: "2px 6px" }}
        >
          ×
        </button>
      </div>

      {!carousels && !loadError && (
        <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "'Courier New', monospace", letterSpacing: "0.06em" }}>
          Loading carousel library…
        </div>
      )}

      {loadError && (
        <div style={{ fontSize: 12, color: "var(--ui-danger)" }}>Failed to load library: {loadError}</div>
      )}

      {carousels && carousels.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>No carousels saved yet.</div>
      )}

      {carousels && carousels.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {carousels.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                background: c.id === current.id ? "var(--ui-selection-tint)" : "transparent",
                border: c.id === current.id ? "1px solid var(--ui-border)" : "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text)" }}>{c.topic}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {c.format ?? "standard"} · {new Date(c.savedAt).toLocaleDateString()}
                {c.id === current.id && " · current"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Panel ─────────────────────────────────────────────────────────────────────

export default function CarouselToEmailPanel({ carousel: initialCarousel, onConvert, onCancel }: Props) {
  const [carousel, setCarousel] = useState<SavedCarousel>(initialCarousel);
  const [userComment, setUserComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hook = carousel.content.hooks[carousel.selectedHook] ?? carousel.content.hooks[0];
  const slideHeadlines = getSlideHeadlines(carousel);

  // E1: auto-fire conversion on mount (and whenever carousel changes)
  useEffect(() => {
    convert(carousel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousel.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  async function convert(c: SavedCarousel) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/email-review/carousel-to-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carousel: c, userComment: userComment.trim() || undefined }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok || !data.flow) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      // E3: auto-jump to review immediately
      onConvert(data.flow as EmailFlow);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleCarouselPick(c: SavedCarousel) {
    setShowPicker(false);
    setCarousel(c);
    // Changing carousel.id triggers the useEffect above, which calls convert()
  }

  function handleStartOver() {
    abortRef.current?.abort();
    onCancel();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* E2: Static carousel preview */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "3px 9px",
                background: "var(--ui-ink)",
                color: "var(--ui-text-2)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                borderRadius: 3,
                textTransform: "uppercase",
              }}
            >
              From carousel
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>
              {carousel.topic}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--muted)",
                background: "var(--surface-r, var(--ui-surface))",
                border: "1px solid var(--border)",
                borderRadius: 3,
                padding: "2px 7px",
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.04em",
              }}
            >
              {carousel.format ?? "standard"}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowPicker((v) => !v)} disabled={busy}>
            Change carousel
          </Button>
        </div>

        {/* Inline picker (E5) */}
        {showPicker && (
          <CarouselPicker
            current={carousel}
            onPick={handleCarouselPick}
            onClose={() => setShowPicker(false)}
          />
        )}

        {/* Hook */}
        {hook && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--ui-surface)",
              border: "1px solid var(--ui-border)",
              borderRadius: "var(--ui-radius-3)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", color: "var(--ui-text-2)" }}>
              Hook
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>
              {hook.headline}
            </div>
            {hook.subline && (
              <div style={{ fontSize: 13, color: "var(--ui-text-2)" }}>
                {hook.subline}
              </div>
            )}
          </div>
        )}

        {/* Slides */}
        {slideHeadlines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", color: "var(--muted)" }}>
              Slides
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {slideHeadlines.map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "var(--ui-text)",
                    display: "flex",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 18 }}>S{i + 1}</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional userComment — only shown when not mid-convert (i.e. the
            carousel was changed while idle or user hit "Try again") */}
        {!busy && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", color: "var(--muted)" }}>
              Additional instructions (optional)
            </div>
            <textarea className="ui-input"
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Keep it to 2 emails. No discount. Lead with the science angle."
            />
            {userComment.length > 400 && (
              <div style={{ fontSize: 11, color: userComment.length >= 500 ? "var(--ui-danger)" : "var(--muted)", textAlign: "right" }}>
                {userComment.length}/500
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status / loader */}
      {busy && (
        <MiniReviewLoader
          label="converting carousel to email flow"
          detail="DRAFTING EMAILS"
          engine="claude opus 4.7 · with thinking"
        />
      )}

      {/* Error state */}
      {error && !busy && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--ui-danger-tint)",
            border: "1px solid var(--ui-border)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ui-danger)" }}>{error}</div>
          <Button variant="primary" size="sm" onClick={() => convert(carousel)}>
            Try again
          </Button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!busy && error && (
          <Button variant="primary" size="md" onClick={() => convert(carousel)}>
            ✨ Convert
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={handleStartOver} disabled={busy}>
          ← Start over
        </Button>
      </div>
    </div>
  );
}
