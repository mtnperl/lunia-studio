"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import EditorialContentSlide from "@/components/carousel/slides/EditorialContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import CommentCTASlide from "@/components/carousel/slides/CommentCTASlide";
import TakeawaySlide from "@/components/carousel/slides/TakeawaySlide";
import { BrandStyle, CarouselConfig, CarouselFormat, HookTone } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";
import { useCarouselApi } from "@/components/carousel/api-context";
import { DEFAULT_HOOK_OVERLAYS, SOFT_WHITE, type HookOverlaySettings, type BackgroundWash } from "@/components/carousel/shared/HookOverlays";
import FeedPreview, { type FeedMode } from "@/components/carousel/preview/FeedPreview";
import GraphicTypePicker from "@/components/carousel/preview/GraphicTypePicker";
import GraphicDataEditor from "@/components/carousel/preview/GraphicDataEditor";
import PanelErrorBoundary from "@/components/carousel/preview/PanelErrorBoundary";
import SlideRail from "@/components/carousel/preview/SlideRail";
import InspectorPanel from "@/components/carousel/preview/InspectorPanel";

// v2 editor: which tool panel is docked in the inspector (null = closed).
type InspectorMode =
  | null
  | "settings"
  | "text"
  | "takeaway"
  | "icons"
  | "graphicType"
  | "graphicData"
  | "overlays"
  | "image"
  | "graphicComment";

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
  initialMoodId?: string | null;
  initialReelsMode?: boolean;
  initialCitationFontSize?: number;
  initialSlideBgColor?: string;
  initialDarkBackground?: boolean;
  initialLogoScale?: number;
  initialArrowScale?: number;
  initialHeadlineScale?: number;
  initialBodyScale?: number;
  initialIconScale?: number;
  initialShowLuniaLifeWatermark?: boolean;
  initialHookOverlays?: HookOverlaySettings;
  initialShowSlideArrows?: boolean;
  initialShowSlideNumbers?: boolean;
  initialShowCitationBars?: boolean;
  stylePreset?: import("@/lib/types").CarouselStylePreset;
  carouselFormat?: CarouselFormat;
  /** When the editor was opened from the library, the saved-carousel id flows
   *  in so the "Save" button updates that record in place instead of minting
   *  a brand-new carousel on every save. */
  initialSavedId?: string | null;
};

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.62;

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

// ─── v2 editor action-bar button ──────────────────────────────────────────────
function ToolbarButton({ label, onClick, active = false, disabled = false }: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...toolbarBtnStyle(active), opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      {label}
    </button>
  );
}

// ─── Toolbar dropdown — groups related actions under one trigger ──────────────
// Trigger reads as active when the menu is open OR any child item is active
// (so a "Graphic ▾" chip stays highlighted while one of its inspectors is
// open). Popover uses a solid surface + border (no shadow) per DESIGN.md's
// light-mode elevation rule. Closes on item click or outside click.
type ToolbarMenuItem = { label: string; active?: boolean; disabled?: boolean; onClick: () => void };
function ToolbarMenu({ label, active = false, disabled = false, items }: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  items: ToolbarMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        style={{ ...toolbarBtnStyle(active || open), opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        {label} ▾
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
          display: "flex", flexDirection: "column", minWidth: 150,
          background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 8, padding: 4,
        }}>
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => { if (it.disabled) return; setOpen(false); it.onClick(); }}
              disabled={it.disabled}
              style={{
                textAlign: "left", padding: "7px 10px", borderRadius: 5, border: "none",
                background: it.active ? "var(--accent-dim)" : "transparent",
                color: it.active ? "var(--accent)" : "var(--text)",
                fontSize: 11, fontWeight: it.active ? 700 : 500, fontFamily: "inherit",
                letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
                cursor: it.disabled ? "not-allowed" : "pointer", opacity: it.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => { if (!it.active && !it.disabled) e.currentTarget.style.background = "var(--surface-h)"; }}
              onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = "transparent"; }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hook overlay panel helpers ───────────────────────────────────────────────
function OverlayRow({ label, hint, enabled, onToggle, children, compact = false }: {
  label: string;
  hint: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: "8px 0", borderTop: "1px dashed var(--border)",
        opacity: enabled ? 1 : 0.5,
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</span>
          <span style={{ fontSize: 10, color: "var(--muted)" }}>{hint}</span>
        </label>
        <div style={{ pointerEvents: enabled ? "auto" : "none" }}>{children}</div>
      </div>
    );
  }
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
      <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.02em" }}>{hint}</span>
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


