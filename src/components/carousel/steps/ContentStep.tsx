"use client";
import { useState } from "react";
import { CarouselContent, CarouselFormat, HookTone } from "@/lib/types";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";

type Props = {
  content: CarouselContent;
  topic: string;
  hookTone: HookTone;
  onChange: (c: CarouselContent) => void;
  onNext: () => void;
  carouselFormat?: CarouselFormat;
};

export default function ContentStep({ content, topic, hookTone, onChange, onNext, carouselFormat = "standard" }: Props) {
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [shorteningSlide, setShorteningSlide] = useState<number | null>(null);
  const [originalBodies, setOriginalBodies] = useState<Record<number, string>>({});
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [iconPickerCategory, setIconPickerCategory] = useState<IconCategory>("sleep");
  const [iconPickerLayout, setIconPickerLayout] = useState<"row" | "column" | "grid" | "scattered">("row");

  const updateHook = (i: number, field: "headline" | "subline" | "sourceNote", val: string) => {
    const hooks = [...content.hooks];
    hooks[i] = { ...hooks[i], [field]: val };
    onChange({ ...content, hooks });
  };

  const updateSlide = (i: number, field: "headline" | "body" | "citation" | "graphic", val: string) => {
    const slides = [...content.slides];
    slides[i] = { ...slides[i], [field]: val };
    onChange({ ...content, slides });
  };

  // Parse selected icons from current graphic JSON (iconLayout or single icon)
  function getSelectedIcons(slideIndex: number): string[] {
    try {
      const g = content.slides[slideIndex]?.graphic ?? "";
      if (!g) return [];
      const parsed = JSON.parse(g);
      if (parsed.component === "iconLayout") return parsed.data.icons.map((ic: { id: string }) => ic.id);
      if (parsed.component === "icon") return [parsed.data.id];
    } catch { /* ignore */ }
    return [];
  }

  function toggleSlideIcon(slideIndex: number, iconId: string) {
    const current = getSelectedIcons(slideIndex);
    let next: string[];
    if (current.includes(iconId)) {
      next = current.filter((id) => id !== iconId);
    } else if (current.length < 4) {
      next = [...current, iconId];
    } else {
      return; // max 4
    }
    if (next.length === 0) {
      updateSlide(slideIndex, "graphic", "");
    } else if (next.length === 1) {
      updateSlide(slideIndex, "graphic", JSON.stringify({ component: "iconLayout", data: { icons: [{ id: next[0] }], layout: iconPickerLayout } }));
    } else {
      updateSlide(slideIndex, "graphic", JSON.stringify({ component: "iconLayout", data: { icons: next.map((id) => ({ id })), layout: iconPickerLayout } }));
    }
  }

  function applyIconLayout(slideIndex: number, layout: "row" | "column" | "grid" | "scattered") {
    setIconPickerLayout(layout);
    const current = getSelectedIcons(slideIndex);
    if (current.length === 0) return;
    updateSlide(slideIndex, "graphic", JSON.stringify({ component: "iconLayout", data: { icons: current.map((id) => ({ id })), layout } }));
  }

  async function handleShorten(slideIndex: number) {
    setShorteningSlide(slideIndex);
    setOriginalBodies(prev => ({ ...prev, [slideIndex]: content.slides[slideIndex].body }));
    try {
      const res = await fetch("/api/carousel/shorten-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: content.slides[slideIndex].body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[shorten-slide]", err);
        return;
      }
      const data = await res.json();
      updateSlide(slideIndex, "body", data.body);
    } finally {
      setShorteningSlide(null);
    }
  }

  async function handleRegenerate(slideIndex: number) {
    setRegenerating(slideIndex);
    try {
      const res = await fetch("/api/carousel/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, hookTone, slideIndex }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[regenerate-slide]", err);
        return;
      }
      const { slide } = await res.json();
      updateSlide(slideIndex, "headline", slide.headline);
      updateSlide(slideIndex, "body", slide.body);
      updateSlide(slideIndex, "citation", slide.citation);
    } finally {
      setRegenerating(null);
    }
  }

  function citationSearchUrl(citation: string) {
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(citation)}`;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    border: "1.5px solid var(--border)",
    borderRadius: 7,
    fontFamily: "inherit",
    outline: "none",
    background: "var(--bg)",
    color: "var(--text)",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--muted)",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Review content</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>Edit any field before continuing.</p>

      {/* Comment keyword (engagement format only) */}
      {carouselFormat === "engagement" && (
        <div style={{ background: "rgba(30,122,138,0.06)", border: "1.5px solid var(--accent)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", marginBottom: 8 }}>Comment keyword</div>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, marginTop: 0 }}>Readers will comment this word to get the guide. Auto-generated — edit if needed.</p>
          <input
            type="text"
            value={content.commentKeyword ?? ""}
            onChange={(e) => onChange({ ...content, commentKeyword: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) })}
            maxLength={12}
            placeholder="e.g. SLEEP"
            style={{
              width: 200,
              padding: "8px 12px",
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "Jost, Montserrat, sans-serif",
              letterSpacing: "0.1em",
              border: "1.5px solid var(--border)",
              borderRadius: 7,
              background: "var(--bg)",
              color: "var(--accent)",
              outline: "none",
              textTransform: "uppercase",
            }}
          />
        </div>
      )}

      {/* Hooks */}
      <div style={{ background: "var(--surface)", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 14 }}>Slide 1 — Hook variants</div>
        {content.hooks.map((h, i) => (
          <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Hook {i + 1}</div>
            <label style={labelStyle}>Headline</label>
            <input style={{ ...inputStyle, marginBottom: 6 }} value={h.headline} onChange={(e) => updateHook(i, "headline", e.target.value)} />
            <label style={labelStyle}>Subline</label>
            <input style={{ ...inputStyle, marginBottom: 6 }} value={h.subline} onChange={(e) => updateHook(i, "subline", e.target.value)} />
            <label style={labelStyle}>Trust Liner</label>
            <input
              style={{ ...inputStyle, marginBottom: 6 }}
              value={h.sourceNote ?? ""}
              placeholder='e.g. Based on Sleep Medicine Research, 2023'
              onChange={(e) => updateHook(i, "sourceNote", e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Content slides */}
      {content.slides.map((slide, i) => (
        <div key={i} style={{ background: "var(--surface)", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
              Slide {i + 2} — Content
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}
                style={{
                  background: iconPickerOpen === i ? "var(--accent-dim)" : "transparent",
                  border: `1px solid ${iconPickerOpen === i ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: iconPickerOpen === i ? "var(--accent)" : "var(--muted)",
                  fontFamily: "inherit",
                }}
              >
                🔷 Icon
              </button>
              <button
                onClick={() => handleRegenerate(i)}
                disabled={regenerating === i}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: regenerating === i ? "not-allowed" : "pointer",
                  color: "var(--muted)",
                  fontFamily: "inherit",
                  opacity: regenerating === i ? 0.5 : 1,
                }}
              >
                {regenerating === i ? "Regenerating..." : "↺ Regenerate"}
              </button>
              <button
                onClick={() => handleShorten(i)}
                disabled={shorteningSlide === i}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: shorteningSlide === i ? "not-allowed" : "pointer",
                  color: "var(--muted)",
                  fontFamily: "inherit",
                  opacity: shorteningSlide === i ? 0.5 : 1,
                }}
              >
                {shorteningSlide === i ? "Shortening…" : "✂ Shorter"}
              </button>
              {originalBodies[i] !== undefined && (
                <button
                  onClick={() => {
                    updateSlide(i, "body", originalBodies[i]);
                    setOriginalBodies(prev => {
                      const next = { ...prev };
                      delete next[i];
                      return next;
                    });
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontFamily: "inherit",
                  }}
                >
                  ↩ Undo
                </button>
              )}
            </div>
          </div>

          {/* Icon picker panel — expands inline when 🔷 Icon button is active */}
          {iconPickerOpen === i && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Icons
                  </span>
                  <span style={{ fontSize: 10, color: "var(--subtle)" }}>
                    {getSelectedIcons(i).length}/4 selected
                  </span>
                  {getSelectedIcons(i).length > 0 && (
                    <button
                      onClick={() => updateSlide(i, "graphic", "")}
                      style={{ background: "transparent", fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--border)" }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setIconPickerOpen(null)}
                  style={{ background: "transparent", border: "none", fontSize: 16, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              {/* Layout picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Layout</span>
                {(["row", "column", "grid", "scattered"] as const).map((lyt) => (
                  <button
                    key={lyt}
                    onClick={() => applyIconLayout(i, lyt)}
                    style={{
                      padding: "2px 8px", fontSize: 10, fontWeight: 700,
                      background: iconPickerLayout === lyt ? "var(--accent)" : "var(--bg)",
                      color: iconPickerLayout === lyt ? "#fff" : "var(--muted)",
                      border: "1px solid var(--border)", borderRadius: 4,
                      cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.04em",
                    }}
                  >
                    {lyt}
                  </button>
                ))}
              </div>
              {/* Category tabs */}
              <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)" }}>
                {(["sleep", "health", "lifestyle", "fitness", "mind"] as IconCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setIconPickerCategory(cat)}
                    style={{
                      flex: 1,
                      padding: "8px 2px",
                      border: "none",
                      borderBottom: iconPickerCategory === cat ? "2px solid var(--accent)" : "2px solid transparent",
                      background: "transparent",
                      fontSize: 10,
                      fontWeight: iconPickerCategory === cat ? 700 : 500,
                      color: iconPickerCategory === cat ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontFamily: "inherit",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Icon grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, padding: 8, background: "var(--bg)", maxHeight: 240, overflowY: "auto" }}>
                {CAROUSEL_ICONS.filter((ic) => ic.category === iconPickerCategory).map((ic) => {
                  const selected = getSelectedIcons(i);
                  const isSelected = selected.includes(ic.id);
                  const atMax = selected.length >= 4 && !isSelected;
                  return (
                    <button
                      key={ic.id}
                      onClick={() => toggleSlideIcon(i, ic.id)}
                      title={ic.label}
                      disabled={atMax}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                        padding: "8px 4px",
                        border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                        borderRadius: 6,
                        background: isSelected ? "var(--accent-dim)" : "transparent",
                        cursor: atMax ? "not-allowed" : "pointer",
                        opacity: atMax ? 0.35 : 1,
                        transition: "background 0.1s",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isSelected ? "var(--accent)" : "var(--muted)"}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: 24, height: 24 }}
                        dangerouslySetInnerHTML={{ __html: ic.svg }}
                      />
                      <span style={{ fontSize: 9, color: isSelected ? "var(--accent)" : "var(--subtle)", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {ic.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label style={labelStyle}>Headline</label>
          <input style={{ ...inputStyle, marginBottom: 8 }} value={slide.headline} onChange={(e) => updateSlide(i, "headline", e.target.value)} />
          <label style={labelStyle}>Body</label>
          <textarea style={{ ...inputStyle, marginBottom: 8, minHeight: 90, resize: "vertical" }} value={slide.body} onChange={(e) => updateSlide(i, "body", e.target.value)} />
          <label style={labelStyle}>Citation</label>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={slide.citation}
              onChange={(e) => updateSlide(i, "citation", e.target.value)}
            />
            {slide.citation && (
              <a
                href={citationSearchUrl(slide.citation)}
                target="_blank"
                rel="noopener noreferrer"
                title="Verify on Google Scholar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  border: "1.5px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--muted)",
                  textDecoration: "none",
                  fontSize: 14,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                ↗
              </a>
            )}
          </div>
        </div>
      ))}

      {/* CTA */}
      <div style={{ background: "var(--surface)", borderRadius: 10, padding: 20, marginBottom: 28, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 14 }}>Slide 5 — CTA</div>
        <label style={labelStyle}>Headline</label>
        <input style={{ ...inputStyle, marginBottom: 8 }} value={content.cta.headline} onChange={(e) => onChange({ ...content, cta: { ...content.cta, headline: e.target.value } })} />
        <label style={labelStyle}>Follow line</label>
        <input style={inputStyle} value={content.cta.followLine} onChange={(e) => onChange({ ...content, cta: { ...content.cta, followLine: e.target.value } })} />
      </div>

      <button
        onClick={onNext}
        style={{
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "14px 36px",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        Looks good →
      </button>
    </div>
  );
}
