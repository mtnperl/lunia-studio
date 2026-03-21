"use client";
import { CarouselContent } from "@/lib/types";

type Props = { content: CarouselContent; onChange: (c: CarouselContent) => void; onNext: () => void };

export default function ContentStep({ content, onChange, onNext }: Props) {
  const updateHook = (i: number, field: "headline" | "subline", val: string) => {
    const hooks = [...content.hooks];
    hooks[i] = { ...hooks[i], [field]: val };
    onChange({ ...content, hooks });
  };

  const updateSlide = (i: number, field: "headline" | "body" | "citation", val: string) => {
    const slides = [...content.slides];
    slides[i] = { ...slides[i], [field]: val };
    onChange({ ...content, slides });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 15,
    border: "1.5px solid #e2e8f0",
    borderRadius: 8,
    fontFamily: "Outfit, sans-serif",
    outline: "none",
    background: "#ffffff",
  };

  const labelStyle = {
    display: "block" as const,
    fontSize: 12,
    fontWeight: 600,
    color: "#4a5568",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1e7a8a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Review content</h2>
      <p style={{ color: "#4a5568", marginBottom: 32, fontSize: 16 }}>Edit any field before continuing.</p>

      {/* Slide 1: Hooks */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e7a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Slide 1 — Hook variants</div>
        {content.hooks.map((h, i) => (
          <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < 2 ? "1px solid #f0f0ee" : "none" }}>
            <div style={{ fontWeight: 600, color: "#4a5568", fontSize: 13, marginBottom: 10 }}>Hook {i + 1}</div>
            <label style={labelStyle}>Headline</label>
            <input style={{ ...inputStyle, marginBottom: 8 }} value={h.headline} onChange={(e) => updateHook(i, "headline", e.target.value)} />
            <label style={labelStyle}>Subline</label>
            <input style={inputStyle} value={h.subline} onChange={(e) => updateHook(i, "subline", e.target.value)} />
          </div>
        ))}
      </div>

      {/* Slides 2-4 */}
      {content.slides.map((slide, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 20, border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e7a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Slide {i + 2} — Content</div>
          <label style={labelStyle}>Headline</label>
          <input style={{ ...inputStyle, marginBottom: 8 }} value={slide.headline} onChange={(e) => updateSlide(i, "headline", e.target.value)} />
          <label style={labelStyle}>Body</label>
          <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 100, resize: "vertical" }} value={slide.body} onChange={(e) => updateSlide(i, "body", e.target.value)} />
          <label style={labelStyle}>Citation</label>
          <input style={inputStyle} value={slide.citation} onChange={(e) => updateSlide(i, "citation", e.target.value)} />
        </div>
      ))}

      {/* Slide 5: CTA */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 32, border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e7a8a", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Slide 5 — CTA</div>
        <label style={labelStyle}>Headline</label>
        <input style={{ ...inputStyle, marginBottom: 8 }} value={content.cta.headline} onChange={(e) => onChange({ ...content, cta: { ...content.cta, headline: e.target.value } })} />
        <label style={labelStyle}>Follow line</label>
        <input style={inputStyle} value={content.cta.followLine} onChange={(e) => onChange({ ...content, cta: { ...content.cta, followLine: e.target.value } })} />
      </div>

      <button
        onClick={onNext}
        style={{ background: "#1e7a8a", color: "#ffffff", border: "none", borderRadius: 10, padding: "16px 40px", fontSize: 16, fontWeight: 600, fontFamily: "Outfit, sans-serif", cursor: "pointer", letterSpacing: "0.05em" }}
      >
        Looks good →
      </button>
    </div>
  );
}
