"use client";
import { useState, type CSSProperties } from "react";
import { CarouselContent, CarouselFormat, HookTone } from "@/lib/types";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";
import { useCarouselApi } from "@/components/carousel/api-context";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { Button } from "@/components/ui/Button";
import { IcClose, IcRefresh, IcUndo, IconButton, Label, Select as UiSelect, Tabs } from "@/components/ui";

type Props = {
  content: CarouselContent;
  topic: string;
  hookTone: HookTone;
  onChange: (c: CarouselContent) => void;
  onNext: () => void;
  carouselFormat?: CarouselFormat;
};

export default function ContentStep({ content, topic, hookTone, onChange, onNext, carouselFormat = "standard" }: Props) {
  const apiBase = useCarouselApi();
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [shorteningSlide, setShorteningSlide] = useState<number | null>(null);
  const [lengtheningSlide, setLengtheningSlide] = useState<number | null>(null);
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
      const res = await fetch(`${apiBase}/shorten-slide`, {
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

  /** The other direction. Capped server-side so a longer body cannot crowd
   *  the slide's graphic out of its zone. */
  async function handleLengthen(slideIndex: number) {
    setLengtheningSlide(slideIndex);
    setOriginalBodies(prev => ({ ...prev, [slideIndex]: content.slides[slideIndex].body }));
    try {
      const res = await fetch(`${apiBase}/lengthen-slide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: content.slides[slideIndex].body, headline: content.slides[slideIndex].headline }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[lengthen-slide]", err);
        return;
      }
      const data = await res.json();
      updateSlide(slideIndex, "body", data.body);
    } finally {
      setLengtheningSlide(null);
    }
  }

  async function handleRegenerate(slideIndex: number) {
    setRegenerating(slideIndex);
    try {
      const res = await fetch(`${apiBase}/regenerate-slide`, {
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

  // A takeaway is only renderable when it's well-formed — guards a partial
  // model response from crashing the render. When present it absorbs the CTA
  // (follow line merges onto the takeaway slide, no separate CTA slide).
  const hasTakeaway =
    carouselFormat !== "engagement" &&
    !!content.takeaway &&
    Array.isArray(content.takeaway.points) &&
    content.takeaway.points.length > 0 &&
    !!content.takeaway.interaction;

  const card: CSSProperties = { background: "var(--ui-surface)", borderRadius: "var(--ui-radius-3)", padding: 20, marginBottom: 16, border: "1px solid var(--ui-border)" };
  const cardTitle: CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ui-text)" };
  const field = (mb = 12): CSSProperties => ({ marginBottom: mb });
  const ctaSlideNo = 2 + content.slides.length;

  return (
    <div>
      <h2 style={{ fontSize: "var(--ui-text-24)", lineHeight: "var(--ui-lh-24)", fontWeight: 600, margin: "0 0 var(--ui-space-3)", letterSpacing: "var(--ui-tracking-tight)" }}>Review content</h2>
      <p style={{ color: "var(--ui-text-2)", margin: "0 0 var(--ui-space-8)", fontSize: 14 }}>Edit any field before continuing</p>

      {/* Comment keyword (engagement format only) */}
      {carouselFormat === "engagement" && (
        <div style={card}>
          <div style={{ ...cardTitle, marginBottom: 4 }}>Comment keyword</div>
          <p style={{ fontSize: 12, color: "var(--ui-text-2)", margin: "0 0 12px" }}>Readers comment this word to get the guide. Written for you, edit it if needed.</p>
          <input
            type="text"
            className="ui-input"
            aria-label="Comment keyword"
            value={content.commentKeyword ?? ""}
            onChange={(e) => onChange({ ...content, commentKeyword: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) })}
            maxLength={12}
            placeholder="e.g. SLEEP"
            style={{ width: 200, minHeight: "var(--ui-control-lg)", fontSize: 16, fontWeight: 500, fontFamily: "var(--ui-font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}
          />
        </div>
      )}

      {/* Hooks */}
      <div style={card}>
        <div style={{ ...cardTitle, marginBottom: 16 }}>Slide 1 · Hook variants</div>
        {content.hooks.map((h, i) => {
          const last = i === content.hooks.length - 1;
          return (
            <div key={i} style={{ marginBottom: last ? 0 : 16, paddingBottom: last ? 0 : 16, borderBottom: last ? "none" : "1px solid var(--ui-border)" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ui-text-2)", marginBottom: 8, fontFamily: "var(--ui-font-mono)" }}>Hook {String(i + 1).padStart(2, "0")}</div>
              <Label>Headline</Label>
              <input className="ui-input" style={field(8)} value={h.headline} onChange={(e) => updateHook(i, "headline", e.target.value)} />
              <Label>Subline</Label>
              <input className="ui-input" style={field(8)} value={h.subline} onChange={(e) => updateHook(i, "subline", e.target.value)} />
              <Label>Trust liner</Label>
              <input
                className="ui-input"
                value={h.sourceNote ?? ""}
                placeholder="e.g. Based on Sleep Medicine Research, 2023"
                onChange={(e) => updateHook(i, "sourceNote", e.target.value)}
              />
            </div>
          );
        })}
      </div>

      {/* Content slides */}
      {content.slides.map((slide, i) => (
        <div key={i} style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={cardTitle}>Slide {i + 2} · Content</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button size="sm" variant={iconPickerOpen === i ? "selected" : "ghost"} aria-pressed={iconPickerOpen === i} onClick={() => setIconPickerOpen(iconPickerOpen === i ? null : i)}>
                Icons
              </Button>
              <Button size="sm" variant="ghost" busy={regenerating === i} icon={<IcRefresh size={14} strokeWidth={1.75} />} onClick={() => handleRegenerate(i)}>
                Regenerate
              </Button>
              <Button size="sm" variant="ghost" busy={shorteningSlide === i} onClick={() => handleShorten(i)}>
                Shorter
              </Button>
              <Button size="sm" variant="ghost" busy={lengtheningSlide === i} title="Add a sentence. Capped so the slide's graphic keeps its room." onClick={() => handleLengthen(i)}>
                Longer
              </Button>
              {originalBodies[i] !== undefined && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<IcUndo size={14} strokeWidth={1.75} />}
                  onClick={() => {
                    updateSlide(i, "body", originalBodies[i]);
                    setOriginalBodies(prev => {
                      const next = { ...prev };
                      delete next[i];
                      return next;
                    });
                  }}
                >
                  Undo
                </Button>
              )}
            </div>
          </div>

          {/* Icon picker panel — expands inline when the Icons button is active */}
          {iconPickerOpen === i && (
            <div style={{ border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", overflow: "hidden", marginBottom: 16, background: "var(--ui-bg)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 8px 8px 12px", borderBottom: "1px solid var(--ui-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Icons</span>
                  <span style={{ fontSize: 12, color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums" }}>
                    {getSelectedIcons(i).length}/4 selected
                  </span>
                  {getSelectedIcons(i).length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => updateSlide(i, "graphic", "")}>Clear</Button>
                  )}
                </div>
                <IconButton title="Close icon picker" onClick={() => setIconPickerOpen(null)}>
                  <IcClose size={16} strokeWidth={1.75} />
                </IconButton>
              </div>
              {/* Layout picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderBottom: "1px solid var(--ui-border)" }}>
                <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>Layout</span>
                <Tabs<"row" | "column" | "grid" | "scattered">
                  ariaLabel="Icon layout"
                  value={iconPickerLayout}
                  onChange={(lyt) => applyIconLayout(i, lyt)}
                  items={(["row", "column", "grid", "scattered"] as const).map((lyt) => ({ value: lyt, label: lyt[0].toUpperCase() + lyt.slice(1) }))}
                />
              </div>
              {/* Category tabs */}
              <div style={{ padding: "0 12px" }}>
                <Tabs<IconCategory>
                  variant="underline"
                  ariaLabel="Icon category"
                  value={iconPickerCategory}
                  onChange={setIconPickerCategory}
                  items={(["sleep", "health", "lifestyle", "fitness", "mind", "daily"] as IconCategory[]).map((cat) => ({ value: cat, label: cat[0].toUpperCase() + cat.slice(1) }))}
                />
              </div>
              {/* Icon grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, padding: 8, maxHeight: 240, overflowY: "auto" }}>
                {CAROUSEL_ICONS.filter((ic) => ic.category === iconPickerCategory).map((ic) => {
                  const selected = getSelectedIcons(i);
                  const isSelected = selected.includes(ic.id);
                  const atMax = selected.length >= 4 && !isSelected;
                  return (
                    <button
                      key={ic.id}
                      type="button"
                      className="ui-focusable"
                      aria-pressed={isSelected}
                      onClick={() => toggleSlideIcon(i, ic.id)}
                      title={ic.label}
                      disabled={atMax}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: "8px 4px",
                        border: `1px solid ${isSelected ? "var(--ui-text)" : "transparent"}`,
                        borderRadius: "var(--ui-radius-2)",
                        background: isSelected ? "var(--ui-selection-tint)" : "transparent",
                        color: isSelected ? "var(--ui-text)" : "var(--ui-text-2)",
                        cursor: atMax ? "not-allowed" : "pointer",
                        opacity: atMax ? 0.4 : 1,
                        fontFamily: "inherit",
                        transition: "background-color var(--ui-dur-1) var(--ui-ease-out), border-color var(--ui-dur-1) var(--ui-ease-out)",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: 24, height: 24 }}
                        dangerouslySetInnerHTML={{ __html: ic.svg }}
                      />
                      <span style={{ fontSize: 11, textAlign: "center", lineHeight: 1.2 }}>
                        {ic.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Label>Headline</Label>
          <input className="ui-input" style={field()} value={slide.headline} onChange={(e) => updateSlide(i, "headline", e.target.value)} />
          <Label>Body</Label>
          <AutoTextarea className="ui-input" style={field()} minHeight={90} value={slide.body} onChange={(e) => updateSlide(i, "body", e.target.value)} />
          <Label>Citation</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="ui-input"
              style={{ flex: 1 }}
              value={slide.citation}
              onChange={(e) => updateSlide(i, "citation", e.target.value)}
            />
            {slide.citation && (
              <a
                href={citationSearchUrl(slide.citation)}
                target="_blank"
                rel="noopener noreferrer"
                title="Verify on Google Scholar"
                className="ui-btn ui-btn--sm ui-btn--ghost"
                style={{ textDecoration: "none", flexShrink: 0 }}
              >
                Verify
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Takeaway (payoff slide) — standard format only, when a well-formed
          takeaway is present. Guard the sub-fields: a partial object (no points
          array / no interaction) would otherwise crash this render. */}
      {hasTakeaway && (() => {
        const tk = content.takeaway!;
        const setTk = (patch: Partial<NonNullable<CarouselContent["takeaway"]>>) =>
          onChange({ ...content, takeaway: { ...tk, ...patch } });
        const setPoint = (idx: number, val: string) => {
          const points = [...tk.points];
          points[idx] = val;
          setTk({ points });
        };
        return (
          <div style={card}>
            <div style={{ ...cardTitle, marginBottom: 16 }}>Slide {ctaSlideNo} · Takeaway <span style={{ fontWeight: 400, color: "var(--ui-text-2)" }}>The payoff and the closing follow prompt</span></div>
            <Label>Headline</Label>
            <input className="ui-input" style={field()} value={tk.headline} onChange={(e) => setTk({ headline: e.target.value })} />
            <Label>Recap points</Label>
            {tk.points.map((p, i) => (
              <input key={i} className="ui-input" style={field(8)} value={p} onChange={(e) => setPoint(i, e.target.value)} placeholder={`Point ${i + 1}`} aria-label={`Recap point ${i + 1}`} />
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <div style={{ flexShrink: 0 }}>
                <Label>Ask</Label>
                <UiSelect
                  value={tk.interaction.type}
                  onChange={(e) => setTk({ interaction: { ...tk.interaction, type: e.target.value as "save" | "send" | "comment" } })}
                  aria-label="Ask"
                >
                  <option value="save">Save</option>
                  <option value="send">Send</option>
                  <option value="comment">Comment</option>
                </UiSelect>
              </div>
              <div style={{ flex: 1 }}>
                <Label>Interaction label</Label>
                <input className="ui-input" value={tk.interaction.label} onChange={(e) => setTk({ interaction: { ...tk.interaction, label: e.target.value } })} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* CTA — when a takeaway is present it absorbs the follow line onto its
          own slide (see above) and there's no separate CTA slide, so only the
          follow-line field is shown; the headline field would render nowhere. */}
      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ ...cardTitle, marginBottom: 16 }}>
          {hasTakeaway ? <>Follow prompt <span style={{ fontWeight: 400, color: "var(--ui-text-2)" }}>Shown on the takeaway slide</span></> : `Slide ${ctaSlideNo} · CTA`}
        </div>
        {!hasTakeaway && (
          <>
            <Label>Headline</Label>
            <input className="ui-input" style={field()} value={content.cta.headline} onChange={(e) => onChange({ ...content, cta: { ...content.cta, headline: e.target.value } })} />
          </>
        )}
        <Label>Follow line</Label>
        <input className="ui-input" value={content.cta.followLine} onChange={(e) => onChange({ ...content, cta: { ...content.cta, followLine: e.target.value } })} />
      </div>

      <Button variant="primary" size="lg" onClick={onNext}>Looks good →</Button>
    </div>
  );
}
