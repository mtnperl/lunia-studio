"use client";
import { useState } from "react";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { CarouselConfig, HookTone } from "@/lib/types";

type Props = {
  config: CarouselConfig;
  hookTone: HookTone;
  onRestart: () => void;
  onChangeHook: () => void;
  onContentChange: (config: CarouselConfig) => void;
};

export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onContentChange }: Props) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy share link");
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const { content, selectedHook, graphicStyles, topic } = config;
  const hook = content.hooks[selectedHook];

  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const el = document.getElementById(`slide-${index}`);
      if (!el) return;
      // Clone and remove the preview scale transform so Puppeteer renders at full 1080×1350
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.transformOrigin = "top left";
      const res = await fetch("/api/carousel/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex: index, html: clone.outerHTML }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setExportError((err as { error?: string }).error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lunia-carousel-slide-${index + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    for (let i = 0; i < 5; i++) {
      await downloadSlide(i);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/carousel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          hookTone,
          content,
          selectedHook,
          graphicStyles,
        }),
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
    const url = `${window.location.origin}/carousels/${savedId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy share link"), 2000);
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

  const slides = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} scale={0.5} id="slide-0" />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphicStyle={graphicStyles[0]} scale={0.5} id="slide-1" />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphicStyle={graphicStyles[1]} scale={0.5} id="slide-2" />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphicStyle={graphicStyles[2]} scale={0.5} id="slide-3" />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={0.5} id="slide-4" />,
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>Your carousel</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Download individual slides or all at once.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {savedId ? (
            <button
              onClick={handleCopyShareLink}
              style={{
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                color: "var(--text)",
              }}
            >
              {copyLabel}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: "transparent",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                color: "var(--text)",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Save carousel"}
            </button>
          )}
          <button
            onClick={downloadAll}
            style={{
              background: "var(--text)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Download all (5 PNGs)
          </button>
        </div>
      </div>

      {exportError && (
        <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#9b1c1c" }}>
          Export error: {exportError}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 16 }}>
        {slides.map((slide, i) => (
          <div key={i} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            {slide}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => downloadSlide(i)}
                disabled={downloading === i}
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 7,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: downloading === i ? "not-allowed" : "pointer",
                  opacity: downloading === i ? 0.5 : 1,
                }}
              >
                {downloading === i ? "Exporting..." : `↓ Slide ${i + 1}`}
              </button>
              {i >= 1 && i <= 3 && (
                <button
                  onClick={() => handleRegenerateSlide(i - 1)}
                  disabled={regenerating === i - 1}
                  title="Regenerate this slide"
                  style={{
                    background: "var(--bg)",
                    color: "var(--muted)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 7,
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: regenerating === i - 1 ? "not-allowed" : "pointer",
                    opacity: regenerating === i - 1 ? 0.5 : 1,
                  }}
                >
                  {regenerating === i - 1 ? "..." : "↺"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 28 }}>
        <button onClick={onChangeHook} style={{ background: "transparent", color: "var(--text)", border: "none", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline" }}>
          ← Change hook
        </button>
        <button onClick={onRestart} style={{ background: "transparent", color: "var(--muted)", border: "none", fontSize: 14, fontFamily: "inherit", cursor: "pointer", textDecoration: "underline" }}>
          Start over
        </button>
      </div>
    </div>
  );
}
