"use client";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { BrandStyle, CarouselConfig, HookTone } from "@/lib/types";

type Props = {
  config: CarouselConfig;
  hookTone: HookTone;
  onRestart: () => void;
  onChangeHook: () => void;
  onContentChange: (config: CarouselConfig) => void;
};

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.38;

export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onContentChange }: Props) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [captionCopyLabel, setCaptionCopyLabel] = useState("Copy");
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Full-size hidden refs for accurate PNG export
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  const { content, selectedHook, topic, brandStyle } = config;
  const bs: BrandStyle | undefined = brandStyle;
  const hook = content.hooks[selectedHook];

  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const el = exportRefs.current[index];
      if (!el) throw new Error("Element not found");
      const dataUrl = await toPng(el, {
        width: 1080,
        height: 1350,
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `lunia-slide-${index + 1}-${SLIDE_LABELS[index].toLowerCase().replace(" ", "-")}.png`;
      a.click();
    } catch {
      setExportError("Export failed — try again");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    setDownloadingAll(true);
    setExportError(null);
    for (let i = 0; i < 5; i++) {
      await downloadSlide(i);
    }
    setDownloadingAll(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/carousel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, hookTone, content, selectedHook }),
      });
      if (!res.ok) return;
      const { id } = await res.json();
      setSavedId(id);
    } finally {
      setSaving(false);
    }
  }

  function handleCopyShareLink() {
    if (!savedId) return;
    navigator.clipboard.writeText(`${window.location.origin}/carousels/${savedId}`).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy link"), 2000);
    });
  }

  async function handleRegenerateSlide(slideIndex: number) {
    setRegenerating(slideIndex);
    try {
      const res = await fetch("/api/carousel/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, hookTone, slideIndex }),
      });
      if (!res.ok) return;
      const { slide } = await res.json();
      const slides = [...content.slides];
      slides[slideIndex] = slide;
      onContentChange({ ...config, content: { ...content, slides } });
    } finally {
      setRegenerating(null);
    }
  }

  const slideNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} scale={PREVIEW_SCALE} brandStyle={bs} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} />,
  ];

  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} scale={1} brandStyle={bs} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} />,
  ];

  const slideW = Math.round(1080 * PREVIEW_SCALE);
  const slideH = Math.round(1350 * PREVIEW_SCALE);

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Your carousel
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {topic} · 5 slides
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {savedId ? (
            <button className="btn-ghost" onClick={handleCopyShareLink}>
              {copyLabel}
            </button>
          ) : (
            <button className="btn-ghost" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          )}
          <button
            className="btn"
            onClick={downloadAll}
            disabled={downloadingAll}
            style={{ minWidth: 160 }}
          >
            {downloadingAll ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 4 }}>⟳</span>
                Exporting…
              </>
            ) : (
              "↓ Download all (5 PNGs)"
            )}
          </button>
        </div>
      </div>

      {exportError && (
        <div style={{ background: "#fff3f3", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#991b1b" }}>
          ⚠ {exportError}
        </div>
      )}

      {/* Slide strip */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, scrollSnapType: "x mandatory" }}>
        {slideNodes.map((slide, i) => {
          const isActive = activeSlide === i;
          const isDownloading = downloading === i;
          const isRegenerating = regenerating === i - 1;
          return (
            <div
              key={i}
              onClick={() => setActiveSlide(i)}
              style={{
                flexShrink: 0,
                width: slideW,
                cursor: "pointer",
                scrollSnapAlign: "start",
              }}
            >
              {/* Slide number label */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: isActive ? "var(--text)" : "var(--muted)",
                }}>
                  {SLIDE_LABELS[i]}
                </span>
                <span style={{ fontSize: 11, color: "var(--subtle)" }}>
                  {i + 1}/5
                </span>
              </div>

              {/* Slide preview */}
              <div style={{
                borderRadius: 8,
                overflow: "hidden",
                outline: isActive ? "2px solid #1e7a8a" : "2px solid transparent",
                outlineOffset: 2,
                transition: "outline-color 0.15s",
                boxShadow: isActive
                  ? "0 0 0 4px rgba(30,122,138,0.12), 0 4px 20px rgba(0,0,0,0.12)"
                  : "0 2px 12px rgba(0,0,0,0.08)",
              }}>
                {slide}
              </div>

              {/* Slide actions */}
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); downloadSlide(i); }}
                  disabled={isDownloading || downloadingAll}
                  style={{
                    flex: 1,
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "7px 0",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: (isDownloading || downloadingAll) ? "not-allowed" : "pointer",
                    opacity: (isDownloading || downloadingAll) ? 0.5 : 1,
                    transition: "background 0.15s",
                    letterSpacing: "0.01em",
                  }}
                >
                  {isDownloading ? "…" : "↓ PNG"}
                </button>
                {i >= 1 && i <= 3 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRegenerateSlide(i - 1); }}
                    disabled={isRegenerating}
                    title="Regenerate slide"
                    style={{
                      background: "var(--surface)",
                      color: "var(--muted)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      fontSize: 13,
                      fontFamily: "inherit",
                      cursor: isRegenerating ? "not-allowed" : "pointer",
                      opacity: isRegenerating ? 0.5 : 1,
                      transition: "background 0.15s",
                    }}
                  >
                    {isRegenerating ? "…" : "↺"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
        {[0,1,2,3,4].map(i => (
          <button
            key={i}
            onClick={() => setActiveSlide(i)}
            style={{
              width: activeSlide === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: activeSlide === i ? "#1e7a8a" : "var(--border)",
              border: "none",
              cursor: "pointer",
              padding: 0,
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>

      {/* Caption */}
      {content.caption && (
        <div style={{
          marginTop: 36,
          border: "1px solid var(--border)",
          borderRadius: 10,
          overflow: "hidden",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted)" }}>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", letterSpacing: "0.01em" }}>
                Instagram caption
              </span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(content.caption).then(() => {
                  setCaptionCopyLabel("Copied!");
                  setTimeout(() => setCaptionCopyLabel("Copy"), 2000);
                });
              }}
              style={{
                background: captionCopyLabel === "Copied!" ? "#f0fdf4" : "var(--bg)",
                border: `1px solid ${captionCopyLabel === "Copied!" ? "#bbf7d0" : "var(--border-strong)"}`,
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                color: captionCopyLabel === "Copied!" ? "#15803d" : "var(--text)",
                transition: "all 0.2s",
              }}
            >
              {captionCopyLabel}
            </button>
          </div>
          <div style={{
            padding: "16px 18px",
            fontSize: 13.5,
            lineHeight: 1.7,
            color: "var(--text)",
            whiteSpace: "pre-wrap",
            background: "var(--bg)",
          }}>
            {content.caption}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 20, marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <button
          onClick={onChangeHook}
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          ← Change hook
        </button>
        <button
          onClick={onRestart}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "none",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Start over
        </button>
      </div>

      {/* Hidden full-size slides for accurate PNG export */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        {exportNodes.map((node, i) => (
          <div key={i} ref={el => { exportRefs.current[i] = el; }} style={{ width: 1080, height: 1350 }}>
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
