"use client";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { BrandStyle, CarouselConfig, HookTone } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";

const IMAGE_STYLE_CHIPS: { value: CarouselImageStyle; label: string }[] = [
  { value: "realistic", label: "Realistic" },
  { value: "cartoon", label: "Illustration" },
  { value: "anime", label: "Anime" },
  { value: "vector", label: "Vector" },
];

type Props = {
  config: CarouselConfig;
  hookTone: HookTone;
  onRestart: () => void;
  onChangeHook?: () => void;
  onContentChange: (config: CarouselConfig) => void;
};

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.48;

export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onContentChange }: Props) {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy link");
  const [captionCopyLabel, setCaptionCopyLabel] = useState("Copy");
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [regeneratingGraphic, setRegeneratingGraphic] = useState<number | null>(null);
  const [graphicHistory, setGraphicHistory] = useState<Record<number, string[]>>({});
  const [vectorAttempts, setVectorAttempts] = useState<Record<number, number>>({});
  const [exportError, setExportError] = useState<string | null>(null);
  const [graphicError, setGraphicError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  // Hook decoration / logo / arrow / background controls
  const [showDecoration, setShowDecoration] = useState(true);
  const [logoScale, setLogoScale] = useState(1);
  const [arrowScale, setArrowScale] = useState(1);
  const [darkBackground, setDarkBackground] = useState(false);

  // Icon picker state (content slides 1–3, i.e. slideIndex 0–2)
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [iconPickerCategory, setIconPickerCategory] = useState<IconCategory>("sleep");

  // Hook image refinement state
  const [imageRefineOpen, setImageRefineOpen] = useState(false);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>("realistic");
  const [imageGuidelines, setImageGuidelines] = useState("");
  const [imagePromptDraft, setImagePromptDraft] = useState<string>("");
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);
  const [imageRegenError, setImageRegenError] = useState<string | null>(null);
  const [promptAlternatives, setPromptAlternatives] = useState<string[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

  // Derive vector mode from actual graphic data rather than ephemeral UI state
  function isVectorSlide(slideIndex: number): boolean {
    try {
      const g = content.slides[slideIndex]?.graphic;
      return !!g && JSON.parse(g)?.component === "vector";
    } catch { return false; }
  }

  // Full-size hidden refs for accurate PNG export
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  const { content, selectedHook, topic, brandStyle, hookImageUrl, slideImages } = config;
  const currentImagePrompt = imagePromptDraft || content.imagePrompt || "";

  // Proxy fal.ai CDN URLs through our own route so html-to-image canvas export works
  function proxyUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith('/')) return url; // already local
    return `/api/carousel/image-proxy?url=${encodeURIComponent(url)}`;
  }

  const imgs = slideImages ?? [null, null, null, null, null];
  // Only hook (0) uses fal.ai image; content + CTA are always ready
  const imagesLoading = imgs[0] === null;
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
        body: JSON.stringify({
          topic,
          hookTone,
          content,
          selectedHook,
          brandStyle,
          hookImageUrl: config.hookImageUrl,
          slideImages: config.slideImages,
          showDecoration,
          logoScale,
          arrowScale,
          darkBackground,
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
    navigator.clipboard.writeText(`${window.location.origin}/carousels/${savedId}`).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy link"), 2000);
    });
  }

  function setSlideIcon(slideIndex: number, iconId: string) {
    const graphicJson = JSON.stringify({ component: "icon", data: { id: iconId } });
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], graphic: graphicJson };
    onContentChange({ ...config, content: { ...content, slides } });
    setIconPickerOpen(null);
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

  async function handleRegenerateGraphic(slideIndex: number) {
    setRegeneratingGraphic(slideIndex);
    setGraphicError(null);
    try {
      const slide = content.slides[slideIndex];
      // Extract current component name for history tracking
      let currentComp = "";
      try { currentComp = JSON.parse(slide.graphic ?? "{}").component ?? ""; } catch {}
      // Build avoid list — cap at 2 entries to prevent Claude running out of options
      const prevHistory = graphicHistory[slideIndex] ?? [];
      const rawAvoid = [...prevHistory, currentComp].filter(Boolean);
      const avoid = rawAvoid.length > 2 ? rawAvoid.slice(-2) : rawAvoid;
      const res = await fetch("/api/carousel/regenerate-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          hookTone,
          slideIndex,
          headline: slide.headline,
          body: slide.body,
          currentGraphic: slide.graphic ?? "",
          avoidComponents: avoid,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGraphicError(data.error ?? "Failed to regenerate graphic");
        return;
      }
      const { graphic } = data;
      // Don't update if API returned empty — keep current graphic
      if (!graphic || graphic.trim() === '""' || graphic.trim() === '') {
        setGraphicError("No alternative graphic found for this slide — try again");
        return;
      }
      // Update history with the component we just replaced
      if (currentComp) {
        setGraphicHistory(prev => ({ ...prev, [slideIndex]: [...(prev[slideIndex] ?? []), currentComp] }));
      }
      const slides = [...content.slides];
      slides[slideIndex] = { ...slides[slideIndex], graphic };
      onContentChange({ ...config, content: { ...content, slides } });
    } catch {
      setGraphicError("Network error — please check your connection");
    } finally {
      setRegeneratingGraphic(null);
    }
  }

  async function handleRegenerateHookImage() {
    setRegeneratingImage(true);
    setImageRegenError(null);
    try {
      // Step 1: optionally regenerate the prompt with guidelines
      let finalPrompt = currentImagePrompt;
      if (imageGuidelines.trim() || !finalPrompt) {
        const promptRes = await fetch("/api/carousel/regenerate-image-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic ?? "",
            headline: hook.headline,
            subline: hook.subline,
            currentPrompt: finalPrompt,
            guidelines: imageGuidelines.trim(),
          }),
        });
        const promptData = await promptRes.json();
        if (!promptRes.ok || promptData.error) throw new Error(promptData.error ?? "Failed to regenerate prompt");
        finalPrompt = promptData.prompt;
        setImagePromptDraft(finalPrompt);
        // Update the content's imagePrompt so it's saved with the carousel
        onContentChange({ ...config, content: { ...config.content, imagePrompt: finalPrompt } });
      }

      // Step 2: generate the new image
      const imgRes = await fetch("/api/carousel/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex: 0, topic: topic ?? "", hook, imagePrompt: finalPrompt, imageStyle }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok || imgData.error) throw new Error(imgData.error ?? "Image generation failed");

      // Update slideImages[0] in config
      const newSlideImages = [...(config.slideImages ?? [null, null, null, null, null])];
      newSlideImages[0] = imgData.url;
      onContentChange({ ...config, slideImages: newSlideImages as (string | null)[], content: { ...config.content, imagePrompt: finalPrompt } });
    } catch (err) {
      setImageRegenError(err instanceof Error ? err.message : "Failed to regenerate image");
    } finally {
      setRegeneratingImage(false);
    }
  }

  async function handleRegeneratePromptOnly() {
    if (regeneratingImage || regeneratingPrompt) return;
    setRegeneratingPrompt(true);
    setImageRegenError(null);
    setPromptAlternatives([]);
    try {
      const res = await fetch("/api/carousel/regenerate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          headline: hook.headline,
          subline: hook.subline,
          currentPrompt: currentImagePrompt,
          guidelines: imageGuidelines.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to regenerate prompt");
      setImagePromptDraft(data.prompt);
      onContentChange({ ...config, content: { ...config.content, imagePrompt: data.prompt } });
      if (Array.isArray(data.alternatives) && data.alternatives.length > 0) {
        setPromptAlternatives(data.alternatives);
      }
    } catch (err) {
      setImageRegenError(err instanceof Error ? err.message : "Failed to regenerate prompt");
    } finally {
      setRegeneratingPrompt(false);
    }
  }

  async function fetchSuggestedPrompts() {
    if (suggestedPrompts.length > 0 || fetchingSuggestions) return;
    setFetchingSuggestions(true);
    try {
      const res = await fetch("/api/carousel/regenerate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          headline: hook.headline,
          subline: hook.subline,
          // No currentPrompt — so Claude generates fresh divergent concepts
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
        setSuggestedPrompts(data.alternatives);
      }
    } catch { /* non-blocking */ }
    finally { setFetchingSuggestions(false); }
  }

  function openImageRefinePanel() {
    setImageRefineOpen(v => {
      if (!v) fetchSuggestedPrompts();
      return !v;
    });
  }

  async function handleVectorGraphic(slideIndex: number) {
    setRegeneratingGraphic(slideIndex);
    setGraphicError(null);
    try {
      const slide = content.slides[slideIndex];
      if (!slide) { setGraphicError("Slide not found"); setRegeneratingGraphic(null); return; }
      const attempt = (vectorAttempts[slideIndex] ?? 0) + 1;
      const res = await fetch("/api/carousel/regenerate-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          headline: slide.headline,
          body: slide.body,
          currentGraphic: slide.graphic ?? "",
          forceVector: true,
          attempt,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setGraphicError(data.error ?? "Failed to generate vector"); return; }
      const { graphic } = data;
      if (!graphic || graphic.trim() === '""' || graphic.trim() === '') {
        setGraphicError("Could not generate vector — try again"); return;
      }
      setVectorAttempts(prev => ({ ...prev, [slideIndex]: attempt }));
      const slides = [...content.slides];
      slides[slideIndex] = { ...slides[slideIndex], graphic };
      onContentChange({ ...config, content: { ...content, slides } });
    } catch {
      setGraphicError("Network error — please check your connection");
    } finally {
      setRegeneratingGraphic(null);
    }
  }

  // fal.ai images: hook (imgs[0]) only.
  // Content + CTA slides stay clean — brand colors + infographics.
  const slideNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]} shimmer={imgs[0] === null}
      showDecoration={showDecoration} logoScale={logoScale} arrowScale={arrowScale} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} />,
  ];

  // Export nodes use proxied URLs so html-to-image canvas export works (avoids CORS taint)
  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      showDecoration={showDecoration} logoScale={logoScale} arrowScale={arrowScale} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} />,
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
          {imagesLoading && (
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--muted)', animation: 'shimmer 1s ease-in-out infinite' }} />
              Generating visuals…
            </span>
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
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)" }}>
          ⚠ {exportError}
        </div>
      )}
      {graphicError && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠ {graphicError}</span>
          <button onClick={() => setGraphicError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--error)", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>
      )}

      {/* Slide controls toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {/* Logo size */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Logo</span>
          {([0.75, 1, 1.4, 1.8] as const).map((s, idx) => {
            const labels = ["S", "M", "L", "XL"];
            return (
              <button key={s} onClick={() => setLogoScale(s)} style={{
                padding: "3px 8px", fontSize: 11, fontWeight: 700,
                background: logoScale === s ? "var(--text)" : "var(--surface)",
                color: logoScale === s ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 5,
                cursor: "pointer", fontFamily: "inherit",
              }}>{labels[idx]}</button>
            );
          })}
        </div>
        {/* Arrow size */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Arrows</span>
          {([0.75, 1, 1.4, 1.8] as const).map((s, idx) => {
            const labels = ["S", "M", "L", "XL"];
            return (
              <button key={s} onClick={() => setArrowScale(s)} style={{
                padding: "3px 8px", fontSize: 11, fontWeight: 700,
                background: arrowScale === s ? "var(--text)" : "var(--surface)",
                color: arrowScale === s ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 5,
                cursor: "pointer", fontFamily: "inherit",
              }}>{labels[idx]}</button>
            );
          })}
        </div>
        {/* Decoration toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Hook deco</span>
          <button onClick={() => setShowDecoration((v) => !v)} style={{
            padding: "3px 10px", fontSize: 11, fontWeight: 700,
            background: showDecoration ? "var(--text)" : "var(--surface)",
            color: showDecoration ? "var(--bg)" : "var(--muted)",
            border: "1px solid var(--border)", borderRadius: 5,
            cursor: "pointer", fontFamily: "inherit",
          }}>{showDecoration ? "On" : "Off"}</button>
        </div>
        {/* Background toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Slides bg</span>
          <button onClick={() => setDarkBackground(false)} style={{
            padding: "3px 8px", fontSize: 11, fontWeight: 700,
            background: !darkBackground ? "var(--text)" : "var(--surface)",
            color: !darkBackground ? "var(--bg)" : "var(--muted)",
            border: "1px solid var(--border)", borderRadius: 5,
            cursor: "pointer", fontFamily: "inherit",
          }}>Classic</button>
          <button onClick={() => setDarkBackground(true)} style={{
            padding: "3px 8px", fontSize: 11, fontWeight: 700,
            background: darkBackground ? "var(--text)" : "var(--surface)",
            color: darkBackground ? "var(--bg)" : "var(--muted)",
            border: "1px solid var(--border)", borderRadius: 5,
            cursor: "pointer", fontFamily: "inherit",
          }}>Match hook</button>
        </div>
      </div>

      {/* Slide strip */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, scrollSnapType: "x mandatory" }}>
        {slideNodes.map((slide, i) => {
          const isActive = activeSlide === i;
          const isDownloading = downloading === i;
          const isRegenerating = regenerating === i - 1;
          const isRegeneratingGraphic = regeneratingGraphic === i - 1;
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
              <div style={{ position: "relative" }}>
                <div style={{
                  borderRadius: 8,
                  overflow: "hidden",
                  outline: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  outlineOffset: 2,
                  transition: "outline-color 0.15s, opacity 0.2s",
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(30,122,138,0.12), 0 4px 20px rgba(0,0,0,0.12)"
                    : "0 2px 12px rgba(0,0,0,0.08)",
                  opacity: (isRegeneratingGraphic || (i === 0 && regeneratingImage)) ? 0.45 : 1,
                }}>
                  {slide}
                </div>
                {/* Graphic regen loader (slides 1–3) */}
                {isRegeneratingGraphic && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 8,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 8,
                    pointerEvents: "none",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: "2.5px solid rgba(255,255,255,0.15)",
                      borderTopColor: "var(--accent)",
                      animation: "spin 0.7s linear infinite",
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                      color: "var(--text)", textTransform: "uppercase",
                    }}>generating</span>
                  </div>
                )}
                {/* Hook image regen loader (slide 0) */}
                {i === 0 && regeneratingImage && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 8,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 10,
                    pointerEvents: "none",
                    background: "rgba(0,0,0,0.18)",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "2.5px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
                      color: "#fff", textTransform: "uppercase",
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}>generating image…</span>
                  </div>
                )}
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
                {i === 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openImageRefinePanel(); }}
                    title="Refine hook image"
                    style={{
                      background: imageRefineOpen ? "var(--accent)" : "var(--surface)",
                      color: imageRefineOpen ? "var(--bg)" : "var(--muted)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      transition: "background 0.15s",
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ↺ image
                  </button>
                )}
                {i >= 1 && i <= 3 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRegenerateSlide(i - 1); }}
                      disabled={isRegenerating || isRegeneratingGraphic}
                      title="Regenerate full slide"
                      style={{
                        background: "var(--surface)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "7px 10px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        cursor: (isRegenerating || isRegeneratingGraphic) ? "not-allowed" : "pointer",
                        opacity: (isRegenerating || isRegeneratingGraphic) ? 0.5 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      {isRegenerating ? "…" : "↺"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRegenerateGraphic(i - 1); }}
                      disabled={isRegenerating || isRegeneratingGraphic}
                      title="Redesign infographic only"
                      style={{
                        background: "var(--surface)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        cursor: (isRegenerating || isRegeneratingGraphic) ? "not-allowed" : "pointer",
                        opacity: (isRegenerating || isRegeneratingGraphic) ? 0.5 : 1,
                        transition: "background 0.15s",
                        letterSpacing: "0.01em",
                        fontWeight: 600,
                      }}
                    >
                      {isRegeneratingGraphic ? "…" : "↺ graphic"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleVectorGraphic(i - 1); }}
                      disabled={isRegenerating || isRegeneratingGraphic}
                      title="Switch to vector illustration"
                      style={{
                        background: isVectorSlide(i - 1) ? "var(--accent-dim)" : "var(--surface)",
                        color: isVectorSlide(i - 1) ? "var(--accent)" : "var(--muted)",
                        border: `1px solid ${isVectorSlide(i - 1) ? "var(--accent-mid)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        cursor: (isRegenerating || isRegeneratingGraphic) ? "not-allowed" : "pointer",
                        opacity: (isRegenerating || isRegeneratingGraphic) ? 0.5 : 1,
                        transition: "background 0.15s",
                        letterSpacing: "0.01em",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isRegeneratingGraphic ? "…" : "↺ vector"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIconPickerOpen(iconPickerOpen === i - 1 ? null : i - 1); }}
                      title="Pick an icon graphic"
                      style={{
                        background: iconPickerOpen === i - 1 ? "var(--accent-dim)" : "var(--surface)",
                        color: iconPickerOpen === i - 1 ? "var(--accent)" : "var(--muted)",
                        border: `1px solid ${iconPickerOpen === i - 1 ? "var(--accent-mid)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        cursor: "pointer",
                        transition: "background 0.15s",
                        letterSpacing: "0.01em",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      🔷 icon
                    </button>
                  </>
                )}
              </div>

            {/* Icon picker panel — expands below the slide when 🔷 icon is active */}
            {i >= 1 && i <= 3 && iconPickerOpen === i - 1 && (
              <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Choose icon graphic</span>
                  <button onClick={() => setIconPickerOpen(null)} style={{ background: "transparent", border: "none", fontSize: 16, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
                </div>
                {/* Category tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                  {(["sleep", "health", "lifestyle", "fitness"] as IconCategory[]).map((cat) => (
                    <button key={cat} onClick={() => setIconPickerCategory(cat)} style={{
                      flex: 1, padding: "7px 4px", border: "none",
                      borderBottom: iconPickerCategory === cat ? "2px solid var(--accent)" : "2px solid transparent",
                      background: "transparent", fontSize: 10, fontWeight: iconPickerCategory === cat ? 700 : 500,
                      color: iconPickerCategory === cat ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "inherit",
                    }}>{cat}</button>
                  ))}
                </div>
                {/* Icon grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, padding: 6, background: "var(--bg)", maxHeight: 200, overflowY: "auto" }}>
                  {CAROUSEL_ICONS.filter((ic) => ic.category === iconPickerCategory).map((ic) => {
                    const currentGraphic = content.slides[i - 1]?.graphic ?? "";
                    const isSelected = currentGraphic.includes(`"id":"${ic.id}"`);
                    return (
                      <button key={ic.id} onClick={() => setSlideIcon(i - 1, ic.id)} title={ic.label} style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        padding: "7px 4px",
                        border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                        borderRadius: 6,
                        background: isSelected ? "var(--accent-dim)" : "transparent",
                        cursor: "pointer", transition: "background 0.1s",
                      }}>
                        <svg viewBox="0 0 24 24" fill="none"
                          stroke={isSelected ? "var(--accent)" : "var(--muted)"}
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ width: 22, height: 22 }}
                          dangerouslySetInnerHTML={{ __html: ic.svg }}
                        />
                        <span style={{ fontSize: 8, color: isSelected ? "var(--accent)" : "var(--subtle)", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{ic.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          );
        })}
      </div>

      {/* Hook image refinement panel */}
      {imageRefineOpen && (
        <div style={{
          marginTop: 12,
          border: "1px solid var(--border)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--surface)",
        }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>
              Refine hook image
            </p>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
              Edit the prompt directly or add guidelines — Claude will rewrite the prompt, then generate a new image.
            </p>
          </div>
          <div style={{ padding: "12px 14px" }}>
            {/* Image style chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Style:</span>
              {IMAGE_STYLE_CHIPS.map((chip) => {
                const active = imageStyle === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setImageStyle(chip.value)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim)" : "transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Current prompt
            </label>
            <textarea
              value={currentImagePrompt}
              onChange={(e) => setImagePromptDraft(e.target.value)}
              rows={3}
              placeholder="No prompt yet — add guidelines below to generate one."
              style={{
                width: "100%", fontSize: 12, lineHeight: 1.6,
                resize: "vertical", fontFamily: "inherit",
                color: currentImagePrompt ? "var(--text)" : "var(--subtle)",
                marginBottom: 12,
              }}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Guidelines (optional)
            </label>
            <textarea
              value={imageGuidelines}
              onChange={(e) => setImageGuidelines(e.target.value)}
              rows={2}
              placeholder="e.g. warmer tones, ocean waves, more minimal, focus on moonlight..."
              style={{
                width: "100%", fontSize: 12, lineHeight: 1.5,
                resize: "vertical", fontFamily: "inherit",
                color: "var(--text)",
                marginBottom: 12,
              }}
            />
            {/* Auto-suggested concepts — fetched when panel opens */}
            {(fetchingSuggestions || suggestedPrompts.length > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  {fetchingSuggestions ? "Loading suggestions…" : "2 suggested concepts — click to use"}
                </div>
                {fetchingSuggestions ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Generating fresh directions…</span>
                  </div>
                ) : suggestedPrompts.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setImagePromptDraft(s);
                      onContentChange({ ...config, content: { ...config.content, imagePrompt: s } });
                    }}
                    style={{
                      background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6,
                      padding: "8px 10px", marginBottom: 6, fontSize: 12, color: "var(--text)",
                      lineHeight: 1.5, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                    title="Click to use this prompt"
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--accent)",
                      background: "var(--accent-dim)", borderRadius: 4,
                      padding: "2px 5px", flexShrink: 0, marginTop: 1, fontFamily: "var(--font-ui)",
                    }}>
                      {i === 0 ? "A" : "B"}
                    </span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {imageRegenError && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "0 0 8px" }}>{imageRegenError}</p>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: promptAlternatives.length > 0 ? 12 : 0 }}>
              <button
                onClick={handleRegeneratePromptOnly}
                disabled={regeneratingPrompt || regeneratingImage}
                title="Regenerate the prompt — returns 3 directions"
                style={{
                  background: "var(--surface)",
                  color: (regeneratingPrompt || regeneratingImage) ? "var(--subtle)" : "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "9px 16px", fontSize: 12, fontWeight: 600,
                  fontFamily: "inherit", cursor: (regeneratingPrompt || regeneratingImage) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {regeneratingPrompt ? (
                  <>
                    <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Generating…
                  </>
                ) : "↺ 3 directions"}
              </button>
              <button
                onClick={handleRegenerateHookImage}
                disabled={regeneratingImage || regeneratingPrompt}
                style={{
                  background: (regeneratingImage || regeneratingPrompt) ? "var(--border)" : "var(--accent)",
                  color: (regeneratingImage || regeneratingPrompt) ? "var(--muted)" : "var(--bg)",
                  border: "none", borderRadius: 6,
                  padding: "9px 20px", fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: (regeneratingImage || regeneratingPrompt) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {regeneratingImage ? (
                  <>
                    <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Generating…
                  </>
                ) : "↺ New image"}
              </button>
            </div>

            {/* Alternative prompt directions */}
            {promptAlternatives.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  2 more directions — click to use
                </div>
                {promptAlternatives.map((alt, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setImagePromptDraft(alt);
                      onContentChange({ ...config, content: { ...config.content, imagePrompt: alt } });
                    }}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginBottom: 6,
                      fontSize: 12,
                      color: "var(--text)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                    title="Click to use this prompt"
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--accent)",
                      background: "var(--accent-dim)", borderRadius: 4,
                      padding: "2px 5px", flexShrink: 0, marginTop: 1,
                      fontFamily: "var(--font-ui)",
                    }}>
                      {i + 2}
                    </span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
              background: activeSlide === i ? "var(--accent)" : "var(--border)",
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
                background: captionCopyLabel === "Copied!" ? "rgba(95,158,117,0.12)" : "var(--bg)",
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
        {onChangeHook && (
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
        )}
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
          {onChangeHook ? "Start over" : "← Back"}
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
