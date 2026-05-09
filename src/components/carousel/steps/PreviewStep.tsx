"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import CommentCTASlide from "@/components/carousel/slides/CommentCTASlide";
import { BrandStyle, CarouselConfig, CarouselFormat, HookTone } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";
import { useCarouselApi } from "@/components/carousel/api-context";
import { DEFAULT_HOOK_OVERLAYS, type HookOverlaySettings } from "@/components/carousel/shared/HookOverlays";
import FeedPreview, { type FeedMode } from "@/components/carousel/preview/FeedPreview";
import GraphicTypePicker from "@/components/carousel/preview/GraphicTypePicker";
import GraphicDataEditor from "@/components/carousel/preview/GraphicDataEditor";
import PanelErrorBoundary from "@/components/carousel/preview/PanelErrorBoundary";

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
  initialImageStyle?: CarouselImageStyle;
  initialReelsMode?: boolean;
  initialCitationFontSize?: number;
  initialSlideBgColor?: string;
  initialDarkBackground?: boolean;
  carouselFormat?: CarouselFormat;
};

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.48;

// ─── Toolbar button style (v2 toolbar) ────────────────────────────────────────
function toolbarBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 5,
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    background: active ? "var(--accent-dim)" : "transparent",
    color: active ? "var(--accent)" : "var(--muted)",
    fontSize: 11,
    fontWeight: active ? 700 : 500,
    fontFamily: "inherit",
    cursor: "pointer",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

// ─── Hook overlay panel helpers ───────────────────────────────────────────────
function OverlayRow({ label, hint, enabled, onToggle, children }: {
  label: string;
  hint: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr auto",
      alignItems: "center",
      gap: 12,
      padding: "8px 0",
      borderTop: "1px dashed var(--border)",
      opacity: enabled ? 1 : 0.5,
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", whiteSpace: "nowrap" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</span>
      </label>
      <span style={{ fontSize: 10, color: "var(--subtle)", letterSpacing: "0.02em" }}>{hint}</span>
      <div style={{ pointerEvents: enabled ? "auto" : "none" }}>{children}</div>
    </div>
  );
}

function SliderControl({ label, min, max, step, value, onChange }: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 100, accentColor: "var(--accent)", cursor: "pointer" }}
      />
      <span style={{ fontSize: 10, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 32, textAlign: "right" }}>
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2)}
      </span>
    </div>
  );
}