function Segmented<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</label>
      <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 5, overflow: "hidden" }}>
        {options.map((o, i) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              background: value === o.value ? "var(--accent)" : "transparent",
              color: value === o.value ? "#fff" : "var(--muted)",
              border: "none",
              borderLeft: i === 0 ? "none" : "1px solid var(--border)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "4px 9px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const WASH_SEED: BackgroundWash = { mode: "dark", color: SOFT_WHITE, opacity: 0.6, gradient: false };

export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onContentChange, initialImageStyle, initialMoodId, initialReelsMode, initialCitationFontSize, initialSlideBgColor, initialDarkBackground, initialLogoScale, initialArrowScale, initialHeadlineScale, initialBodyScale, initialIconScale, initialShowLuniaLifeWatermark, initialHookOverlays, initialShowSlideArrows, initialShowSlideNumbers, initialShowCitationBars, stylePreset = "default", carouselFormat = "standard", initialSavedId = null }: Props) {
  const apiBase = useCarouselApi();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [saveLabel, setSaveLabel] = useState<string | null>(null); // transient "Saved!" flash after a successful update
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
  const [hookOverlays, setHookOverlays] = useState<HookOverlaySettings>(() => initialHookOverlays ?? ({
    ...DEFAULT_HOOK_OVERLAYS,
    // Seed frame color from brand accent if available
    frame: { ...DEFAULT_HOOK_OVERLAYS.frame, color: config.brandStyle?.accent ?? DEFAULT_HOOK_OVERLAYS.frame.color },
  }));
  const [overlaysPanelOpen, setOverlaysPanelOpen] = useState(false);
  // Collapsible "Slide controls" drawer — open by default, collapse to bring the
  // preview up and clear the screen.
  const [controlsOpen, setControlsOpen] = useState(true);
  // v2-only: editor (3-zone workspace) vs feed (IG/TikTok mockup preview)
  const [viewMode, setViewMode] = useState<"editor" | "feed">("editor");
  const [feedIndex, setFeedIndex] = useState(0);
  // v2 editor: focused slide shown in the canvas + which inspector panel is open
  const [focusedSlide, setFocusedSlide] = useState(0);
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(null);
  // v2 editor: AI-suggested icon ids for the focused content slide, held
  // un-applied so opening the icon panel never mutates the slide.
  const [iconSuggestions, setIconSuggestions] = useState<string[]>([]);
  // v2 editor: measured editor width — canvas scale is derived from it.
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorW, setEditorW] = useState(0);
  // v2-only: graphic type picker — which slide's picker is open (or null)
  const [typePickerOpen, setTypePickerOpen] = useState<number | null>(null);
  // v2-only: graphic data editor — which slide's editor is open (or null)
  const [dataEditorOpen, setDataEditorOpen] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [graphicError, setGraphicError] = useState<string | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  // "Preview HD" — render the focused content slide via Remotion and show the
  // PNG inline, so the server-rendered (exported) output is visible in-builder.
  const [hdLoading, setHdLoading] = useState<number | null>(null);
  const [hdPreviewUrl, setHdPreviewUrl] = useState<string | null>(null);
  const [hdError, setHdError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Logo / arrow / background / watermark / citation / format controls
  const [logoScale, setLogoScale] = useState(initialLogoScale ?? 1.4);
  const [arrowScale, setArrowScale] = useState(initialArrowScale ?? 1.4);
  const [darkBackground, setDarkBackground] = useState(initialDarkBackground ?? false);
  // Free-form dominant slide background. When set, slides use this color and auto-derive
  // ink (text/arrows/watermark/logo) from luminance — overrides the Classic/Match-hook toggle.
  const isEditorial = stylePreset === "editorial-scientific";
  // Editorial Scientific renders content slides with a bespoke layout —
  // logo top, big editorial headline + rule, body, optional icon-stat rows,
  // optional product photo. Drop-in compatible with ContentSlide's props.
  const ContentSlideComponent = isEditorial ? EditorialContentSlide : ContentSlide;
  // Editorial Scientific: default the slide bg to Soft Ivory if no saved color.
  const [slideBgColor, setSlideBgColor] = useState<string | undefined>(initialSlideBgColor ?? (isEditorial ? "#EFEFF4" : undefined));
  // Decoration toggles — default true to preserve every existing carousel's look.
  const [showSlideArrows, setShowSlideArrows] = useState(initialShowSlideArrows ?? true);
  const [showSlideNumbers, setShowSlideNumbers] = useState(initialShowSlideNumbers ?? true);
  const [showCitationBars, setShowCitationBars] = useState(initialShowCitationBars ?? true);
  // AI-generated bg images for content slides 1-3 (indexed 0..2). null = none, undefined = pristine, string = url, "shimmer" = generating.
  const [contentBgImages, setContentBgImages] = useState<(string | null)[]>(
    config.contentBgImages ?? [null, null, null]
  );
  const [contentBgGenerating, setContentBgGenerating] = useState<Set<number>>(new Set());
  const [contentBgOverlayOpacity, setContentBgOverlayOpacity] = useState<number>(
    typeof config.contentBgOverlayOpacity === 'number' ? config.contentBgOverlayOpacity : 0.55
  );
  const [showLuniaLifeWatermark, setShowLuniaLifeWatermark] = useState(initialShowLuniaLifeWatermark ?? true);
  // Editorial preset defaults: citation = M (26), headline = L (1.15).
  // Other presets keep the previous defaults (citation L = 36, headline M = 1).
  const [citationFontSize, setCitationFontSize] = useState(initialCitationFontSize ?? (isEditorial ? 26 : 36));
  const [headlineScale, setHeadlineScale] = useState(initialHeadlineScale ?? (isEditorial ? 1.15 : 1));
  const [bodyScale, setBodyScale] = useState(initialBodyScale ?? 1.2); // default "L"
  const [iconScale, setIconScale] = useState(initialIconScale ?? 1); // icon-layout graphic size, default "M"
  const [reelsMode, setReelsMode] = useState(initialReelsMode ?? false);
  // Track the aspect ratio of the current hook image so we can prompt the user to regenerate
  const [hookImageAspect, setHookImageAspect] = useState<'4:5' | '9:16'>('4:5');

  // Icon picker state (content slides 1–3, i.e. slideIndex 0–2)
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [iconPickerCategory, setIconPickerCategory] = useState<IconCategory>("sleep");
  const [iconPickerLayout, setIconPickerLayout] = useState<"row" | "column" | "grid" | "scattered">("row");
  const [suggestingIcons, setSuggestingIcons] = useState<number | null>(null);

  // Text editor state (content slides 1–3, i.e. slideIndex 0–2)
  const [textEditOpen, setTextEditOpen] = useState<number | null>(null);

  function updateSlideField(slideIndex: number, field: "headline" | "body", value: string) {
    const slides = [...content.slides];
    slides[slideIndex] = { ...slides[slideIndex], [field]: value };
    onContentChange({ ...config, content: { ...content, slides } });
  }

  // Patch the optional Takeaway slide. Merges over the current takeaway so
  // callers can update one field (headline / points / interaction) at a time.
  // No-op when the carousel has no takeaway (renderers already guard on it).
  function updateTakeaway(patch: Partial<NonNullable<typeof content.takeaway>>) {
    if (!content.takeaway) return;
    onContentChange({
      ...config,
      content: { ...content, takeaway: { ...content.takeaway, ...patch } },
    });
  }

  // Hook image refinement state
  const [imageRefineOpen, setImageRefineOpen] = useState(false);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>(initialImageStyle ?? "realistic");
  const [moodId] = useState<string | null>(initialMoodId ?? null);
  const [imageGuidelines, setImageGuidelines] = useState("");
  const [imagePromptDraft, setImagePromptDraft] = useState<string>("");
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);
  const [imageRegenError, setImageRegenError] = useState<string | null>(null);
  const [promptAlternatives, setPromptAlternatives] = useState<string[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  // Regenerate-only override: "auto" lets the server pick (Recraft default).
  // "gpt-image-2" forces OpenAI GPT Image 2 via fal for higher fidelity / text rendering.
  const [regenEngine, setRegenEngine] = useState<"auto" | "gpt-image-2">("auto");
  // Editorial Scientific extras. Session-only — not persisted on the carousel.
  // "auto" lets the server rotate the interpretive lane per regen so the same
  // hook concept stops painting the same composition every time.
  const [imageDirection, setImageDirection] = useState<
    "auto" | "macro" | "environmental" | "abstract" | "symbolic" | "natural"
  >("auto");
  // Subject lock — orthogonal to Direction. "auto" lets the engine choose;
  // "person" hard-requires a partial-frame human element (hand on temple,
  // silhouette, back-of-head, closed-eye close-crop — never a full portrait).
  // "still-life" forbids humans, "environment" allows but does not require one.
  // Sent to /generate-image and /regenerate-image-prompt so suggestions and
  // final renders both respect the choice.
  const [imageSubject, setImageSubject] = useState<
    "auto" | "person" | "still-life" | "environment"
  >("auto");
  // "white" = #EFEFF4 (current behavior). "warm" = #EFE1C8 warm ecru ivory.
  // Only affects AI-generated images (hook + content slide bgs). The rendered
  // slide backgrounds stay on slideBgColor — intentionally untouched.
  const [paperTone, setPaperTone] = useState<"white" | "warm">("white");

  // Hook image history — newest first. Populated whenever a regenerate
  // displaces the current image, so the user can revert to any prior take.
  // Session-only (does not persist on save) — keeps the surface tiny.
  const [hookImageHistory, setHookImageHistory] = useState<string[]>([]);

  // ── Full-prompt editor ──────────────────────────────────────────────────
  // fullPromptPreview = the prompt the server WOULD send right now (assembled
  // from spec + mood + chrome). fullPromptOverride mirrors
  // content.hookImagePromptOverride and, when non-empty, is sent verbatim to
  // the image route so the user-edited prompt wins over the server framework.
  const [fullPromptPreview, setFullPromptPreview] = useState<string>("");
  const [fullPromptOverride, setFullPromptOverride] = useState<string>("");
  const [fullPromptLoading, setFullPromptLoading] = useState<boolean>(false);
  const [fullPromptOpen, setFullPromptOpen] = useState<boolean>(false);
  const [fullPromptError, setFullPromptError] = useState<string | null>(null);

  // Derive vector mode from actual graphic data rather than ephemeral UI state
  function isVectorSlide(slideIndex: number): boolean {
    try {
      const g = content.slides[slideIndex]?.graphic;
      return !!g && JSON.parse(g)?.component === "vector";
    } catch { return false; }
  }

  // Full-size hidden refs for accurate PNG export
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);

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

  // Optional penultimate "payoff" slide. v2 standard format only — engagement
  // carousels keep their comment-CTA, and decks saved before this slide existed
  // have no `takeaway`. When present the carousel is 6 slides instead of 5, so
  // labels, loop bounds, and the CTA index are all derived from here.
  const hasTakeaway = isV2 && carouselFormat !== "engagement"
    && !!content.takeaway
    && Array.isArray(content.takeaway.points) && content.takeaway.points.length > 0
    && !!content.takeaway.interaction;
  const slideLabels = hasTakeaway
    ? ["Hook", "Slide 2", "Slide 3", "Slide 4", "Takeaway", "CTA"]
    : SLIDE_LABELS;
  const slideCount = slideLabels.length;

  // Cache of image-URL → data-URL. Keyed by the resolved <img.src> (proxied
  // path or local path). html-to-image's SVG foreignObject silently drops
  // <img> contents on mobile Safari, so we use canvas compositing instead:
  // pull the image data out, capture the slide foreground (with all <img>s
  // hidden) via toPng, then draw the image(s) + foreground onto a 2x canvas.
  const imageDataUrlCache = useRef<Map<string, string>>(new Map());

  /** Fetch any <img.src> URL → data URL. Cached. Auto-proxies cross-origin. */
  async function loadDataUrl(src: string): Promise<string> {
    if (src.startsWith("data:")) return src;
    const cached = imageDataUrlCache.current.get(src);
    if (cached) return cached;
    const target = src.startsWith("/")
      ? src
      : `${apiBase}/image-proxy?url=${encodeURIComponent(src)}`;
    const r = await fetch(target);
    if (!r.ok) throw new Error(`Image fetch failed: ${r.status}`);
    const blob = await r.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    imageDataUrlCache.current.set(src, dataUrl);
    return dataUrl;
  }

  /** Fire-and-forget pre-warm so the cache is hot by Download time. */
  function prefetchUrl(src: string | null | undefined) {
    if (!src) return;
    loadDataUrl(src).catch(() => {});
  }

  // Pre-fetch hook bg whenever the source URL changes.
  useEffect(() => {
    const proxied = proxyUrl(imgs[0]) ?? hookImageUrl ?? null;
    if (proxied) prefetchUrl(proxied);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgs[0], hookImageUrl]);

  // Sync the local override mirror whenever the saved carousel changes (e.g.
  // load from library or a different carousel comes in).
  useEffect(() => {
    setFullPromptOverride(content.hookImagePromptOverride ?? "");
  }, [content.hookImagePromptOverride]);

  // Whenever the hook variant, the high-level imagePrompt, the image style,
  // the chosen mood/engine, or the structured editorial spec changes, ask the
  // server what FULL prompt it would assemble. This keeps the "Full prompt
  // sent to engine" textarea always showing the current truth — and the user
  // can edit it from there if they want to override.
  const targetAspectForPreview = reelsMode ? "9:16" : "4:5";
  useEffect(() => {
    let aborted = false;
    setFullPromptLoading(true);
    setFullPromptError(null);
    fetch(`${apiBase}/generate-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        previewOnly: true,
        slideIndex: 0,
        topic: topic ?? "",
        hook,
        imagePrompt: currentImagePrompt,
        imageStyle,
        imageAspect: targetAspectForPreview,
        ...(moodId ? { moodId } : {}),
        ...(regenEngine === "gpt-image-2" ? { imageEngine: "gpt-image-2" } : {}),
        ...(isEditorial ? { stylePreset: "editorial-scientific" } : {}),
        ...(isEditorial && content.hookImageSpec ? { hookImageSpec: content.hookImageSpec } : {}),
        ...(isEditorial ? { imageDirection, paperTone, imageSubject } : {}),
      }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (aborted) return;
        if (!r.ok || data.error || !data.prompt) {
          setFullPromptError(data.error ?? `Could not preview prompt (HTTP ${r.status})`);
          return;
        }
        setFullPromptPreview(data.prompt as string);
      })
      .catch((err) => {
        if (aborted) return;
        setFullPromptError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => { if (!aborted) setFullPromptLoading(false); });
    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHook, currentImagePrompt, imageStyle, regenEngine, moodId, isEditorial, content.hookImageSpec, targetAspectForPreview, imageDirection, paperTone, imageSubject]);

  // Pre-fetch every content-slide bg whenever any of them change.
  const contentBgKey = contentBgImages.map(u => u ?? "").join("|");
  useEffect(() => {
    contentBgImages.forEach((u) => prefetchUrl(proxyUrl(u)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBgKey]);

  /**
   * Canvas compositing for any slide containing <img>s. This is the proven
   * pattern from CarouselShareClient.compositeHookSlide, generalised to handle
   * multiple images per slide (V2 content slides have a bg <img>; some may
   * also have a graphic <img> in the graphic zone).
   *
   * Steps:
   * 1. For each <img>, capture its bounding rect relative to `el` and resolve
   *    its src to a data URL.
   * 2. Hide every <img> + clear the SlideWrapper inner background so the
   *    foreground capture has a transparent backdrop.
   * 3. toPng captures the foreground (text, arrows, color overlay div, etc.).
   * 4. On a 2x-resolution canvas, draw each image at its actual position with
   *    object-fit-aware fitting, then draw the foreground PNG on top.
   */
  async function compositeWithImages(
    el: HTMLElement,
    imgEls: HTMLImageElement[],
    filename: string,
    exportH: number,
  ): Promise<File> {
    const elRect = el.getBoundingClientRect();
    type ImgInfo = { dataUrl: string; x: number; y: number; w: number; h: number; objectFit: string };
    const infos: ImgInfo[] = [];

    for (const img of imgEls) {
      const src = img.getAttribute("src");
      if (!src) continue;
      let dataUrl: string;
      try {
        dataUrl = await loadDataUrl(src);
      } catch {
        continue; // skip this image, fall through to whatever fg captures
      }
      const r = img.getBoundingClientRect();
      infos.push({
        dataUrl,
        x: r.x - elRect.x,
        y: r.y - elRect.y,
        w: r.width,
        h: r.height,
        objectFit: getComputedStyle(img).objectFit || "fill",
      });
    }

    // Hide every <img> + clear inner wrapper bg so toPng captures only the fg.
    // el > SlideWrapper outer > SlideWrapper inner (carries the user-supplied
    // `style={{ background: bg }}` from HookSlide / ContentSlide).
    const innerWrapper = el.firstElementChild?.firstElementChild as HTMLElement | null;
    const savedDisplays = imgEls.map((img) => img.style.display);
    const savedWrapperBg = innerWrapper?.style.background ?? "";

    imgEls.forEach((img) => { img.style.display = "none"; });
    if (innerWrapper) innerWrapper.style.background = "transparent";

    let fgDataUrl: string;
    try {
      fgDataUrl = await toPng(el, {
        width: 1080, height: exportH, pixelRatio: 2,
        cacheBust: false, backgroundColor: "transparent",
      });
    } finally {
      imgEls.forEach((img, i) => { img.style.display = savedDisplays[i] ?? ""; });
      if (innerWrapper) innerWrapper.style.background = savedWrapperBg;
    }

    const PR = 2;
    const W = 1080 * PR, H = exportH * PR;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Draw each image at its actual on-page position (in DOM order = z-order).
    for (const info of infos) {
      await new Promise<void>((resolve) => {
        const im = new Image();
        im.onload = () => {
          const dx = info.x * PR;
          const dy = info.y * PR;
          const dw = info.w * PR;
          const dh = info.h * PR;
          if (info.objectFit === "cover") {
            const scale = Math.max(dw / im.width, dh / im.height);
            const sw = dw / scale, sh = dh / scale;
            const sx = (im.width - sw) / 2;
            const sy = (im.height - sh) / 2;
            ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
          } else if (info.objectFit === "contain") {
            const scale = Math.min(dw / im.width, dh / im.height);
            const dwc = im.width * scale, dhc = im.height * scale;
            ctx.drawImage(im, dx + (dw - dwc) / 2, dy + (dh - dhc) / 2, dwc, dhc);
          } else {
            ctx.drawImage(im, dx, dy, dw, dh);
          }
          resolve();
        };
        im.onerror = () => resolve();
        im.src = info.dataUrl;
      });
    }

    // Draw the foreground (text, arrows, color overlay, etc.) over the images.
    await new Promise<void>((resolve) => {
      const fg = new Image();
      fg.onload = () => { ctx.drawImage(fg, 0, 0, W, H); resolve(); };
      fg.onerror = () => resolve();
      fg.src = fgDataUrl;
    });

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png"),
    );
    return new File([blob], filename, { type: "image/png" });
  }

  // Render a content slide server-side via Remotion renderStill (the real
  // <ContentSlide> component) instead of html-to-image — deterministic, crisp,
  // no canvas-taint / Safari quirks. Same props the preview uses, so the PNG
  // matches the preview exactly.
  async function renderContentSlideViaRemotion(
    slide: { headline: string; body: string; citation: string; graphic?: string },
    filename: string,
  ): Promise<File> {
    const res = await fetch("/api/carousel-v2/render-slide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: slide.headline,
        body: slide.body,
        citation: slide.citation,
        graphic: slide.graphic,
        brandStyle: bs,
        slideBgColor,
        darkBackground,
        citationFontSize,
        headlineScale,
        bodyScale,
        iconScale,
        logoScale,
        arrowScale,
        stylePreset,
        showSlideArrows,
        showSlideNumbers,
        showCitationBars,
        showLuniaLifeWatermark,
        prominentWatermark: isV2,
      }),
    });
    if (!res.ok) throw new Error(`render-slide ${res.status}`);
    const blob = await res.blob();
    return new File([blob], filename, { type: "image/png" });
  }

  async function previewHD(index: number) {
    const contentIdx = index - 1;
    if (contentIdx < 0 || contentIdx >= content.slides.length) return;
    setHdLoading(index);
    setHdError(null);
    try {
      const file = await renderContentSlideViaRemotion(content.slides[contentIdx], "lunia-slide-hd.png");
      if (hdPreviewUrl) URL.revokeObjectURL(hdPreviewUrl);
      setHdPreviewUrl(URL.createObjectURL(file));
    } catch {
      setHdError("HD render failed — the Remotion route may still be deploying, or this slide type isn't supported yet.");
    } finally {
      setHdLoading(null);
    }
  }

  async function buildSlideFile(index: number): Promise<File> {
    const el = exportRefs.current[index];
    if (!el) throw new Error("Export element not found");

    const label = (slideLabels[index] ?? `slide-${index + 1}`).toLowerCase().replace(" ", "-");
    const filename = reelsMode
      ? `lunia-reel-${index + 1}-${label}.png`
      : `lunia-slide-${index + 1}-${label}.png`;
    const exportH = reelsMode ? 1920 : 1350;

    // Infographic content slides (slides 1..N) with a GraphicSpec graphic, no AI
    // background image, and standard (non-Reels) format render via Remotion for
    // pixel-deterministic output. Hook/CTA, image-backed, and Reels slides keep
    // the html-to-image path. Any failure falls back to it too.
    const contentIdx = index - 1;
    const isContentSlide = contentIdx >= 0 && contentIdx < content.slides.length;
    const hasBgImage = isContentSlide && !!contentBgImages[contentIdx];
    if (isContentSlide && !hasBgImage && !reelsMode) {
      try {
        return await renderContentSlideViaRemotion(content.slides[contentIdx], filename);
      } catch (err) {
        console.warn("[carousel] remotion render failed, using html-to-image", err);
        // fall through to the html-to-image path below
      }
    }

    // Wait for any <img> in the slide to finish loading first.
    const imgEls = Array.from(el.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(imgEls.map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); }),
    ));

    // Any slide with at least one <img> needs canvas compositing — html-to-image
    // drops <img> contents on mobile Safari (and unreliably on Android).
    if (imgEls.length > 0) {
      try {
        return await compositeWithImages(el, imgEls, filename, exportH);
      } catch (err) {
        console.warn("[carousel] composite failed, falling back to plain toPng", err);
        // fall through
      }
    }

    // Slides with no <img> (CTA, content slides without bg/graphic): plain toPng.
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
        for (let i = 0; i < slideCount; i++) files.push(await buildSlideFile(i));
        try {
          await navigator.share({ files, title: "Lunia carousel slides" });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          for (const f of files) await saveFile(f);
        }
      } else {
        for (let i = 0; i < slideCount; i++) {
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
          // When the carousel was loaded from the library (or we've already
          // saved it once this session), pass the existing id so the route
          // updates that record in place instead of duplicating it.
          ...(savedId ? { id: savedId } : {}),
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
          contentBgImages,
          contentBgOverlayOpacity,
          showLuniaLifeWatermark,
          imageStyle,
          format: carouselFormat,
          reelsMode,
          citationFontSize,
          headlineScale,
          bodyScale,
          iconScale,
          hookOverlays: isV2 ? hookOverlays : undefined,
          stylePreset,
          showSlideArrows,
          showSlideNumbers,
          showCitationBars,
        }),
      });
      if (!res.ok) return;
      const { id } = await res.json();
      setSavedId(id);
      // Brief "Saved!" flash on the button so the user knows the update landed.
      setSaveLabel("Saved!");
      setTimeout(() => setSaveLabel(null), 1600);
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

  // Read the graphic JSON for any slot — content slides at 0-2, the CTA at 3.
  function getSlotGraphic(slideIndex: number): string {
    if (slideIndex === 3) return content.cta?.graphic ?? "";
    return content.slides[slideIndex]?.graphic ?? "";
  }

  // Write back the graphic JSON to the right slot.
  function setSlotGraphic(slideIndex: number, graphic: string) {
    if (slideIndex === 3) {
      onContentChange({ ...config, content: { ...content, cta: { ...content.cta, graphic } } });
    } else {
      const slides = [...content.slides];
      slides[slideIndex] = { ...slides[slideIndex], graphic };
      onContentChange({ ...config, content: { ...content, slides } });
    }
  }

  function getSelectedIcons(slideIndex: number): string[] {
    try {
      const g = getSlotGraphic(slideIndex);
      if (!g) return [];
      const parsed = JSON.parse(g);
      if (parsed.component === "iconLayout") return parsed.data.icons.map((ic: { id: string }) => ic.id);
      if (parsed.component === "icon") return [parsed.data.id];
    } catch { /* ignore */ }
    return [];
  }

  // Defaults to true so existing carousels render with labels — matches v1 behavior.
  function getShowLabels(slideIndex: number): boolean {
    try {
      const g = getSlotGraphic(slideIndex);
      if (!g) return true;
      const parsed = JSON.parse(g);
      if (parsed.component === "iconLayout" && typeof parsed.data?.showLabels === "boolean") {
        return parsed.data.showLabels;
      }
    } catch { /* ignore */ }
    return true;
  }

  // Where the icon row sits within the editorial slide layout.
  //   "hug-body": icon block hugs the body copy (default, existing behaviour).
  //   "between" : icon block sits centred between the body text and the citation.
  type IconRowPosition = "hug-body" | "between";
  function getIconRowPosition(slideIndex: number): IconRowPosition {
    try {
      const g = getSlotGraphic(slideIndex);
      if (!g) return "hug-body";
      const parsed = JSON.parse(g);
      if (parsed.component === "iconLayout" && (parsed.data?.iconRowPosition === "between" || parsed.data?.iconRowPosition === "hug-body")) {
        return parsed.data.iconRowPosition;
      }
    } catch { /* ignore */ }
    return "hug-body";
  }

  function writeIconGraphic(
    slideIndex: number,
    ids: string[],
    layout: "row" | "column" | "grid" | "scattered",
    showLabels: boolean,
    iconRowPosition: IconRowPosition = "hug-body",
  ) {
    const graphic = ids.length === 0
      ? ""
      : JSON.stringify({ component: "iconLayout", data: { icons: ids.map((id) => ({ id })), layout, showLabels, iconRowPosition } });
    setSlotGraphic(slideIndex, graphic);
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
    writeIconGraphic(slideIndex, next, iconPickerLayout, getShowLabels(slideIndex), getIconRowPosition(slideIndex));
  }

  function applyIconLayout(slideIndex: number, layout: "row" | "column" | "grid" | "scattered") {
    setIconPickerLayout(layout);
    const current = getSelectedIcons(slideIndex);
    if (current.length === 0) return;
    writeIconGraphic(slideIndex, current, layout, getShowLabels(slideIndex), getIconRowPosition(slideIndex));
  }

  function toggleShowLabels(slideIndex: number) {
    const current = getSelectedIcons(slideIndex);
    if (current.length === 0) return;
    writeIconGraphic(slideIndex, current, iconPickerLayout, !getShowLabels(slideIndex), getIconRowPosition(slideIndex));
  }

  function setIconRowPosition(slideIndex: number, position: IconRowPosition) {
    const current = getSelectedIcons(slideIndex);
    if (current.length === 0) return;
    writeIconGraphic(slideIndex, current, iconPickerLayout, getShowLabels(slideIndex), position);
  }

  function clearSlideIcons(slideIndex: number) {
    setSlotGraphic(slideIndex, "");
  }

  async function handleSuggestIcons(slideIndex: number, opts?: { force?: boolean }) {
    if (suggestingIcons !== null) return;
    const slide = content.slides[slideIndex];
    if (!slide) return;
    setSuggestingIcons(slideIndex);
    try {
      const res = await fetch(`${apiBase}/suggest-icons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          headline: slide.headline,
          body: slide.body,
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.icons) && data.icons.length > 0) {
        const picks = data.icons.slice(0, 4) as string[];
        if (isV2) {
          // v2: hold suggestions un-applied — the slide only changes when the
          // user clicks "Use these" or an individual suggested chip.
          setIconSuggestions(picks);
        } else {
          // v1: auto-pick writes straight to the slide, label-free.
          writeIconGraphic(slideIndex, picks, iconPickerLayout, false);
        }
      } else if (!opts?.force) {
        // Silent failure on first-click auto-suggest; surface only if user explicitly clicked ✨.
      }
    } catch { /* ignore — first-click suggestion is best-effort */ }
    finally {
      setSuggestingIcons(null);
    }
  }

  function onIconButtonClick(slideIndex: number) {
    // Toggle the panel as today.
    const willOpen = iconPickerOpen !== slideIndex;
    setIconPickerOpen(willOpen ? slideIndex : null);
    // Auto-suggest only when (a) opening, (b) slide has no icons yet. Existing
    // manual picks are never overwritten without an explicit ✨ click.
    if (willOpen && getSelectedIcons(slideIndex).length === 0) {
      void handleSuggestIcons(slideIndex);
    }
  }

  // ─── v2 editor helpers ────────────────────────────────────────────────────
  // Open an inspector tool for the focused slide. Toggles closed if already open.
  function openInspector(mode: Exclude<InspectorMode, null>) {
    setInspectorMode((cur) => (cur === mode ? null : mode));
  }

  // Open the icon panel for a content slide (slideIndex 0-2). Never mutates the
  // slide — auto-fetches suggestions only when the slide has no icons yet.
  function openIconInspector() {
    const slideIndex = focusedSlide - 1;
    const willOpen = inspectorMode !== "icons";
    setInspectorMode(willOpen ? "icons" : null);
    if (willOpen && slideIndex >= 0 && slideIndex <= 2
        && getSelectedIcons(slideIndex).length === 0 && iconSuggestions.length === 0) {
      void handleSuggestIcons(slideIndex);
    }
  }

  // Focus a slide in the canvas. Clears stale icon suggestions and closes any
  // inspector panel that doesn't apply to the newly focused slide.
  function selectSlide(i: number) {
    setFocusedSlide(i);
    setIconSuggestions([]);
    setInspectorMode((cur) => {
      if (cur === null || cur === "settings") return cur;
      const isContent = i >= 1 && i <= 3;
      const isHook = i === 0;
      const isTakeaway = hasTakeaway && i === 4;
      if ((cur === "icons" || cur === "text" || cur === "graphicType"
        || cur === "graphicData" || cur === "graphicComment") && !isContent) return null;
      if ((cur === "overlays" || cur === "image") && !isHook) return null;
      if (cur === "takeaway" && !isTakeaway) return null;
      return cur;
    });
  }

  // Apply AI-suggested icons to the focused content slide (label-free, like v1
  // auto-pick). Used by the "Use these" button in the v2 icon inspector.
  function applyIconSuggestions(ids: string[]) {
    const slideIndex = focusedSlide - 1;
    if (slideIndex < 0 || slideIndex > 2) return;
    writeIconGraphic(slideIndex, ids.slice(0, 4), iconPickerLayout, false);
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

  // Swap a history entry into the current hook image slot. The displaced
  // current URL flows back to the top of history so the user can ping-pong.
  function revertToHookImage(url: string) {
    if (!url) return;
    const prevImages = config.slideImages ?? [null, null, null, null, null];
    const displaced = prevImages[0];
    const newImages = [...prevImages];
    newImages[0] = url;
    onContentChange({ ...config, slideImages: newImages as (string | null)[] });
    setHookImageHistory((prev) => {
      const filtered = prev.filter((u) => u && u !== url);
      const next = displaced && displaced !== url ? [displaced, ...filtered] : filtered;
      return next.slice(0, 8);
    });
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
            ...(moodId ? { moodId } : {}),
            ...(isEditorial ? { imageSubject } : {}),
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
        body: JSON.stringify({
          slideIndex: 0,
          topic: topic ?? "",
          hook,
          imagePrompt: finalPrompt,
          imageStyle,
          imageAspect: targetAspect,
          ...(moodId ? { moodId } : {}),
          ...(regenEngine === "gpt-image-2" ? { imageEngine: "gpt-image-2" } : {}),
          ...(isEditorial ? { stylePreset: "editorial-scientific" } : {}),
          ...(isEditorial && content.hookImageSpec ? { hookImageSpec: content.hookImageSpec } : {}),
          ...(isEditorial ? { imageDirection, paperTone, imageSubject } : {}),
          // If the user edited the full prompt in the "Edit hook-image prompt"
          // panel, send that verbatim — bypasses server-side assembly.
          ...(content.hookImagePromptOverride && content.hookImagePromptOverride.trim()
              ? { customPrompt: content.hookImagePromptOverride }
              : {}),
        }),
      });
      // Read as text first so Vercel gateway HTML (e.g. on timeout) doesn't crash JSON.parse.
      const imgText = await imgRes.text();
      let imgData: { url?: string; error?: string };
      try { imgData = JSON.parse(imgText); }
      catch {
        throw new Error(
          imgRes.status === 504 || /timeout|timed out/i.test(imgText)
            ? "Image generation timed out — GPT Image 2 sometimes takes 2-3 min. Try again or switch back to Auto."
            : `Server returned non-JSON (HTTP ${imgRes.status}): ${imgText.slice(0, 120)}`
        );
      }
      if (!imgRes.ok || imgData.error || !imgData.url) throw new Error(imgData.error ?? `Image generation failed (HTTP ${imgRes.status})`);

      // Capture the soon-to-be-replaced URL before swapping in the new one.
      // Pushed to history so the user can revert; de-duped + capped at 8.
      const prevImages = config.slideImages ?? [null, null, null, null, null];
      const displaced = prevImages[0];

      // Update slideImages[0] in config and track the aspect of the new image
      const newSlideImages = [...prevImages];
      newSlideImages[0] = imgData.url;
      setHookImageAspect(targetAspect);
      onContentChange({ ...config, slideImages: newSlideImages as (string | null)[], content: { ...config.content, imagePrompt: finalPrompt } });

      if (displaced && displaced !== imgData.url) {
        setHookImageHistory((prev) => {
          const next = [displaced, ...prev.filter((u) => u && u !== displaced && u !== imgData.url)];
          return next.slice(0, 8);
        });
      }
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
          ...(moodId ? { moodId } : {}),
          ...(isEditorial ? { imageSubject } : {}),
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
          ...(moodId ? { moodId } : {}),
          ...(isEditorial ? { imageSubject } : {}),
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

  async function handleGenerateContentBg(slideIndex: number) {
    if (slideIndex < 0 || slideIndex > 2) {
      setGraphicError(`bg: invalid slide index ${slideIndex}`);
      return;
    }
    const slide = content.slides[slideIndex];
    if (!slide) {
      setGraphicError(`bg: slide ${slideIndex + 1} not found in content (have ${content.slides.length} slides)`);
      return;
    }
    setContentBgGenerating(prev => { const next = new Set(prev); next.add(slideIndex); return next; });
    setGraphicError(null);
    const url = `${apiBase}/generate-slide-bg`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          headline: slide.headline,
          body: slide.body,
          slideBgColor,
          imageAspect: reelsMode ? "9:16" : "4:5",
          stylePreset,
          ...(isEditorial ? { paperTone } : {}),
        }),
      });
      // Capture the body as text first so we can surface useful errors even when the response isn't JSON (Vercel auth wall, framework 404 page, etc.).
      const raw = await res.text();
      type ApiResp = { url?: string; error?: string };
      let data: ApiResp | null = null;
      try { data = JSON.parse(raw) as ApiResp; } catch { /* not JSON */ }
      const successUrl = data?.url;
      if (!res.ok || !successUrl) {
        const detail = data?.error ?? raw.slice(0, 200) ?? "(empty response)";
        setGraphicError(`bg: ${res.status} from ${url} — ${detail}`);
        console.error("[generate-slide-bg] failed", { status: res.status, url, raw });
        return;
      }
      setContentBgImages(prev => {
        const next = [...prev];
        while (next.length < 3) next.push(null);
        next[slideIndex] = successUrl;
        // Sync to config so onContentChange persists across reloads + saves.
        onContentChange({ ...config, contentBgImages: next, contentBgOverlayOpacity });
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGraphicError(`bg: network error calling ${url} — ${msg}`);
      console.error("[generate-slide-bg] network", err);
    } finally {
      setContentBgGenerating(prev => { const next = new Set(prev); next.delete(slideIndex); return next; });
    }
  }

  function handleClearContentBg(slideIndex: number) {
    setContentBgImages(prev => {
      const next = [...prev];
      while (next.length < 3) next.push(null);
      next[slideIndex] = null;
      onContentChange({ ...config, contentBgImages: next, contentBgOverlayOpacity });
      return next;
    });
  }

  // ─── v2 inspector body renderer ───────────────────────────────────────────
  // Returns the docked panel's title + body for the current inspectorMode.
  // All tool panels live here so opening one never reflows the canvas.
  function getInspector(): { title: string; subtitle?: string; body: React.ReactNode } | null {
    if (!inspectorMode) return null;
    const slideIdx = focusedSlide - 1; // 0-2 when a content slide is focused

    // ── Settings ──────────────────────────────────────────────────────────
    if (inspectorMode === "settings") {
      const sizeRow = (label: string, vals: readonly number[], labels: string[], cur: number, set: (v: number) => void) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>{label}</span>
          {vals.map((s, idx) => (
            <button key={s} onClick={() => set(s)} style={{
              padding: "3px 8px", fontSize: 11, fontWeight: 700,
              background: cur === s ? "var(--text)" : "var(--surface)",
              color: cur === s ? "var(--bg)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
            }}>{labels[idx]}</button>
          ))}
        </div>
      );
      return {
        title: "Settings",
        body: (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Branding &amp; format</div>
            {sizeRow("Logo", [0.75, 1, 1.4, 1.8], ["S", "M", "L", "XL"], logoScale, setLogoScale)}
            {sizeRow("Arrows", [0.75, 1, 1.4, 1.8], ["S", "M", "L", "XL"], arrowScale, setArrowScale)}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Lunia Life</span>
              <button onClick={() => setShowLuniaLifeWatermark((v) => !v)} style={{
                padding: "3px 10px", fontSize: 11, fontWeight: 700,
                background: showLuniaLifeWatermark ? "var(--text)" : "var(--surface)",
                color: showLuniaLifeWatermark ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
              }}>{showLuniaLifeWatermark ? "On" : "Off"}</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Format</span>
              <button onClick={() => setReelsMode(false)} style={{
                padding: "3px 8px", fontSize: 11, fontWeight: 700,
                background: !reelsMode ? "var(--accent)" : "var(--surface)",
                color: !reelsMode ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
              }}>4:5</button>
              <button onClick={() => setReelsMode(true)} style={{
                padding: "3px 8px", fontSize: 11, fontWeight: 700,
                background: reelsMode ? "var(--accent)" : "var(--surface)",
                color: reelsMode ? "var(--bg)" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
              }}>9:16</button>
            </div>
            {/* Decoration toggles — hide arrows, slide numbers, or citation bars on any carousel. */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Decoration</div>
            {([
              { label: "Arrows", value: showSlideArrows, set: setShowSlideArrows },
              { label: "Numbers", value: showSlideNumbers, set: setShowSlideNumbers },
              { label: "Citations bar", value: showCitationBars, set: setShowCitationBars },
            ] as const).map((row) => (
              <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>{row.label}</span>
                <button onClick={() => row.set((v) => !v)} style={{
                  padding: "3px 10px", fontSize: 11, fontWeight: 700,
                  background: row.value ? "var(--text)" : "var(--surface)",
                  color: row.value ? "var(--bg)" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                }}>{row.value ? "Show" : "Hide"}</button>
              </div>
            ))}
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Text &amp; content</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Slides bg</span>
              {([{ label: "Dark", color: "#01253f" }, { label: "Light", color: "#F7F4EF" }] as const).map(({ label, color }) => {
                const active = slideBgColor?.toLowerCase() === color.toLowerCase();
                return (
                  <button key={color} onClick={() => { setSlideBgColor(color); setDarkBackground(color === "#F7F4EF"); }} style={{
                    padding: "3px 8px", fontSize: 11, fontWeight: 700,
                    background: active ? "var(--text)" : "var(--surface)",
                    color: active ? "var(--bg)" : "var(--muted)",
                    border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, border: "1px solid rgba(0,0,0,0.15)" }} />
                    {label}
                  </button>
                );
              })}
              <label style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer" }}>
                <input type="color" value={slideBgColor ?? "#01253f"} onChange={(e) => { const c = e.target.value; setSlideBgColor(c); setDarkBackground(c.toLowerCase() === "#f7f4ef"); }} style={{ width: 18, height: 18, padding: 0, border: "none", background: "transparent", cursor: "pointer" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>Custom</span>
              </label>
              {slideBgColor !== undefined && (
                <button onClick={() => setSlideBgColor(undefined)} style={{ padding: "3px 8px", fontSize: 11, fontWeight: 600, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit" }}>×</button>
              )}
            </div>
            {contentBgImages.some((u) => !!u) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Bg dim</span>
                <input type="range" min={0} max={0.9} step={0.05} value={contentBgOverlayOpacity} onChange={(e) => setContentBgOverlayOpacity(parseFloat(e.target.value))} style={{ width: 110 }} />
                <span style={{ fontSize: 10, color: "var(--muted)", minWidth: 28, textAlign: "right" }}>{Math.round(contentBgOverlayOpacity * 100)}%</span>
              </div>
            )}
            {sizeRow("Citation", [18, 26, 36, 48], ["S", "M", "L", "XL"], citationFontSize, setCitationFontSize)}
            {sizeRow("Headline", [0.85, 1, 1.15, 1.3], ["S", "M", "L", "XL"], headlineScale, setHeadlineScale)}
            {sizeRow("Body", [0.85, 1, 1.2, 1.5, 1.85, 2.25], ["S", "M", "L", "XL", "2XL", "3XL"], bodyScale, setBodyScale)}
            {/* Icon size — only bites on slides whose graphic is an icon layout. */}
            {sizeRow("Icons", [0.75, 1, 1.3, 1.6], ["S", "M", "L", "XL"], iconScale, setIconScale)}
          </div>
        ),
      };
    }

    // ── Text editor (content slides) ──────────────────────────────────────
    if (inspectorMode === "text") {
      const slide = content.slides[slideIdx];
      if (!slide) return null;
      return {
        title: `${slideLabels[focusedSlide]} text`,
        body: (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Headline</label>
            <input
              type="text"
              value={slide.headline}
              onChange={(e) => updateSlideField(slideIdx, "headline", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.4, fontFamily: "inherit", color: "var(--text)", padding: "7px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)", marginBottom: 12 }}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Main text</label>
            <textarea
              value={slide.body}
              onChange={(e) => updateSlideField(slideIdx, "body", e.target.value)}
              rows={6}
              style={{ width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit", color: "var(--text)", padding: "7px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)" }}
            />
          </div>
        ),
      };
    }

    // ── Takeaway editor (payoff slide) ────────────────────────────────────
    if (inspectorMode === "takeaway") {
      const takeaway = content.takeaway;
      if (!takeaway) return null;
      const points = takeaway.points;
      const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.4, fontFamily: "inherit", color: "var(--text)", padding: "7px 10px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)" };
      const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };
      const miniBtn: React.CSSProperties = { padding: "2px 7px", fontSize: 11, fontWeight: 700, background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", lineHeight: 1.4 };

      const setPoints = (next: string[]) => updateTakeaway({ points: next });
      const updatePoint = (i: number, value: string) => setPoints(points.map((p, idx) => (idx === i ? value : p)));
      const removePoint = (i: number) => setPoints(points.filter((_, idx) => idx !== i));
      const movePoint = (i: number, dir: -1 | 1) => {
        const j = i + dir;
        if (j < 0 || j >= points.length) return;
        const next = [...points];
        [next[i], next[j]] = [next[j], next[i]];
        setPoints(next);
      };
      const addPoint = () => setPoints([...points, ""]);

      const INTERACTION_OPTS: { value: "save" | "send" | "comment"; label: string }[] = [
        { value: "save", label: "Save" },
        { value: "send", label: "Send" },
        { value: "comment", label: "Comment" },
      ];

      return {
        title: `${slideLabels[focusedSlide]} text`,
        body: (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Headline</label>
              <input
                type="text"
                value={takeaway.headline}
                onChange={(e) => updateTakeaway({ headline: e.target.value })}
                style={fieldStyle}
              />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Recap points</label>
                <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 600 }}>{points.length}/3</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {points.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ flexShrink: 0, width: 18, fontSize: 11, fontWeight: 700, color: "var(--muted)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => updatePoint(i, e.target.value)}
                      style={{ ...fieldStyle, flex: 1 }}
                    />
                    <button onClick={() => movePoint(i, -1)} disabled={i === 0} title="Move up" style={{ ...miniBtn, opacity: i === 0 ? 0.4 : 1, cursor: i === 0 ? "not-allowed" : "pointer" }}>↑</button>
                    <button onClick={() => movePoint(i, 1)} disabled={i === points.length - 1} title="Move down" style={{ ...miniBtn, opacity: i === points.length - 1 ? 0.4 : 1, cursor: i === points.length - 1 ? "not-allowed" : "pointer" }}>↓</button>
                    <button onClick={() => removePoint(i)} disabled={points.length <= 1} title="Remove" style={{ ...miniBtn, color: "var(--error)", opacity: points.length <= 1 ? 0.4 : 1, cursor: points.length <= 1 ? "not-allowed" : "pointer" }}>×</button>
                  </div>
                ))}
              </div>
              {points.length < 3 && (
                <button onClick={addPoint} style={{ ...miniBtn, marginTop: 8, padding: "4px 10px" }}>+ Add point</button>
              )}
            </div>

            <div>
              <label style={labelStyle}>Interaction</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={takeaway.interaction.type}
                  onChange={(e) => updateTakeaway({ interaction: { ...takeaway.interaction, type: e.target.value as "save" | "send" | "comment" } })}
                  style={{ ...fieldStyle, width: "auto", flexShrink: 0, cursor: "pointer" }}
                >
                  {INTERACTION_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={takeaway.interaction.label}
                  onChange={(e) => updateTakeaway({ interaction: { ...takeaway.interaction, label: e.target.value } })}
                  placeholder="Interaction label"
                  style={{ ...fieldStyle, flex: 1 }}
                />
              </div>
            </div>
          </div>
        ),
      };
    }

    // ── Icon picker (non-destructive suggestions) ─────────────────────────
    if (inspectorMode === "icons") {
      const selected = getSelectedIcons(slideIdx);
      const showLabels = getShowLabels(slideIdx);
      const loadingSuggestions = suggestingIcons === slideIdx;
      const iconById = (id: string) => CAROUSEL_ICONS.find((ic) => ic.id === id);
      return {
        title: `${slideLabels[focusedSlide]} icons`,
        subtitle: `${selected.length}/4 selected`,
        body: (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Suggestions row — un-applied until the user acts */}
            <div style={{ border: "1px dashed var(--accent-mid)", borderRadius: 6, padding: "8px 10px", background: "var(--accent-dim)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI suggestions</span>
                <button
                  onClick={() => handleSuggestIcons(slideIdx, { force: true })}
                  disabled={loadingSuggestions}
                  style={{ background: "transparent", border: "1px solid var(--accent-mid)", borderRadius: 3, fontSize: 9, color: "var(--accent)", cursor: loadingSuggestions ? "not-allowed" : "pointer", fontFamily: "inherit", padding: "1px 6px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                  {loadingSuggestions ? "Picking…" : "Suggest 3"}
                </button>
              </div>
              {loadingSuggestions ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0" }}>
                  <span style={{ display: "inline-block", width: 11, height: 11, border: "2px solid var(--accent-mid)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Claude is picking icons…</span>
                </div>
              ) : iconSuggestions.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {iconSuggestions.map((id) => {
                      const ic = iconById(id);
                      if (!ic) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => toggleSlideIcon(slideIdx, id)}
                          title={`Add ${ic.label}`}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 8px", border: "1px dashed var(--accent-mid)", borderRadius: 6, background: "var(--bg)", cursor: "pointer" }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }} dangerouslySetInnerHTML={{ __html: ic.svg }} />
                          <span style={{ fontSize: 8, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{ic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => applyIconSuggestions(iconSuggestions)}
                    style={{ width: "100%", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 5, padding: "6px 0", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase" }}
                  >
                    Use these {iconSuggestions.length} icons
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>No suggestions yet — tap “Suggest 3”.</span>
              )}
            </div>

            {/* Current selection controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {selected.length > 0 && (
                <button
                  onClick={() => toggleShowLabels(slideIdx)}
                  style={{ background: showLabels ? "var(--accent-dim)" : "transparent", border: `1px solid ${showLabels ? "var(--accent-mid)" : "var(--border)"}`, borderRadius: 3, fontSize: 9, color: showLabels ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "2px 7px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                >
                  Labels {showLabels ? "On" : "Off"}
                </button>
              )}
              {selected.length > 0 && (() => {
                const pos = getIconRowPosition(slideIdx);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.04em", textTransform: "uppercase", padding: "2px 7px", borderRight: "1px solid var(--border)" }}>Position</span>
                    <button
                      onClick={() => setIconRowPosition(slideIdx, "hug-body")}
                      title="Icon row hugs the body text (default)"
                      style={{ background: pos === "hug-body" ? "var(--accent-dim)" : "transparent", border: "none", borderRight: "1px solid var(--border)", fontSize: 9, color: pos === "hug-body" ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "2px 7px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                    >
                      Hug body
                    </button>
                    <button
                      onClick={() => setIconRowPosition(slideIdx, "between")}
                      title="Icon row centred between body text and citation"
                      style={{ background: pos === "between" ? "var(--accent-dim)" : "transparent", border: "none", fontSize: 9, color: pos === "between" ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "2px 7px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                    >
                      Centered
                    </button>
                  </div>
                );
              })()}
              {selected.length > 0 && (
                <button onClick={() => clearSlideIcons(slideIdx)} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 3, fontSize: 9, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "2px 7px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Clear</button>
              )}
            </div>

            {/* Layout picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Layout</span>
              {(["row", "column", "grid", "scattered"] as const).map((lyt) => (
                <button key={lyt} onClick={() => applyIconLayout(slideIdx, lyt)} style={{
                  padding: "2px 7px", fontSize: 9, fontWeight: 700,
                  background: iconPickerLayout === lyt ? "var(--accent)" : "var(--bg)",
                  color: iconPickerLayout === lyt ? "#fff" : "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.04em",
                }}>{lyt}</button>
              ))}
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              {(["sleep", "health", "lifestyle", "fitness", "mind", "daily"] as IconCategory[]).map((cat) => (
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, maxHeight: 240, overflowY: "auto" }}>
              {CAROUSEL_ICONS.filter((ic) => ic.category === iconPickerCategory).map((ic) => {
                const isSelected = selected.includes(ic.id);
                const atMax = selected.length >= 4 && !isSelected;
                return (
                  <button key={ic.id} onClick={() => toggleSlideIcon(slideIdx, ic.id)} title={ic.label} disabled={atMax} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "7px 4px",
                    border: isSelected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
                    borderRadius: 6, background: isSelected ? "var(--accent-dim)" : "transparent",
                    cursor: atMax ? "not-allowed" : "pointer", opacity: atMax ? 0.35 : 1,
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={isSelected ? "var(--accent)" : "var(--muted)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }} dangerouslySetInnerHTML={{ __html: ic.svg }} />
                    <span style={{ fontSize: 8, color: isSelected ? "var(--accent)" : "var(--subtle)", textAlign: "center", lineHeight: 1.2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{ic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ),
      };
    }

    // ── Graphic type picker ───────────────────────────────────────────────
    if (inspectorMode === "graphicType") {
      const slide = content.slides[slideIdx];
      if (!slide) return null;
      let currentComp: string | undefined;
      try { currentComp = JSON.parse(slide.graphic ?? "{}").component; } catch {}
      const atLimit = (graphicRegenCount[slideIdx] ?? 0) >= GRAPHIC_REGEN_LIMIT;
      return {
        title: `${slideLabels[focusedSlide]} graphic type`,
        body: (
          <PanelErrorBoundary label="Graphic type picker" onClose={() => setInspectorMode(null)}>
            <GraphicTypePicker
              currentComponent={currentComp}
              brandStyle={bs}
              busy={regeneratingGraphic === slideIdx || atLimit}
              onClose={() => setInspectorMode(null)}
              onPick={(componentKey) => {
                if (atLimit) {
                  setGraphicError(`Regeneration limit reached for this slide (${GRAPHIC_REGEN_LIMIT}/session). Reload the page to reset.`);
                  return;
                }
                handleRegenerateGraphic(slideIdx, "", componentKey);
                setInspectorMode(null);
              }}
            />
          </PanelErrorBoundary>
        ),
      };
    }

    // ── Graphic data editor ───────────────────────────────────────────────
    if (inspectorMode === "graphicData") {
      const slide = content.slides[slideIdx];
      if (!slide) return null;
      return {
        title: `${slideLabels[focusedSlide]} graphic data`,
        body: (
          <PanelErrorBoundary label="Graphic data editor" onClose={() => setInspectorMode(null)}>
            <GraphicDataEditor
              graphicJson={slide.graphic ?? ""}
              onClose={() => setInspectorMode(null)}
              onSave={(newJson) => {
                const slides = [...content.slides];
                slides[slideIdx] = { ...slides[slideIdx], graphic: newJson };
                onContentChange({ ...config, content: { ...content, slides } });
              }}
            />
          </PanelErrorBoundary>
        ),
      };
    }

    // ── Graphic regeneration comment ──────────────────────────────────────
    if (inspectorMode === "graphicComment") {
      const slide = content.slides[slideIdx];
      if (!slide) return null;
      const used = graphicRegenCount[slideIdx] ?? 0;
      const draft = graphicComment[slideIdx] ?? "";
      const isBusy = regeneratingGraphic === slideIdx;
      const atLimit = used >= GRAPHIC_REGEN_LIMIT;
      return {
        title: `Regenerate graphic`,
        subtitle: `${used}/${GRAPHIC_REGEN_LIMIT} used this session`,
        body: (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setGraphicComment((prev) => ({ ...prev, [slideIdx]: e.target.value.slice(0, 400) }))}
              placeholder="Optional — what to change? e.g. 'use minutes not hours', 'make this a vertical comparison'"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 12, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 6, resize: "vertical" }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{draft.trim() ? `${draft.trim().length}/400` : "Empty = fresh variation"}</span>
              <button
                onClick={() => handleRegenerateGraphic(slideIdx, draft)}
                disabled={isBusy || atLimit}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: (isBusy || atLimit) ? "not-allowed" : "pointer", opacity: (isBusy || atLimit) ? 0.6 : 1 }}
              >
                {isBusy ? "Generating…" : atLimit ? "Limit reached" : (draft.trim() ? "Regenerate with comment" : "Regenerate")}
              </button>
            </div>
          </div>
        ),
      };
    }

    // ── Hook overlays ─────────────────────────────────────────────────────
    if (inspectorMode === "overlays") {
      const wash = hookOverlays.backgroundWash ?? WASH_SEED;
      const setWash = (patch: Partial<BackgroundWash>) =>
        setHookOverlays((s) => ({ ...s, backgroundWash: { ...(s.backgroundWash ?? WASH_SEED), ...patch } }));
      return {
        title: "Hook overlays",
        subtitle: "Layered effects on the hook image — live + in export.",
        body: (
          <div style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => setHookOverlays({
                ...DEFAULT_HOOK_OVERLAYS,
                frame: { ...DEFAULT_HOOK_OVERLAYS.frame, color: config.brandStyle?.accent ?? DEFAULT_HOOK_OVERLAYS.frame.color },
              })}
              style={{ alignSelf: "flex-start", background: "transparent", border: "1px solid var(--border)", borderRadius: 5, fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "4px 8px", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}
            >
              Reset
            </button>
            <OverlayRow compact label="Editorial frame" hint="Thin inset border" enabled={hookOverlays.frame.enabled} onToggle={(v) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, enabled: v } }))}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="color" value={hookOverlays.frame.color} onChange={(e) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, color: e.target.value } }))} style={{ width: 28, height: 22, border: "1px solid var(--border)", borderRadius: 4, padding: 0, background: "transparent", cursor: "pointer" }} />
                <SliderControl label="Opacity" min={0} max={1} step={0.05} value={hookOverlays.frame.opacity} onChange={(v) => setHookOverlays((s) => ({ ...s, frame: { ...s.frame, opacity: v } }))} />
              </div>
            </OverlayRow>
            <OverlayRow compact label="Soft vignette" hint="Darkens corners" enabled={hookOverlays.vignette.enabled} onToggle={(v) => setHookOverlays((s) => ({ ...s, vignette: { ...s.vignette, enabled: v } }))}>
              <SliderControl label="Strength" min={0} max={0.6} step={0.05} value={hookOverlays.vignette.intensity} onChange={(v) => setHookOverlays((s) => ({ ...s, vignette: { ...s.vignette, intensity: v } }))} />
            </OverlayRow>
            <OverlayRow compact label="Color grade" hint="Editorial polish" enabled={hookOverlays.colorGrade.enabled} onToggle={(v) => setHookOverlays((s) => ({ ...s, colorGrade: { ...s.colorGrade, enabled: v } }))}>
              <SliderControl label="Strength" min={0} max={2} step={0.1} value={hookOverlays.colorGrade.intensity} onChange={(v) => setHookOverlays((s) => ({ ...s, colorGrade: { ...s.colorGrade, intensity: v } }))} />
            </OverlayRow>
            <OverlayRow compact label="Film grain" hint="Subtle noise" enabled={hookOverlays.grain.enabled} onToggle={(v) => setHookOverlays((s) => ({ ...s, grain: { ...s.grain, enabled: v } }))}>
              <SliderControl label="Opacity" min={0} max={0.2} step={0.01} value={hookOverlays.grain.opacity} onChange={(v) => setHookOverlays((s) => ({ ...s, grain: { ...s.grain, opacity: v } }))} />
            </OverlayRow>
            <div style={{ display: "grid", gap: 10, padding: "8px 0", borderTop: "1px dashed var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Background wash</span>
                <Segmented label="Mode" value={wash.mode} options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "none", label: "None" }]} onChange={(mode) => setWash({ mode })} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", opacity: wash.mode === "none" ? 0.5 : 1, pointerEvents: wash.mode === "none" ? "none" : "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: wash.mode === "light" ? 1 : 0.4 }}>
                  <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Color</label>
                  <input type="color" value={wash.color} disabled={wash.mode !== "light"} onChange={(e) => setWash({ color: e.target.value })} style={{ width: 28, height: 22, border: "1px solid var(--border)", borderRadius: 4, padding: 0, background: "transparent", cursor: wash.mode === "light" ? "pointer" : "not-allowed" }} />
                </div>
                <SliderControl label="Opacity" min={0} max={1} step={0.05} value={wash.opacity} onChange={(v) => setWash({ opacity: v })} />
                <Segmented label="Style" value={wash.gradient ? "gradient" : "flat"} options={[{ value: "flat", label: "Flat" }, { value: "gradient", label: "Gradient" }]} onChange={(v) => setWash({ gradient: v === "gradient" })} />
              </div>
            </div>
          </div>
        ),
      };
    }

    // ── Hook image refine ─────────────────────────────────────────────────
    if (inspectorMode === "image") {
      return {
        title: "Refine hook image",
        subtitle: "Edit the prompt or add guidelines — Claude rewrites it, then regenerates.",
        body: (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</span>
              {IMAGE_STYLE_CHIPS.map((chip) => {
                const active = imageStyle === chip.value;
                return (
                  <button key={chip.value} onClick={() => setImageStyle(chip.value)} style={{
                    padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)",
                    fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                  }}>{chip.label}</button>
                );
              })}
            </div>
            {/* Full prompt sent to engine — what fal/gpt will actually receive,
                including framework chrome (palette, fonts, refs). Edit to override. */}
            <div style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <button
                onClick={() => setFullPromptOpen((v) => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                <span>Full prompt sent to engine{content.hookImagePromptOverride ? " (edited)" : ""}</span>
                <span style={{ color: "var(--muted)" }}>{fullPromptOpen ? "▾" : "▸"}</span>
              </button>
              {fullPromptOpen && (
                <div style={{ padding: "0 10px 10px" }}>
                  {fullPromptLoading && !fullPromptOverride && !fullPromptPreview && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0 8px" }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Loading current prompt…</span>
                    </div>
                  )}
                  {fullPromptError && <div style={{ fontSize: 11, color: "var(--error)", marginBottom: 6 }}>{fullPromptError}</div>}
                  <textarea
                    value={fullPromptOverride || fullPromptPreview}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFullPromptOverride(v);
                      // Persist override (or clear it when the user empties the box).
                      onContentChange({ ...config, content: { ...config.content, hookImagePromptOverride: v.trim() ? v : undefined } });
                    }}
                    rows={10}
                    placeholder="Server-assembled prompt will appear here. Edit to override."
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 11, lineHeight: 1.5, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text)", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, color: "var(--muted)" }}>
                    <span>{content.hookImagePromptOverride ? "Override is active — sent verbatim on next regen." : "Showing server default — edit to override."}</span>
                    {content.hookImagePromptOverride && (
                      <button
                        onClick={() => {
                          setFullPromptOverride("");
                          onContentChange({ ...config, content: { ...config.content, hookImagePromptOverride: undefined } });
                        }}
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Current prompt</label>
            <textarea
              value={currentImagePrompt}
              onChange={(e) => setImagePromptDraft(e.target.value)}
              rows={4}
              placeholder="No prompt yet — add guidelines below to generate one."
              style={{ width: "100%", boxSizing: "border-box", fontSize: 12, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit", color: currentImagePrompt ? "var(--text)" : "var(--subtle)", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)", marginBottom: 12 }}
            />
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Guidelines (optional)</label>
            <textarea
              value={imageGuidelines}
              onChange={(e) => setImageGuidelines(e.target.value)}
              rows={2}
              placeholder="e.g. warmer tones, ocean waves, more minimal…"
              style={{ width: "100%", boxSizing: "border-box", fontSize: 12, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit", color: "var(--text)", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)", marginBottom: 12 }}
            />
            {(fetchingSuggestions || suggestedPrompts.length > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  {fetchingSuggestions ? "Loading suggestions…" : "Suggested concepts — click to use"}
                </div>
                {fetchingSuggestions ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Generating fresh directions…</span>
                  </div>
                ) : suggestedPrompts.map((s, i) => (
                  <div key={i} onClick={() => { setImagePromptDraft(s); onContentChange({ ...config, content: { ...config.content, imagePrompt: s } }); }} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12, color: "var(--text)", lineHeight: 1.5, cursor: "pointer", display: "flex", gap: 8 }} title="Click to use this prompt">
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 4, padding: "2px 5px", flexShrink: 0, height: "fit-content" }}>{i === 0 ? "A" : "B"}</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Model</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([{ value: "auto", label: "Auto (Recraft)" }, { value: "gpt-image-2", label: "GPT Image 2" }] as const).map((opt) => {
                const active = regenEngine === opt.value;
                return (
                  <button key={opt.value} onClick={() => setRegenEngine(opt.value)} style={{
                    padding: "4px 10px", borderRadius: 20,
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-dim)" : "transparent",
                    color: active ? "var(--accent)" : "var(--muted)",
                    fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                  }}>{opt.label}</button>
                );
              })}
            </div>
            {isEditorial && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Direction</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {([
                    { value: "auto",          label: "Auto" },
                    { value: "macro",         label: "Macro" },
                    { value: "environmental", label: "Environmental" },
                    { value: "abstract",      label: "Abstract" },
                    { value: "symbolic",      label: "Symbolic" },
                    { value: "natural",       label: "Natural" },
                  ] as const).map((opt) => {
                    const active = imageDirection === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setImageDirection(opt.value)} style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Subject</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {([
                    { value: "auto",        label: "Auto" },
                    { value: "person",      label: "Person" },
                    { value: "still-life",  label: "Still life" },
                    { value: "environment", label: "Environment" },
                  ] as const).map((opt) => {
                    const active = imageSubject === opt.value;
                    return (
                      <button key={opt.value} onClick={() => { setImageSubject(opt.value); setSuggestedPrompts([]); }} style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Paper tone</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {([
                    { value: "white", label: "White ivory", swatch: "#EFEFF4" },
                    { value: "warm",  label: "Warm ivory",  swatch: "#EFE1C8" },
                  ] as const).map((opt) => {
                    const active = paperTone === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setPaperTone(opt.value)} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: opt.swatch, border: "1px solid var(--border)" }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* Previous hook images — click any thumb to revert. Session-only. */}
            {hookImageHistory.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Previous images — click to revert
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {hookImageHistory.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      onClick={() => revertToHookImage(url)}
                      title={`Revert to image ${i + 1}`}
                      style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", overflow: "hidden", lineHeight: 0, width: 56, height: 70 }}
                    >
                      <img
                        src={proxyUrl(url)}
                        alt={`Previous hook image ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {imageRegenError && <p style={{ fontSize: 12, color: "var(--error)", margin: "0 0 8px" }}>{imageRegenError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleRegeneratePromptOnly}
                disabled={regeneratingPrompt || regeneratingImage}
                style={{ background: "var(--surface)", color: (regeneratingPrompt || regeneratingImage) ? "var(--subtle)" : "var(--text)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 14px", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: (regeneratingPrompt || regeneratingImage) ? "not-allowed" : "pointer" }}
              >
                {regeneratingPrompt ? "Generating…" : "↺ 3 directions"}
              </button>
              <button
                onClick={handleRegenerateHookImage}
                disabled={regeneratingImage || regeneratingPrompt}
                style={{ flex: 1, background: (regeneratingImage || regeneratingPrompt) ? "var(--border)" : "var(--accent)", color: (regeneratingImage || regeneratingPrompt) ? "var(--muted)" : "#fff", border: "none", borderRadius: 6, padding: "9px 16px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: (regeneratingImage || regeneratingPrompt) ? "not-allowed" : "pointer" }}
              >
                {regeneratingImage ? "Generating…" : "↺ New image"}
              </button>
            </div>
            {promptAlternatives.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>More directions — click to use</div>
                {promptAlternatives.map((alt, i) => (
                  <div key={i} onClick={() => { setImagePromptDraft(alt); onContentChange({ ...config, content: { ...config.content, imagePrompt: alt } }); }} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12, color: "var(--text)", lineHeight: 1.5, cursor: "pointer", display: "flex", gap: 8 }} title="Click to use this prompt">
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 4, padding: "2px 5px", flexShrink: 0, height: "fit-content" }}>{i + 2}</span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      };
    }

    return null;
  }

  // fal.ai images: hook (imgs[0]) + editorial background images on content slides (imgs[1-3]).
  // CTA slide stays clean — brand colors only.
  const slideNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]} shimmer={imgs[0] === null}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} overlays={isV2 ? hookOverlays : undefined} reels={reelsMode} />,
    <ContentSlideComponent key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={contentBgImages[0] ?? undefined} bgImageShimmer={contentBgGenerating.has(0)} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    <ContentSlideComponent key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={contentBgImages[1] ?? undefined} bgImageShimmer={contentBgGenerating.has(1)} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    <ContentSlideComponent key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={contentBgImages[2] ?? undefined} bgImageShimmer={contentBgGenerating.has(2)} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    ...(hasTakeaway && content.takeaway
      ? [<TakeawaySlide key="takeaway" headline={content.takeaway.headline} points={content.takeaway.points} interaction={content.takeaway.interaction} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} reels={reelsMode} />]
      : []),
    carouselFormat === "engagement" && content.commentKeyword
      ? <CommentCTASlide key="cta" headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />
      : <CTASlide key="cta" headline={content.cta.headline} followLine={content.cta.followLine} graphic={content.cta.graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />,
  ];

  // Export nodes use proxied URLs so html-to-image canvas export works (avoids CORS taint)
  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} overlays={isV2 ? hookOverlays : undefined} reels={reelsMode} />,
    <ContentSlideComponent key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={proxyUrl(contentBgImages[0])} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    <ContentSlideComponent key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={proxyUrl(contentBgImages[1])} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    <ContentSlideComponent key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={proxyUrl(contentBgImages[2])} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />,
    ...(hasTakeaway && content.takeaway
      ? [<TakeawaySlide key="takeaway" headline={content.takeaway.headline} points={content.takeaway.points} interaction={content.takeaway.interaction} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} reels={reelsMode} />]
      : []),
    carouselFormat === "engagement" && content.commentKeyword
      ? <CommentCTASlide key="cta" headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />
      : <CTASlide key="cta" headline={content.cta.headline} followLine={content.cta.followLine} graphic={content.cta.graphic} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />,
  ];

  const slideW = Math.round(1080 * PREVIEW_SCALE);
  const slideH = Math.round((reelsMode ? 1920 : 1350) * PREVIEW_SCALE);
  const inspector = isV2 ? getInspector() : null;

  // v2 editor: track the editor's own width (changes only on window resize),
  // then derive the canvas column width arithmetically so the focused slide
  // scales to fit even as the inspector docks in and out.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const measure = () => { const w = el.clientWidth; if (w > 0) setEditorW(w); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isV2, viewMode]);

  const RAIL_COL = 112;
  const editorGap = inspector ? 16 : 12;
  const canvasColW = editorW > 0
    ? Math.max(200, editorW - RAIL_COL - (inspector ? 320 : 0) - editorGap * 2)
    : slideW;
  const canvasScale = Math.min(1, canvasColW / slideW);

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Your carousel
          </h2>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {topic} · {slideCount} slides
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn-ghost" onClick={handleSave} disabled={saving} title={savedId ? "Update the saved carousel" : "Save this carousel to the library"}>
            {saving ? (savedId ? "Updating…" : "Saving…") : (saveLabel ?? (savedId ? "Update" : "Save"))}
          </button>
          {savedId && (
            <button className="btn-ghost" onClick={handleCopyShareLink}>
              {copyLabel}
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
              `↓ Download all (${slideCount} PNGs)`
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

      {/* ─── v1 layout (strip view + inline panels) ─────────────────────── */}
      {!isV2 && (<>
      {/* Slide controls — collapsible, grouped */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, marginBottom: 14, overflow: "hidden" }}>
        <button
          onClick={() => setControlsOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)", border: "none", padding: "9px 14px",
            fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase",
            letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <span>Slide controls{!controlsOpen && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: "normal", color: "var(--muted)", marginLeft: 8 }}>— collapsed</span>}</span>
          <span style={{ fontSize: 15, lineHeight: 1, transform: controlsOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>›</span>
        </button>
        {controlsOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
        <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Branding &amp; format</div>
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
        </div>
        <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Text &amp; content</div>
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
                  color: "var(--muted)",
                  border: "1px solid var(--border)", borderRadius: 5,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                ×
              </button>
            )}
          </div>
          {/* AI bg image overlay opacity — only visible when at least one content slide has a bg image */}
          {contentBgImages.some((u) => !!u) && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Bg dim</span>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={contentBgOverlayOpacity}
                onChange={(e) => setContentBgOverlayOpacity(parseFloat(e.target.value))}
                title={`Overlay opacity ${Math.round(contentBgOverlayOpacity * 100)}% (lower = image more visible)`}
                style={{ width: 90 }}
              />
              <span style={{ fontSize: 10, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>
                {Math.round(contentBgOverlayOpacity * 100)}%
              </span>
            </div>
          )}
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
        </div>
        )}
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
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>View</span>
            {(["editor", "feed"] as const).map((mode) => {
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
                  {mode === "editor" ? "Editor" : (reelsMode ? "TikTok feed" : "IG feed")}
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
      {!isV2 && (
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingTop: 8, paddingBottom: 16, scrollSnapType: "x mandatory", position: "sticky", top: 0, background: "var(--bg)", zIndex: 5 }}>
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
                  {slideLabels[i]}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {i + 1}/{slideCount}
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
                      onClick={(e) => { e.stopPropagation(); onIconButtonClick(i - 1); }}
                      disabled={suggestingIcons === i - 1}
                      title={getSelectedIcons(i - 1).length === 0 ? "Pick an icon graphic — AI suggests 3 on open" : "Pick an icon graphic"}
                      style={{
                        background: iconPickerOpen === i - 1 ? "var(--accent-dim)" : "var(--surface)",
                        color: iconPickerOpen === i - 1 ? "var(--accent)" : "var(--muted)",
                        border: `1px solid ${iconPickerOpen === i - 1 ? "var(--accent-mid)" : "var(--border)"}`,
                        borderRadius: 6,
                        padding: "7px 10px",
                        fontSize: 11,
                        fontFamily: "inherit",
                        cursor: suggestingIcons === i - 1 ? "not-allowed" : "pointer",
                        opacity: suggestingIcons === i - 1 ? 0.6 : 1,
                        transition: "background 0.15s",
                        letterSpacing: "0.01em",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {suggestingIcons === i - 1 ? "🔷 …" : "🔷 icon"}
                    </button>
                    {isV2 && (() => {
                      const slideIdx = i - 1;
                      const generating = contentBgGenerating.has(slideIdx);
                      const hasBg = !!contentBgImages[slideIdx];
                      return (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleGenerateContentBg(slideIdx); }}
                            disabled={generating}
                            title={hasBg ? "Regenerate AI background" : "Generate an AI background image for this slide"}
                            style={{
                              background: hasBg ? "var(--accent-dim)" : "var(--surface)",
                              color: hasBg ? "var(--accent)" : "var(--muted)",
                              border: `1px solid ${hasBg ? "var(--accent-mid)" : "var(--border)"}`,
                              borderRadius: 6,
                              padding: "7px 10px",
                              fontSize: 11,
                              fontFamily: "inherit",
                              cursor: generating ? "not-allowed" : "pointer",
                              opacity: generating ? 0.5 : 1,
                              transition: "background 0.15s",
                              letterSpacing: "0.01em",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {generating ? "🌄 …" : hasBg ? "🌄 ↺ bg" : "🌄 bg"}
                          </button>
                          {hasBg && !generating && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleClearContentBg(slideIdx); }}
                              title="Remove AI background"
                              style={{
                                background: "transparent",
                                color: "var(--muted)",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "7px 10px",
                                fontSize: 11,
                                fontFamily: "inherit",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              ×
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

            {/* Icon picker panel — expands below the slide when 🔷 icon is active */}
            {i >= 1 && i <= 3 && iconPickerOpen === i - 1 && (
              <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Icons</span>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{getSelectedIcons(i - 1).length}/4</span>
                    <button
                      onClick={() => handleSuggestIcons(i - 1, { force: true })}
                      disabled={suggestingIcons === i - 1}
                      title="Let Claude pick 3 icons that fit this slide"
                      style={{ background: "transparent", border: "1px solid var(--accent-mid)", borderRadius: 3, fontSize: 9, color: "var(--accent)", cursor: suggestingIcons === i - 1 ? "not-allowed" : "pointer", fontFamily: "inherit", padding: "1px 6px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                    >
                      {suggestingIcons === i - 1 ? "✨ …" : "✨ Suggest 3"}
                    </button>
                    {getSelectedIcons(i - 1).length > 0 && (
                      <button
                        onClick={() => toggleShowLabels(i - 1)}
                        title="Show or hide the text label beneath each icon"
                        style={{ background: getShowLabels(i - 1) ? "var(--accent-dim)" : "transparent", border: `1px solid ${getShowLabels(i - 1) ? "var(--accent-mid)" : "var(--border)"}`, borderRadius: 3, fontSize: 9, color: getShowLabels(i - 1) ? "var(--accent)" : "var(--muted)", cursor: "pointer", fontFamily: "inherit", padding: "1px 6px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}
                      >
                        Labels {getShowLabels(i - 1) ? "On" : "Off"}
                      </button>
                    )}
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
                  {(["sleep", "health", "lifestyle", "fitness", "mind", "daily"] as IconCategory[]).map((cat) => (
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
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
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

            {/* Background wash */}
            {(() => {
              const wash = hookOverlays.backgroundWash ?? WASH_SEED;
              const setWash = (patch: Partial<BackgroundWash>) =>
                setHookOverlays((s) => ({ ...s, backgroundWash: { ...(s.backgroundWash ?? WASH_SEED), ...patch } }));
              return (
                <div style={{ display: "grid", gap: 10, padding: "8px 0", borderTop: "1px dashed var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap" }}>Background wash</span>
                    <span style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.02em" }}>Veil between image and text</span>
                    <Segmented
                      label="Mode"
                      value={wash.mode}
                      options={[
                        { value: "dark", label: "Dark" },
                        { value: "light", label: "Light" },
                        { value: "none", label: "None" },
                      ]}
                      onChange={(mode) => setWash({ mode })}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: wash.mode === "none" ? 0.5 : 1, pointerEvents: wash.mode === "none" ? "none" : "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: wash.mode === "light" ? 1 : 0.4 }}>
                      <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Color</label>
                      <input
                        type="color"
                        value={wash.color}
                        disabled={wash.mode !== "light"}
                        onChange={(e) => setWash({ color: e.target.value })}
                        style={{ width: 28, height: 22, border: "1px solid var(--border)", borderRadius: 4, padding: 0, background: "transparent", cursor: wash.mode === "light" ? "pointer" : "not-allowed" }}
                      />
                    </div>
                    <SliderControl
                      label="Opacity"
                      min={0}
                      max={1}
                      step={0.05}
                      value={wash.opacity}
                      onChange={(v) => setWash({ opacity: v })}
                    />
                    <Segmented
                      label="Style"
                      value={wash.gradient ? "gradient" : "flat"}
                      options={[
                        { value: "flat", label: "Flat" },
                        { value: "gradient", label: "Gradient" },
                      ]}
                      onChange={(v) => setWash({ gradient: v === "gradient" })}
                    />
                  </div>
                </div>
              );
            })()}
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
            {/* Full prompt sent to engine — what fal/gpt will actually receive,
                including framework chrome (palette, fonts, refs). Edit to override. */}
            <div style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)" }}>
              <button
                onClick={() => setFullPromptOpen((v) => !v)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                <span>Full prompt sent to engine{content.hookImagePromptOverride ? " (edited)" : ""}</span>
                <span style={{ color: "var(--muted)" }}>{fullPromptOpen ? "▾" : "▸"}</span>
              </button>
              {fullPromptOpen && (
                <div style={{ padding: "0 10px 10px" }}>
                  {fullPromptLoading && !fullPromptOverride && !fullPromptPreview && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", padding: "4px 0 8px" }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid var(--subtle)", borderTopColor: "var(--muted)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Loading current prompt…</span>
                    </div>
                  )}
                  {fullPromptError && <div style={{ fontSize: 11, color: "#dc2626", marginBottom: 6 }}>{fullPromptError}</div>}
                  <textarea
                    value={fullPromptOverride || fullPromptPreview}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFullPromptOverride(v);
                      onContentChange({ ...config, content: { ...config.content, hookImagePromptOverride: v.trim() ? v : undefined } });
                    }}
                    rows={10}
                    placeholder="Server-assembled prompt will appear here. Edit to override."
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 11, lineHeight: 1.5, resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "var(--text)", padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--surface)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10, color: "var(--muted)" }}>
                    <span>{content.hookImagePromptOverride ? "Override is active — sent verbatim on next regen." : "Showing server default — edit to override."}</span>
                    {content.hookImagePromptOverride && (
                      <button
                        onClick={() => {
                          setFullPromptOverride("");
                          onContentChange({ ...config, content: { ...config.content, hookImagePromptOverride: undefined } });
                        }}
                        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px", fontSize: 10, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              )}
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

            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>
              Model
            </label>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {([
                { value: "auto", label: "Auto (Recraft)" },
                { value: "gpt-image-2", label: "GPT Image 2" },
              ] as const).map((opt) => {
                const active = regenEngine === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setRegenEngine(opt.value)}
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
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {isEditorial && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Direction</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {([
                    { value: "auto",          label: "Auto" },
                    { value: "macro",         label: "Macro" },
                    { value: "environmental", label: "Environmental" },
                    { value: "abstract",      label: "Abstract" },
                    { value: "symbolic",      label: "Symbolic" },
                    { value: "natural",       label: "Natural" },
                  ] as const).map((opt) => {
                    const active = imageDirection === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setImageDirection(opt.value)} style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Subject</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {([
                    { value: "auto",        label: "Auto" },
                    { value: "person",      label: "Person" },
                    { value: "still-life",  label: "Still life" },
                    { value: "environment", label: "Environment" },
                  ] as const).map((opt) => {
                    const active = imageSubject === opt.value;
                    return (
                      <button key={opt.value} onClick={() => { setImageSubject(opt.value); setSuggestedPrompts([]); }} style={{
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>{opt.label}</button>
                    );
                  })}
                </div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Paper tone</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {([
                    { value: "white", label: "White ivory", swatch: "#EFEFF4" },
                    { value: "warm",  label: "Warm ivory",  swatch: "#EFE1C8" },
                  ] as const).map((opt) => {
                    const active = paperTone === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setPaperTone(opt.value)} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: opt.swatch, border: "1px solid var(--border)" }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {/* Previous hook images — click any thumb to revert. Session-only. */}
            {hookImageHistory.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  Previous images — click to revert
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {hookImageHistory.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      onClick={() => revertToHookImage(url)}
                      title={`Revert to image ${i + 1}`}
                      style={{ padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface)", cursor: "pointer", overflow: "hidden", lineHeight: 0, width: 60, height: 75 }}
                    >
                      <img
                        src={proxyUrl(url)}
                        alt={`Previous hook image ${i + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </button>
                  ))}
                </div>
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
        {Array.from({ length: slideCount }, (_, i) => i).map(i => (
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
      </>)}

      {/* ─── v2 layout (3-zone editor) ──────────────────────────────────── */}
      {isV2 && (
        <div ref={editorRef}>
          {/* View toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>View</span>
            {(["editor", "feed"] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "5px 12px", borderRadius: 5,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent)" : "var(--muted)",
                  fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: "inherit",
                  cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {mode === "editor" ? "Editor" : (reelsMode ? "TikTok feed" : "IG feed")}
                </button>
              );
            })}
          </div>

          {viewMode === "feed" ? (
            <FeedPreview
              slideNode={exportNodes[Math.min(feedIndex, exportNodes.length - 1)]}
              index={Math.min(feedIndex, exportNodes.length - 1)}
              total={exportNodes.length}
              onPrev={() => setFeedIndex((i) => Math.max(0, i - 1))}
              onNext={() => setFeedIndex((i) => Math.min(exportNodes.length - 1, i + 1))}
              mode={reelsMode ? "tiktok" : "instagram"}
              aspect={reelsMode ? "9:16" : "4:5"}
              caption={content.caption}
              brandAccent={bs?.accent ?? "#1e7a8a"}
            />
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: `${RAIL_COL}px minmax(0, 1fr) ${inspector ? "320px" : "0px"}`,
              gap: editorGap,
              alignItems: "start",
              transition: "grid-template-columns 0.22s ease-out, gap 0.22s ease-out",
            }}>
              {/* Rail */}
              <SlideRail slides={slideNodes} labels={slideLabels} focused={focusedSlide} onSelect={selectSlide} slideW={slideW} slideH={slideH} />

              {/* Canvas */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div style={{
                  position: "relative",
                  width: Math.round(slideW * canvasScale),
                  height: Math.round(slideH * canvasScale),
                  borderRadius: 8, overflow: "hidden", flexShrink: 0,
                  opacity: ((regeneratingGraphic === focusedSlide - 1) || (focusedSlide === 0 && regeneratingImage)) ? 0.45 : 1,
                }}>
                  <div style={{ width: slideW, height: slideH, transform: `scale(${canvasScale})`, transformOrigin: "top left" }}>
                    {slideNodes[focusedSlide]}
                  </div>
                  {regeneratingGraphic === focusedSlide - 1 && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.15)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text)", textTransform: "uppercase" }}>generating</span>
                    </div>
                  )}
                  {focusedSlide === 0 && regeneratingImage && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, pointerEvents: "none", background: "rgba(0,0,0,0.18)" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#fff", textTransform: "uppercase", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>generating image…</span>
                    </div>
                  )}
                </div>

                {/* Action bar */}
                {(() => {
                  const sIdx = focusedSlide - 1;
                  const isContent = focusedSlide >= 1 && focusedSlide <= 3;
                  const isHook = focusedSlide === 0;
                  const isCta = focusedSlide === slideCount - 1;
                  const isTakeaway = hasTakeaway && focusedSlide === 4;
                  const isDownloading = downloading === focusedSlide;
                  const bgGenerating = isContent && contentBgGenerating.has(sIdx);
                  const hasBg = isContent && !!contentBgImages[sIdx];
                  // CTA icons currently only render on the editorial preset.
                  const ctaIconsAvailable = isCta && isEditorial;
                  return (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: slideW }}>
                      <ToolbarButton label={isDownloading ? "Exporting…" : "↓ PNG"} onClick={() => downloadSlide(focusedSlide)} disabled={isDownloading || downloadingAll} />
                      {isContent && <ToolbarButton label={hdLoading === focusedSlide ? "Rendering…" : "✨ Preview HD"} active={!!hdPreviewUrl} onClick={() => previewHD(focusedSlide)} disabled={hdLoading !== null} />}
                      <ToolbarButton label="Settings" active={inspectorMode === "settings"} onClick={() => openInspector("settings")} />
                      {isHook && <ToolbarButton label="Refine image" active={inspectorMode === "image"} onClick={() => { const willOpen = inspectorMode !== "image"; setInspectorMode(willOpen ? "image" : null); if (willOpen) fetchSuggestedPrompts(); }} />}
                      {isHook && <ToolbarButton label="Overlays" active={inspectorMode === "overlays"} onClick={() => openInspector("overlays")} />}
                      {isContent && <ToolbarButton label="Edit text" active={inspectorMode === "text"} onClick={() => openInspector("text")} />}
                      {isTakeaway && <ToolbarButton label="Edit text" active={inspectorMode === "takeaway"} onClick={() => openInspector("takeaway")} />}
                      {/* Content slides: the four graphic actions collapse into one
                          "Graphic ▾" menu. On the CTA slide only icons apply, so it
                          stays a standalone button there. */}
                      {isContent ? (
                        <ToolbarMenu
                          label="Graphic"
                          active={inspectorMode === "icons" || inspectorMode === "graphicType" || inspectorMode === "graphicData" || inspectorMode === "graphicComment"}
                          items={[
                            { label: "Icons", active: inspectorMode === "icons", onClick: openIconInspector },
                            { label: "Type", active: inspectorMode === "graphicType", onClick: () => openInspector("graphicType") },
                            { label: "Data", active: inspectorMode === "graphicData", onClick: () => openInspector("graphicData") },
                            { label: "Regenerate", active: inspectorMode === "graphicComment", onClick: () => openInspector("graphicComment") },
                          ]}
                        />
                      ) : ctaIconsAvailable ? (
                        <ToolbarButton label="Icons" active={inspectorMode === "icons"} onClick={openIconInspector} />
                      ) : null}
                      {isContent && <ToolbarButton label={regenerating === sIdx ? "Regenerating…" : "Regen slide"} onClick={() => handleRegenerateSlide(sIdx)} disabled={regenerating === sIdx || regeneratingGraphic === sIdx} />}
                      {isContent && <ToolbarButton label={bgGenerating ? "Generating…" : hasBg ? "Regen background" : "AI background"} onClick={() => handleGenerateContentBg(sIdx)} disabled={bgGenerating} />}
                      {isContent && hasBg && !bgGenerating && <ToolbarButton label="Clear background" onClick={() => handleClearContentBg(sIdx)} />}
                    </div>
                  );
                })()}
              </div>

              {/* Inspector */}
              <div style={{ overflow: "hidden", minWidth: 0, alignSelf: "stretch" }}>
                {inspector && (
                  <InspectorPanel title={inspector.title} subtitle={inspector.subtitle} onClose={() => setInspectorMode(null)}>
                    {inspector.body}
                  </InspectorPanel>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview HD modal — the Remotion-rendered (exported) PNG, shown inline. */}
      {(hdPreviewUrl || hdError) && (
        <div
          onClick={() => { if (hdPreviewUrl) URL.revokeObjectURL(hdPreviewUrl); setHdPreviewUrl(null); setHdError(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12, maxWidth: "min(92vw, 460px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Remotion HD render — exactly what export produces</span>
              <button onClick={() => { if (hdPreviewUrl) URL.revokeObjectURL(hdPreviewUrl); setHdPreviewUrl(null); setHdError(null); }} style={{ border: "none", background: "transparent", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            {hdError ? (
              <div style={{ fontSize: 13, color: "var(--error, #c40000)", padding: "12px 4px" }}>{hdError}</div>
            ) : (
              <>
                <img src={hdPreviewUrl!} alt="Remotion HD render" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)", display: "block" }} />
                <a href={hdPreviewUrl!} download="lunia-slide-hd.png" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>↓ Download this PNG</a>
              </>
            )}
          </div>
        </div>
      )}

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
