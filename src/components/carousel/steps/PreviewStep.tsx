"use client";
import { useState } from "react";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { CarouselConfig } from "@/lib/types";

type Props = { config: CarouselConfig; onRestart: () => void; onChangeHook: () => void };

export default function PreviewStep({ config, onRestart, onChangeHook }: Props) {
  const [downloading, setDownloading] = useState<number | null>(null);

  const { content, selectedHook, graphicStyles } = config;
  const hook = content.hooks[selectedHook];

  async function downloadSlide(index: number) {
    setDownloading(index);
    try {
      const el = document.getElementById(`slide-${index}`);
      if (!el) return;
      const res = await fetch("/api/carousel/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex: index, html: el.outerHTML }),
      });
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

  const slides = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} scale={0.5} id="slide-0" />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphicStyle={graphicStyles[0]} scale={0.5} id="slide-1" />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphicStyle={graphicStyles[1]} scale={0.5} id="slide-2" />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphicStyle={graphicStyles[2]} scale={0.5} id="slide-3" />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={0.5} id="slide-4" />,
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1e7a8a", textTransform: "uppercase", letterSpacing: "0.08em" }}>Your carousel</h2>
          <p style={{ color: "#4a5568", marginTop: 4, fontSize: 16 }}>Download individual slides or all at once.</p>
        </div>
        <button
          onClick={downloadAll}
          style={{ background: "#1e7a8a", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 600, fontFamily: "Outfit, sans-serif", cursor: "pointer" }}
        >
          Download all (5 PNGs)
        </button>
      </div>

      <div style={{ display: "flex", gap: 24, overflowX: "auto", paddingBottom: 16 }}>
        {slides.map((slide, i) => (
          <div key={i} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {slide}
            <button
              onClick={() => downloadSlide(i)}
              disabled={downloading === i}
              style={{
                background: downloading === i ? "#e2e8f0" : "#ffffff",
                color: "#1e7a8a",
                border: "2px solid #1e7a8a",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "Outfit, sans-serif",
                cursor: downloading === i ? "not-allowed" : "pointer",
              }}
            >
              {downloading === i ? "Exporting..." : `Download slide ${i + 1}`}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 32 }}>
        <button onClick={onChangeHook} style={{ background: "transparent", color: "#1e7a8a", border: "none", fontSize: 15, fontWeight: 600, fontFamily: "Outfit, sans-serif", cursor: "pointer", textDecoration: "underline" }}>
          ← Change hook
        </button>
        <button onClick={onRestart} style={{ background: "transparent", color: "#4a5568", border: "none", fontSize: 15, fontFamily: "Outfit, sans-serif", cursor: "pointer", textDecoration: "underline" }}>
          Start over
        </button>
      </div>
    </div>
  );
}