export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onContentChange, initialImageStyle, initialReelsMode, initialCitationFontSize, initialSlideBgColor, initialDarkBackground, carouselFormat = "standard" }: Props) {
  const apiBase = useCarouselApi();
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
  // v2-only: per-slide regen counter (resets on page reload) + open comment panel + draft comment
  const [graphicRegenCount, setGraphicRegenCount] = useState<Record<number, number>>({});
  const [graphicCommentOpen, setGraphicCommentOpen] = useState<number | null>(null);
  const [graphicComment, setGraphicComment] = useState<Record<number, string>>({});
  const GRAPHIC_REGEN_LIMIT = 5;
  const isV2 = apiBase === "/api/carousel-v2";
  // v2-only: hook image overlay settings + control panel toggle
  const [hookOverlays, setHookOverlays] = useState<HookOverlaySettings>(() => ({
    ...DEFAULT_HOOK_OVERLAYS,
    // Seed frame color from brand accent if available
    frame: { ...DEFAULT_HOOK_OVERLAYS.frame, color: config.brandStyle?.accent ?? DEFAULT_HOOK_OVERLAYS.frame.color },
  }));
  const [overlaysPanelOpen, setOverlaysPanelOpen] = useState(false);
  // v2-only: feed view (single-slide phone mockup) toggle + current index
  const [viewMode, setViewMode] = useState<"strip" | "feed">("feed");
  const [feedIndex, setFeedIndex] = useState(0);
  // v2-only: graphic type picker — which slide's picker is open (or null)
  const [typePickerOpen, setTypePickerOpen] = useState<number | null>(null);
  // v2-only: graphic data editor — which slide's editor is open (or null)
  const [dataEditorOpen, setDataEditorOpen] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [graphicError, setGraphicError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Logo / arrow / background / watermark / citation / format controls
  const [logoScale, setLogoScale] = useState(1.4);
  const [arrowScale, setArrowScale] = useState(1.4);
  const [darkBackground, setDarkBackground] = useState(initialDarkBackground ?? false);
  // Free-form dominant slide background. When set, slides use this color and auto-derive
  // ink (text/arrows/watermark/logo) from luminance — overrides the Classic/Match-hook toggle.
  const [slideBgColor, setSlideBgColor] = useState<string | undefined>(initialSlideBgColor);
  const [showLuniaLifeWatermark, setShowLuniaLifeWatermark] = useState(true);
  const [citationFontSize, setCitationFontSize] = useState(initialCitationFontSize ?? 36);
  const [headlineScale, setHeadlineScale] = useState(1);
  const [bodyScale, setBodyScale] = useState(1);
  const [reelsMode, setReelsMode] = useState(initialReelsMode ?? false);
  // Track the aspect ratio of the current hook image so we can prompt the user to regenerate
  const [hookImageAspect, setHookImageAspect] = useState<'4:5' | '9:16'>('4:5');

  // Icon picker state (content slides 1–3, i.e. slideIndex 0–2)
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [iconPickerCategory, setIconPickerCategory] = useState<IconCategory>("sleep");
  const [iconPickerLayout, setIconPickerLayout] = useState<"row" | "column" | "grid" | "scattered">("row");

  // Text editor state (content slides 1–3, i.e. slideIndex 0–2)
  const [textEditOpen, setTextEditOpen] = useState<number | null>(null);

  function updateSlideField(slideIndex: number, field: "headline" | "body", value: string) {
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], [field]: value };
    onContentChange({ ...config, content: { ...content, slides } });
  }

  // Hook image refinement state
  const [imageRefineOpen, setImageRefineOpen] = useState(false);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>(initialImageStyle ?? "realistic");
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
    return `${apiBase}/image-proxy?url=${encodeURIComponent(url)}`;
  }

  const imgs = slideImages ?? [null, null, null, null, null];
  // Only hook (0) uses fal.ai image; content + CTA are always ready
  const imagesLoading = imgs[0] === null;
  const bs: BrandStyle | undefined = brandStyle;
  const hook = content.hooks[selectedHook];

  // Pre-fetch hook background as data URL for canvas compositing.
  // html-to-image cannot render <img> elements via SVG foreignObject on any browser.
  const hookBgDataUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const rawUrl = imgs[0] ?? hookImageUrl ?? null;
    if (!rawUrl) return;
    const proxied = rawUrl.startsWith("/") ? rawUrl : `${apiBase}/image-proxy?url=${encodeURIComponent(rawUrl)}`;
    fetch(proxied)
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }))
      .then(dataUrl => { hookBgDataUrlRef.current = dataUrl; })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs[0], hookImageUrl]);

  async function getHookBgDataUrl(): Promise<string | null> {
    if (hookBgDataUrlRef.current) return hookBgDataUrlRef.current;
    const raw = imgs[0] ?? hookImageUrl ?? null;
    if (!raw) return null;
    try {
      const proxied = raw.startsWith("/") ? raw : `${apiBase}/image-proxy?url=${encodeURIComponent(raw)}`;
      const r = await fetch(proxied);
      const blob = await r.blob();
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      hookBgDataUrlRef.current = url;
      return url;
    } catch {
      return null;
    }
  }

  // Canvas compositing for the hook slide:
  // Capture foreground (text, overlays, decorations) with transparent bg via toPng,
  // then draw bg image + fg onto canvas to produce correct final PNG.
  async function compositeHookSlide(el: HTMLElement, bgDataUrl: string, filename: string, exportH = 1350): Promise<File> {
    const imgEl = el.querySelector("img") as HTMLImageElement | null;
    // el > SlideWrapper outer > SlideWrapper inner (has background style)
    const innerWrapper = el.firstElementChild?.firstElementChild as HTMLElement | null;
    const savedImgDisplay = imgEl?.style.display ?? "";
    const savedWrapperBg = innerWrapper?.style.background ?? "";

    if (imgEl) imgEl.style.display = "none";
    if (innerWrapper) innerWrapper.style.background = "transparent";

    let fgDataUrl: string;
    try {
      fgDataUrl = await toPng(el, {
        width: 1080, height: exportH, pixelRatio: 2,
        cacheBust: false, backgroundColor: "transparent",
      });
    } finally {
      if (imgEl) imgEl.style.display = savedImgDisplay;
      if (innerWrapper) innerWrapper.style.background = savedWrapperBg;
    }

    const W = 1080 * 2, H = exportH * 2;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    await new Promise<void>(resolve => {
      const bg = new Image();
      bg.onload = () => {
        const scale = Math.max(W / bg.width, H / bg.height);
        const w = bg.width * scale, h = bg.height * scale;
        ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h);
        resolve();
      };
      bg.onerror = () => resolve();
      bg.src = bgDataUrl;
    });

    await new Promise<void>(resolve => {
      const fg = new Image();
      fg.onload = () => { ctx.drawImage(fg, 0, 0, W, H); resolve(); };
      fg.onerror = () => resolve();
      fg.src = fgDataUrl;
    });

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png")
    );
    return new File([blob], filename, { type: "image/png" });
  }

  async function buildSlideFile(index: number): Promise<File> {
    const el = exportRefs.current[index];
    if (!el) throw new Error("Export element not found");

    const label = SLIDE_LABELS[index].toLowerCase().replace(" ", "-");
    const filename = reelsMode
      ? `lunia-reel-${index + 1}-${label}.png`
      : `lunia-slide-${index + 1}-${label}.png`;
    const exportH = reelsMode ? 1920 : 1350;

    const imgEls = Array.from(el.querySelectorAll("img"));
    await Promise.all(imgEls.map(img =>
      img.complete ? Promise.resolve() : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
    ));

    // Hook slide: canvas compositing (html-to-image cannot render <img> contents)
    if (index === 0 && (imgs[0] ?? hookImageUrl)) {
      const bgDataUrl = await getHookBgDataUrl();
      if (bgDataUrl) {
        return compositeHookSlide(el, bgDataUrl, filename, exportH);
      }
    }

    const dataUrl = await toPng(el, { width: 1080, height: exportH, pixelRatio: 2, cacheBust: false });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: "image/png" });
  }

  async function saveFile(file: File) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS && typeof navigator.share === "function") {
      // iOS only: share sheet → "Save Image" → Photos
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        // Share doesn't support files → fall through to download
      }
    }
    // Desktop: direct blob URL download → Downloads folder, no dialogs
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const file = await buildSlideFile(index);
      await saveFile(file);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setExportError("Export failed — try again");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    setDownloadingAll(true);
    setExportError(null);
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS && typeof navigator.share === "function") {
        const files: File[] = [];
        for (let i = 0; i < 5; i++) files.push(await buildSlideFile(i));
        try {
          await navigator.share({ files, title: "Lunia carousel slides" });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          for (const f of files) await saveFile(f);
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const file = await buildSlideFile(i);
          await saveFile(file);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setExportError("Export failed — try again");
    } finally {
      setDownloadingAll(false);
    }
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const res = await fetch(`${apiBase}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          ctaHeadline: content.cta.headline,
          followLine: content.cta.followLine,
          commentKeyword: content.commentKeyword,
          hookHeadline: hook.headline,
          hookSubline: hook.subline,
          slides: content.slides.map(s => ({
            headline: s.headline,
            body: s.body,
            citation: s.citation,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lunia-guide-${(topic ?? "guide").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/save`, {
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
          logoScale,
          arrowScale,
          darkBackground,
          slideBgColor,
          showLuniaLifeWatermark,
          imageStyle,
          format: carouselFormat,
          reelsMode,
          citationFontSize,
          headlineScale,
          bodyScale,
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
      return;
    }
    const graphic = next.length === 0
      ? ""
      : JSON.stringify({ component: "iconLayout", data: { icons: next.map((id) => ({ id })), layout: iconPickerLayout } });
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], graphic };
    onContentChange({ ...config, content: { ...content, slides } });
  }

  function applyIconLayout(slideIndex: number, layout: "row" | "column" | "grid" | "scattered") {
    setIconPickerLayout(layout);
    const current = getSelectedIcons(slideIndex);
    if (current.length === 0) return;
    const graphic = JSON.stringify({ component: "iconLayout", data: { icons: current.map((id) => ({ id })), layout } });
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], graphic };
    onContentChange({ ...config, content: { ...content, slides } });
  }

  function clearSlideIcons(slideIndex: number) {
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], graphic: "" };
    onContentChange({ ...config, content: { ...content, slides } });
  }

  async function handleRegenerateSlide(slideIndex: number) {
    setRegenerating(slideIndex);
    try {
      const res = await fetch(`${apiBase}/regenerate-slide`, {
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

  async function handleRegenerateGraphic(slideIndex: number, userComment: string = "", forceComponent?: string) {
    // v2 per-load cap (5 regens / slide). Forced-component picks count too.
    if (isV2 && (graphicRegenCount[slideIndex] ?? 0) >= GRAPHIC_REGEN_LIMIT) {
      setGraphicError(`Regeneration limit reached for this slide (${GRAPHIC_REGEN_LIMIT}/session). Reload the page to reset.`);
      return;
    }
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
      const res = await fetch(`${apiBase}/regenerate-graphic`, {
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
          userComment: userComment.trim() || undefined,
          forceComponent: forceComponent || undefined,
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
      // v2 per-load counter
      setGraphicRegenCount(prev => ({ ...prev, [slideIndex]: (prev[slideIndex] ?? 0) + 1 }));
      // Close comment panel and clear draft on success
      setGraphicCommentOpen(null);
      setGraphicComment(prev => ({ ...prev, [slideIndex]: "" }));
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
        const promptRes = await fetch(`${apiBase}/regenerate-image-prompt`, {
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
      const targetAspect = reelsMode ? "9:16" : "4:5";
      const imgRes = await fetch(`${apiBase}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slideIndex: 0, topic: topic ?? "", hook, imagePrompt: finalPrompt, imageStyle, imageAspect: targetAspect }),
      });
      const imgData = await imgRes.json();
      if (!imgRes.ok || imgData.error) throw new Error(imgData.error ?? "Image generation failed");

      // Update slideImages[0] in config and track the aspect of the new image
      const newSlideImages = [...(config.slideImages ?? [null, null, null, null, null])];
      newSlideImages[0] = imgData.url;
      setHookImageAspect(targetAspect);
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
      const res = await fetch(`${apiBase}/regenerate-image-prompt`, {
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
      const res = await fetch(`${apiBase}/regenerate-image-prompt`, {
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
      const res = await fetch(`${apiBase}/regenerate-graphic`, {
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

  // fal.ai images: hook (imgs[0]) + editorial background images on content slides (imgs[1-3]).
  // CTA slide stays clean — brand colors only.
  const slideNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]} shimmer={imgs[0] === null}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} overlays={isV2 ? hookOverlays : undefined} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    carouselFormat === "engagement" && content.commentKeyword
      ? <CommentCTASlide key={4} headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} reels={reelsMode} />
      : <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} reels={reelsMode} />,
  ];

  // Export nodes use proxied URLs so html-to-image canvas export works (avoids CORS taint)
  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} overlays={isV2 ? hookOverlays : undefined} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    carouselFormat === "engagement" && content.commentKeyword
      ? <CommentCTASlide key={4} headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} reels={reelsMode} />
      : <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} reels={reelsMode} />,
  ];

  const slideW = Math.round(1080 * PREVIEW_SCALE);
  const slideH = Math.round((reelsMode ? 1920 : 1350) * PREVIEW_SCALE);

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
          {carouselFormat === "engagement" && (
            <button
              className="btn-ghost"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              title="Generate the PDF guide to send to commenters"
            >
              {generatingPdf ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 4 }}>⟳</span>
                  Generating PDF…
                </>
              ) : (
                "↓ PDF guide"
              )}
            </button>
          )}
        </div>
      </div>

      {exportError && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)" }}>
          ⚠ {exportError}
        </div>
      )}
      {pdfError && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>PDF error: {pdfError}</span>
          <button onClick={() => setPdfError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--error)", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>
      )}
      {graphicError && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠ {graphicError}</span>
          <button onClick={() => setGraphicError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--error)", padding: "0 4px", fontFamily: "inherit" }}>×</button>
        </div>
      )}

      {/* Slide controls toolbar — two explicit rows, always fully visible */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {/* Row 1: decorative controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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
          {/* Lunia Life watermark toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Lunia Life</span>
            <button onClick={() => setShowLuniaLifeWatermark((v) => !v)} style={{
              padding: "3px 10px", fontSize: 11, fontWeight: 700,
              background: showLuniaLifeWatermark ? "var(--text)" : "var(--surface)",
              color: showLuniaLifeWatermark ? "var(--bg)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 5,
              cursor: "pointer", fontFamily: "inherit",
            }}>{showLuniaLifeWatermark ? "On" : "Off"}</button>
          </div>
          {/* Format toggle: Carousel (4:5) vs Reels (9:16) */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Format</span>
            <button onClick={() => setReelsMode(false)} style={{
              padding: "3px 8px", fontSize: 11, fontWeight: 700,
              background: !reelsMode ? "var(--accent)" : "var(--surface)",
              color: !reelsMode ? "var(--bg)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 5,
              cursor: "pointer", fontFamily: "inherit",
            }}>4:5</button>
            <button onClick={() => setReelsMode(true)} style={{
              padding: "3px 8px", fontSize: 11, fontWeight: 700,
              background: reelsMode ? "var(--accent)" : "var(--surface)",
              color: reelsMode ? "var(--bg)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 5,
              cursor: "pointer", fontFamily: "inherit",
            }}>9:16</button>
          </div>
        </div>
        {/* Row 2: content style controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Slide background — presets + free color picker. Custom color auto-derives ink from luminance. */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Slides bg</span>
            {([
              { label: "Dark", color: "#01253f" },
              { label: "Light", color: "#F7F4EF" },
            ] as const).map(({ label, color }) => {
              const active = slideBgColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => { setSlideBgColor(color); setDarkBackground(color === "#F7F4EF"); }}
                  title={`${label} (${color})`}
                  style={{
                    padding: "3px 8px", fontSize: 11, fontWeight: 700,
                    background: active ? "var(--text)" : "var(--surface)",
                    color: active ? "var(--bg)" : "var(--muted)",
                    border: "1px solid var(--border)", borderRadius: 5,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, border: "1px solid rgba(0,0,0,0.15)" }} />
                  {label}
                </button>
              );
            })}
            <label
              title="Pick any color — text + components flip automatically"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 6px",
                background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 5,
                cursor: "pointer",
              }}
            >
              <input
                type="color"
                value={slideBgColor ?? "#01253f"}
                onChange={(e) => { const c = e.target.value; setSlideBgColor(c); setDarkBackground(c.toLowerCase() === "#f7f4ef"); }}
                style={{ width: 18, height: 18, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.04em" }}>Custom</span>
            </label>
            {slideBgColor !== undefined && (
              <button
                onClick={() => { setSlideBgColor(undefined); }}
                title="Clear custom color (use brandStyle / preset)"
                style={{
                  padding: "3px 8px", fontSize: 11, fontWeight: 600,
                  background: "transparent",
                  color: "var(--subtle)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ×
              </button>
            )}
          </div>
          {/* Citation font size */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Citation size</span>
            {([18, 26, 36, 48] as const).map((s, idx) => {
              const labels = ["S", "M", "L", "XL"];
              return (
                <button key={s} onClick={() => setCitationFontSize(s)} style={{
                  padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  background: citationFontSize === s ? "var(--text)" : "var(--surface)",
                  color: citationFontSize === s ? "var(--bg)" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{labels[idx]}</button>
              );
            })}
          </div>
          {/* Headline size — scales the headline on content slides */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Headline size</span>
            {([0.85, 1, 1.15, 1.3] as const).map((s, idx) => {
              const labels = ["S", "M", "L", "XL"];
              return (
                <button key={s} onClick={() => setHeadlineScale(s)} style={{
                  padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  background: headlineScale === s ? "var(--text)" : "var(--surface)",
                  color: headlineScale === s ? "var(--bg)" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{labels[idx]}</button>
              );
            })}
          </div>
          {/* Body size — scales the body text on content slides */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Body size</span>
            {([0.85, 1, 1.2, 1.5, 1.85, 2.25] as const).map((s, idx) => {
              const labels = ["S", "M", "L", "XL", "2XL", "3XL"];
              return (
                <button key={s} onClick={() => setBodyScale(s)} style={{
                  padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  background: bodyScale === s ? "var(--text)" : "var(--surface)",
                  color: bodyScale === s ? "var(--bg)" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{labels[idx]}</button>
              );
            })}
          </div>
          {/* Edit slide text — opens editor for content slides 2/3/4 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Edit text</span>
            {[0, 1, 2].map((slideIdx) => {
              const active = textEditOpen === slideIdx;
              const label = `${slideIdx + 2}`;
              return (
                <button key={slideIdx} onClick={() => setTextEditOpen(active ? null : slideIdx)} style={{
                  padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  background: active ? "var(--accent)" : "var(--surface)",
                  color: active ? "var(--bg)" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{label}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Text editor panel — active content slide's headline + body */}
      {textEditOpen !== null && (
        <div style={{ marginBottom: 14, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Edit slide {textEditOpen + 2} text
            </span>
            <button onClick={() => setTextEditOpen(null)} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ padding: "12px", background: "var(--bg)" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Headline
            </label>
            <input
              type="text"
              value={content.slides[textEditOpen].headline}
              onChange={(e) => updateSlideField(textEditOpen!, "headline", e.target.value)}
              style={{
                width: "100%", fontSize: 13, lineHeight: 1.4,
                fontFamily: "inherit", color: "var(--text)",
                padding: "7px 10px", borderRadius: 5,
                border: "1px solid var(--border)", background: "var(--surface)",
                marginBottom: 12,
              }}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Main text
            </label>
            <textarea
              value={content.slides[textEditOpen].body}
              onChange={(e) => updateSlideField(textEditOpen!, "body", e.target.value)}
              rows={4}
              style={{
                width: "100%", fontSize: 13, lineHeight: 1.5,
                resize: "vertical", fontFamily: "inherit",
                color: "var(--text)",
                padding: "7px 10px", borderRadius: 5,
                border: "1px solid var(--border)", background: "var(--surface)",
              }}
            />
          </div>
        </div>
      )}

      {/* Reels image aspect notice — shown when hook image aspect doesn't match current format */}
      {(imgs[0] ?? hookImageUrl) && hookImageAspect !== (reelsMode ? "9:16" : "4:5") && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "10px 14px", marginBottom: 16,
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {reelsMode
              ? "Hook image was generated for carousel (4:5). Regenerate for best quality in 9:16."
              : "Hook image was generated for Reels (9:16). Regenerate for best quality in 4:5."}
          </span>
          <button
            onClick={() => { setImageRefineOpen(false); setImageGuidelines(""); handleRegenerateHookImage(); }}
            disabled={regeneratingImage}
            style={{
              padding: "4px 12px", fontSize: 11, fontWeight: 700,
              background: "var(--accent)", color: "var(--bg)",
              border: "none", borderRadius: 5, cursor: regeneratingImage ? "wait" : "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap", opacity: regeneratingImage ? 0.6 : 1,
            }}
          >
            {regeneratingImage ? "Regenerating…" : reelsMode ? "Regenerate for 9:16" : "Regenerate for 4:5"}
          </button>
        </div>
      )}

      {/* v2: Feed/Strip view toggle + global hook overlays button */}
      {isV2 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setOverlaysPanelOpen((v) => !v)}
              title="Edit hook image overlays"
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                border: `1px solid ${overlaysPanelOpen ? "var(--accent)" : "var(--border)"}`,
                background: overlaysPanelOpen ? "var(--accent-dim)" : "transparent",
                color: overlaysPanelOpen ? "var(--accent)" : "var(--muted)",
                fontSize: 11,
                fontWeight: overlaysPanelOpen ? 700 : 500,
                fontFamily: "inherit",
                cursor: "pointer",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              ✨ Hook overlays
            </button>
            {/* Graphic type + data editor — only meaningful for content slides (1-3) */}
            {viewMode === "feed" && feedIndex >= 1 && feedIndex <= 3 && (() => {
              const slideIdx = feedIndex - 1;
              const pickerOpen = typePickerOpen === slideIdx;
              const editorOpen = dataEditorOpen === slideIdx;
              return (
                <>
                  <button
                    onClick={() => { setTypePickerOpen(pickerOpen ? null : slideIdx); setDataEditorOpen(null); }}
                    title="Pick graphic type for this slide"
                    style={toolbarBtnStyle(pickerOpen)}
                  >
                    🧩 S{feedIndex} type
                  </button>
                  <button
                    onClick={() => { setDataEditorOpen(editorOpen ? null : slideIdx); setTypePickerOpen(null); }}
                    title="Edit graphic data for this slide"
                    style={toolbarBtnStyle(editorOpen)}
                  >
                    ✏️ S{feedIndex} data
                  </button>
                </>
              );
            })()}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>View</span>
            {(["strip", "feed"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 5,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)",
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {mode === "strip" ? "Strip" : (reelsMode ? "TikTok feed" : "IG feed")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* v2: Graphic data editor — manual data tweaks */}
      {isV2 && dataEditorOpen !== null && (() => {
        const slideIdx = dataEditorOpen;
        const slide = content.slides[slideIdx];
        if (!slide) return null;
        return (
          <PanelErrorBoundary
            key={`editor-${slideIdx}`}
            label="Graphic data editor"
            onClose={() => setDataEditorOpen(null)}
          >
            <GraphicDataEditor
              graphicJson={slide.graphic ?? ""}
              onClose={() => setDataEditorOpen(null)}
              onSave={(newJson) => {
                const slides = [...content.slides];
                slides[slideIdx] = { ...slides[slideIdx], graphic: newJson };
                onContentChange({ ...config, content: { ...content, slides } });
              }}
            />
          </PanelErrorBoundary>
        );
      })()}

      {/* v2: Graphic type picker (drives slide 1-3 forced component) */}
      {isV2 && typePickerOpen !== null && (() => {
        const slideIdx = typePickerOpen;
        const slide = content.slides[slideIdx];
        if (!slide) return null;
        let currentComp: string | undefined;
        try { currentComp = JSON.parse(slide.graphic ?? "{}").component; } catch {}
        const used = graphicRegenCount[slideIdx] ?? 0;
        const atLimit = used >= GRAPHIC_REGEN_LIMIT;
        return (
          <PanelErrorBoundary
            key={`picker-${slideIdx}`}
            label="Graphic type picker"
            onClose={() => setTypePickerOpen(null)}
          >
            <GraphicTypePicker
              currentComponent={currentComp}
              brandStyle={bs}
              busy={regeneratingGraphic === slideIdx || atLimit}
              onClose={() => setTypePickerOpen(null)}
              onPick={(componentKey) => {
                if (atLimit) {
                  setGraphicError(`Regeneration limit reached for this slide (${GRAPHIC_REGEN_LIMIT}/session). Reload the page to reset.`);
                  return;
                }
                handleRegenerateGraphic(slideIdx, "", componentKey);
                setTypePickerOpen(null);
              }}
            />
          </PanelErrorBoundary>
        );
      })()}

      {/* v2: Feed view */}
      {isV2 && viewMode === "feed" && (() => {
        const mode: FeedMode = reelsMode ? "tiktok" : "instagram";
        const aspect = reelsMode ? "9:16" : "4:5";
        const total = exportNodes.length;
        const idx = Math.min(feedIndex, total - 1);
        return (
          <FeedPreview
            slideNode={exportNodes[idx]}
            index={idx}
            total={total}
            onPrev={() => setFeedIndex((i) => Math.max(0, i - 1))}
            onNext={() => setFeedIndex((i) => Math.min(total - 1, i + 1))}
            mode={mode}
            aspect={aspect}
            caption={content.caption}
            brandAccent={bs?.accent ?? "#1e7a8a"}
          />
        );
      })()}

      {/* Slide strip */}
      {(!isV2 || viewMode === "strip") && (
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
                {i === 0 && isV2 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setOverlaysPanelOpen((v) => !v); }}
                    title="Edit hook image overlays"
                    style={{
                      background: overlaysPanelOpen ? "var(--accent-dim)" : "var(--surface)",
                      color: overlaysPanelOpen ? "var(--accent)" : "var(--muted)",
                      border: `1px solid ${overlaysPanelOpen ? "var(--accent-mid)" : "var(--border)"}`,
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
                    ✨ overlays
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
                    {isV2 && (() => {
                      const slideIdx = i - 1;
                      const used = graphicRegenCount[slideIdx] ?? 0;
                      const atLimit = used >= GRAPHIC_REGEN_LIMIT;
                      const isOpen = graphicCommentOpen === slideIdx;
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (atLimit) return;
                            setGraphicCommentOpen(isOpen ? null : slideIdx);
                          }}
                          disabled={isRegenerating || isRegeneratingGraphic || atLimit}
                          title={atLimit ? `Limit reached (${GRAPHIC_REGEN_LIMIT}/session)` : `Regenerate graphic with optional comment (${used}/${GRAPHIC_REGEN_LIMIT})`}
                          style={{
                            background: isOpen ? "var(--accent-dim)" : "var(--surface)",
                            color: isOpen ? "var(--accent)" : "var(--muted)",
                            border: `1px solid ${isOpen ? "var(--accent-mid)" : "var(--border)"}`,
                            borderRadius: 6,
                            padding: "7px 10px",
                            fontSize: 11,
                            fontFamily: "inherit",
                            cursor: (atLimit || isRegenerating || isRegeneratingGraphic) ? "not-allowed" : "pointer",
                            opacity: atLimit ? 0.4 : (isRegenerating || isRegeneratingGraphic) ? 0.5 : 1,
                            transition: "background 0.15s",
                            letterSpacing: "0.01em",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ✨ graphic {used > 0 && `(${used}/${GRAPHIC_REGEN_LIMIT})`}
                        </button>
                      );
                    })()}
                    {isV2 && (() => {
                      const slideIdx = i - 1;
                      const pickerOpen = typePickerOpen === slideIdx;
                      const editorOpen = dataEditorOpen === slideIdx;
                      return (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setTypePickerOpen(pickerOpen ? null : slideIdx); setDataEditorOpen(null); }}
                            disabled={isRegeneratingGraphic}
                            title="Pick graphic type"
                            style={{
                              background: pickerOpen ? "var(--accent-dim)" : "var(--surface)",
                              color: pickerOpen ? "var(--accent)" : "var(--muted)",
                              border: `1px solid ${pickerOpen ? "var(--accent-mid)" : "var(--border)"}`,
                              borderRadius: 6,
                              padding: "7px 10px",
                              fontSize: 11,
                              fontFamily: "inherit",
                              cursor: isRegeneratingGraphic ? "not-allowed" : "pointer",
                              opacity: isRegeneratingGraphic ? 0.5 : 1,
                              transition: "background 0.15s",
                              letterSpacing: "0.01em",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            🧩 type
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDataEditorOpen(editorOpen ? null : slideIdx); setTypePickerOpen(null); }}
                            disabled={isRegeneratingGraphic}
                            title="Edit graphic data"
                            style={{
                              background: editorOpen ? "var(--accent-dim)" : "var(--surface)",
                              color: editorOpen ? "var(--accent)" : "var(--muted)",
                              border: `1px solid ${editorOpen ? "var(--accent-mid)" : "var(--border)"}`,
                              borderRadius: 6,
                              padding: "7px 10px",
                              fontSize: 11,
                              fontFamily: "inherit",
                              cursor: isRegeneratingGraphic ? "not-allowed" : "pointer",
                              opacity: isRegeneratingGraphic ? 0.5 : 1,
                              transition: "background 0.15s",
                              letterSpacing: "0.01em",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✏️ data
                          </button>
                        </>
                      );
                    })()}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Icons</span>
                    <span style={{ fontSize: 10, color: "var(--subtle)" }}>{getSelectedIcons(i - 1).length}/4</span>
                    {getSelectedIcons(i - 1).length > 0 && (
                      <button onClick={() => clearSlideIcons(i - 1)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 3, fontSize: 9, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "1px 5px" }}>Clear</button>
                    )}
                  </div>
                  <button onClick={() => setIconPickerOpen(null)} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
                </div>
                {/* Layout picker */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Layout</span>
                  {(["row", "column", "grid", "scattered"] as const).map((lyt) => (
                    <button key={lyt} onClick={() => applyIconLayout(i - 1, lyt)} style={{
                      padding: "2px 6px", fontSize: 9, fontWeight: 700,
                      background: iconPickerLayout === lyt ? "var(--accent)" : "var(--bg)",
                      color: iconPickerLayout === lyt ? "#fff" : "var(--muted)",
                      border: "1px solid var(--border)", borderRadius: 3,
                      cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>{lyt}</button>
                  ))}
                </div>
                {/* Category tabs */}
                <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                  {(["sleep", "health", "lifestyle", "fitness", "mind"] as IconCategory[]).map((cat) => (
                    <button key={cat} onClick={() => setIconPickerCategory(cat)} style={{
                      flex: 1, padding: "6px 2px", border: "none",
                      borderBottom: iconPickerCategory === cat ? "2px solid var(--accent)" : "2px solid transparent",
                      background: "transparent", fontSize: 9, fontWeight: iconPickerCategory === cat ? 700 : 500,
                      color: iconPickerCategory === cat ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "inherit",
                    }}>{cat}</button>
                  ))}
                </div>
                {/* Icon grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2, padding: 6, background: "var(--bg)", maxHeight: 200, overflowY: "auto" }}>
                  {CAROUSEL_ICONS.filter((ic) => ic.category === iconPickerCategory).map((ic) => {
                    const selected = getSelectedIcons(i - 1);
                    const isSelected = selected.includes(ic.id);
                    const atMax = selected.length >= 4 && !isSelected;
                    return (
                      <button key={ic.id} onClick={() => toggleSlideIcon(i - 1, ic.id)} title={ic.label} disabled={atMax} style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                        padding: "7px 4px",
                        border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                        borderRadius: 6,
                        background: isSelected ? "var(--accent-dim)" : "transparent",
                        cursor: atMax ? "not-allowed" : "pointer",
                        opacity: atMax ? 0.35 : 1,
                        transition: "background 0.1s",
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

            {/* v2 graphic regeneration comment panel */}
            {isV2 && i >= 1 && i <= 3 && graphicCommentOpen === i - 1 && (() => {
              const slideIdx = i - 1;
              const used = graphicRegenCount[slideIdx] ?? 0;
              const draft = graphicComment[slideIdx] ?? "";
              const isBusy = regeneratingGraphic === slideIdx;
              return (
                <div style={{ marginTop: 8, border: "1px solid var(--accent-mid)", borderRadius: 8, overflow: "hidden", background: "var(--surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--accent-dim)", borderBottom: "1px solid var(--accent-mid)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Regenerate graphic · {used}/{GRAPHIC_REGEN_LIMIT}
                    </span>
                    <button onClick={() => setGraphicCommentOpen(null)} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <textarea
                      value={draft}
                      onChange={(e) => setGraphicComment(prev => ({ ...prev, [slideIdx]: e.target.value.slice(0, 400) }))}
                      placeholder="Optional — what to change? e.g. 'use minutes not hours', 'make this a vertical comparison'"
                      rows={2}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "8px 10px", fontSize: 12, fontFamily: "inherit",
                        background: "var(--bg)", color: "var(--text)",
                        border: "1px solid var(--border)", borderRadius: 6,
                        resize: "vertical", minHeight: 44,
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--subtle)" }}>
                        {draft.trim() ? `${draft.trim().length}/400` : "Empty = fresh variation"}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRegenerateGraphic(slideIdx, draft); }}
                        disabled={isBusy}
                        style={{
                          background: "var(--accent)", color: "#fff",
                          border: "none", borderRadius: 6,
                          padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                          cursor: isBusy ? "not-allowed" : "pointer",
                          opacity: isBusy ? 0.6 : 1,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {isBusy ? "Generating…" : (draft.trim() ? "Regenerate with comment" : "Regenerate")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          );
        })}
      </div>
      )}

      {/* v2: Hook overlays control panel */}
      {isV2 && overlaysPanelOpen && (
        <div style={{
          marginTop: 12,
          border: "1px solid var(--accent-mid)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--surface)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--accent-dim)", borderBottom: "1px solid var(--accent-mid)" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Hook Overlays
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                Layered effects on the hook image. Changes apply live and to PNG export.
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setHookOverlays({
                  ...DEFAULT_HOOK_OVERLAYS,
                  frame: { ...DEFAULT_HOOK_OVERLAYS.frame, color: config.brandStyle?.accent ?? DEFAULT_HOOK_OVERLAYS.frame.color },
                })}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}
              >
                Reset
              </button>
              <button onClick={() => setOverlaysPanelOpen(false)} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1, padding: "4px 6px" }}>✕</button>
            </div>
          </div>

          <div style={{ padding: "12px 14px", display: "grid", gap: 14 }}>
            {/* Editorial frame */}
            <OverlayRow
              label="Editorial frame"
              hint="Thin inset border"
              enabled={hookOverlays.frame.enabled}
              onToggle={(v) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, enabled: v } }))}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Color</label>
                <input
                  type="color"
                  value={hookOverlays.frame.color}
                  onChange={(e) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, color: e.target.value } }))}
                  style={{ width: 28, height: 22, border: "1px solid var(--border)", borderRadius: 4, padding: 0, background: "transparent", cursor: "pointer" }}
                />
                <SliderControl
                  label="Opacity"
                  min={0}
                  max={1}
                  step={0.05}
                  value={hookOverlays.frame.opacity}
                  onChange={(v) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, opacity: v } }))}
                />
              </div>
            </OverlayRow>

            {/* Vignette */}
            <OverlayRow
              label="Soft vignette"
              hint="Darkens corners, focuses center"
              enabled={hookOverlays.vignette.enabled}
              onToggle={(v) => setHookOverlays((s) => ({ ...s, vignette: { ...s.vignette, enabled: v } }))}
            >
              <SliderControl
                label="Strength"
                min={0}
                max={0.6}
                step={0.05}
                value={hookOverlays.vignette.intensity}
                onChange={(v) => setHookOverlays((s) => ({ ...s, vignette: { ...s.vignette, intensity: v } }))}
              />
            </OverlayRow>

            {/* Color grade */}
            <OverlayRow
              label="Color grade"
              hint="Editorial polish (contrast + warmth)"
              enabled={hookOverlays.colorGrade.enabled}
              onToggle={(v) => setHookOverlays((s) => ({ ...s, colorGrade: { ...s.colorGrade, enabled: v } }))}
            >
              <SliderControl
                label="Strength"
                min={0}
                max={2}
                step={0.1}
                value={hookOverlays.colorGrade.intensity}
                onChange={(v) => setHookOverlays((s) => ({ ...s, colorGrade: { ...s.colorGrade, intensity: v } }))}
              />
            </OverlayRow>

            {/* Film grain */}
            <OverlayRow
              label="Film grain"
              hint="Subtle noise texture"
              enabled={hookOverlays.grain.enabled}
              onToggle={(v) => setHookOverlays((s) => ({ ...s, grain: { ...s.grain, enabled: v } }))}
            >
              <SliderControl
                label="Opacity"
                min={0}
                max={0.2}
                step={0.01}
                value={hookOverlays.grain.opacity}
                onChange={(v) => setHookOverlays((s) => ({ ...s, grain: { ...s.grain, opacity: v } }))}
              />
            </OverlayRow>
          </div>
        </div>
      )}

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
          <div key={i} ref={el => { exportRefs.current[i] = el; }} style={{ width: 1080, height: reelsMode ? 1920 : 1350 }}>
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
