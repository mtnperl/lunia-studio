"use client";
import { useEffect, useRef, useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow, SavedCarousel } from "@/lib/types";

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
        <div style={{ fontSize: 13, fontWeight: 700, color: "#102635", fontFamily: "Arial, sans-serif" }}>
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
        <div style={{ fontSize: 12, color: "#B0413E" }}>Failed to load library: {loadError}</div>
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
                background: c.id === current.id ? "rgba(16,38,53,0.06)" : "transparent",
                border: c.id === current.id ? "1px solid rgba(16,38,53,0.25)" : "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#102635" }}>{c.topic}</div>
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
                background: "#102635",
                color: "#BFFBF8",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                borderRadius: 3,
                textTransform: "uppercase",
                fontFamily: "Arial, sans-serif",
              }}
            >
              ✉ From carousel
            </span>
            <span style={{ fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "#102635" }}>
              {carousel.topic}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--muted)",
                background: "var(--surface-r, #fafaf9)",
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
          <button
            onClick={() => setShowPicker((v) => !v)}
            disabled={busy}
            style={{
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 600,
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              cursor: busy ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Change carousel
          </button>
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
              padding: "10px 14px",
              background: "#102635",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#BFFBF8", fontFamily: "Arial, sans-serif" }}>
              Hook
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "Arial, sans-serif" }}>
              {hook.headline}
            </div>
            {hook.subline && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Arial, sans-serif" }}>
                {hook.subline}
              </div>
            )}
          </div>
        )}

        {/* Slides */}
        {slideHeadlines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "Arial, sans-serif" }}>
              Slides
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {slideHeadlines.map((h, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "#1A1A1A",
                    fontFamily: "Arial, sans-serif",
                    display: "flex",
                    gap: 8,
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 10, color: "var(--muted)", minWidth: 18 }}>S{i + 1}</span>
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
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", fontFamily: "Arial, sans-serif" }}>
              Additional instructions (optional)
            </div>
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Keep it to 2 emails. No discount. Lead with the science angle."
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.5,
                background: "var(--surface-r, #fafaf9)",
                color: "#1A1A1A",
                border: "1px solid var(--border)",
                borderRadius: 7,
                fontFamily: "Arial, sans-serif",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            {userComment.length > 400 && (
              <div style={{ fontSize: 11, color: userComment.length >= 500 ? "#B0413E" : "var(--muted)", textAlign: "right" }}>
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
            background: "rgba(176, 65, 62, 0.08)",
            border: "1px solid rgba(176, 65, 62, 0.3)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, color: "#B0413E" }}>{error}</div>
          <button
            onClick={() => convert(carousel)}
            style={{
              padding: "7px 14px",
              fontSize: 12,
              fontWeight: 700,
              background: "#102635",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!busy && error && (
          <button
            onClick={() => convert(carousel)}
            style={{
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              background: "#102635",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            ✦ Convert
          </button>
        )}
        <button
          onClick={handleStartOver}
          disabled={busy}
          style={{
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          ← Start over
        </button>
      </div>
    </div>
  );
}
