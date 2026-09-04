"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import EditorialContentSlide from "@/components/carousel/slides/EditorialContentSlide";
import FreePressContentSlide from "@/components/carousel/slides/FreePressContentSlide";
import FreePressTakeawaySlide from "@/components/carousel/slides/FreePressTakeawaySlide";
import { FP_COLORS, FP_TYPE } from "@/lib/brand-tokens";
import CTASlide from "@/components/carousel/slides/CTASlide";
import CommentCTASlide from "@/components/carousel/slides/CommentCTASlide";
import TakeawaySlide from "@/components/carousel/slides/TakeawaySlide";
import { BrandStyle, CarouselConfig, CarouselContrastMode, CarouselFormat, HookHeadlineWeight, HookTone, type VerificationRecord } from "@/lib/types";
import VerificationPanel from "@/components/carousel/VerificationPanel";
import { EditorShell, RailHead } from "@/components/shell/EditorShell";
import AssetBrowser from "@/components/campaign/AssetBrowser";
import { RewriteBar } from "@/components/editor/RewriteBar";
import type { CarouselLook, CarouselLookSettings } from "@/lib/types";
import { Input as UiInput } from "@/components/ui";
import { Button as UiButton, IconButton as UiIconButton, Tooltip as UiTooltip, Tabs as UiTabs, Panel as UiPanel, Badge as UiBadge, IcCopy as UiIcCopy } from "@/components/ui";
import { extractCarouselUnits, findStaleUnits, deriveRecordStatus, applyUnitFields, type UnitFields } from "@/lib/verification-status";
import { DEFAULT_GATING } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { CAROUSEL_ICONS, IconCategory } from "@/lib/carousel-icons";
import { useCarouselApi } from "@/components/carousel/api-context";
import { DEFAULT_HOOK_OVERLAYS, SOFT_WHITE, type HookOverlaySettings, type BackgroundWash } from "@/components/carousel/shared/HookOverlays";
import FeedPreview from "@/components/carousel/preview/FeedPreview";
import { SLIDE_ELEMENT_LABEL, isEditable as isEditableElement, type SlideElement } from "@/lib/slide-elements";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import GraphicTypePicker from "@/components/carousel/preview/GraphicTypePicker";
import GraphicDataEditor from "@/components/carousel/preview/GraphicDataEditor";
import PanelErrorBoundary from "@/components/carousel/preview/PanelErrorBoundary";
import SlideRail from "@/components/carousel/preview/SlideRail";

// v2 editor: which tool panel is docked in the inspector (null = closed).
export type ExportFrame = "feed" | "story" | "square";
/** Channel frames. Width is always 1080; the slide adapts its height. */
export const EXPORT_FRAMES: Record<ExportFrame, { h: number; label: string; file: string }> = {
  feed: { h: 1350, label: "Instagram feed, 4:5", file: "feed" },
  story: { h: 1920, label: "Story and Reels, 9:16", file: "story" },
  square: { h: 1080, label: "Square, 1:1 for ChatGPT ads", file: "square" },
};

type InspectorMode =
  | null
  | "element"
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
  /** Batch review only: return this item to the review list. The single-carousel
   *  builder no longer passes it — switching the hook happens in the Brief
   *  drawer on this surface, so there is nowhere to go back TO. */
  onChangeHook?: () => void;
  /** Switch the hook variant without leaving the canvas. */
  onSelectHook?: (index: number) => void;
  onContentChange: (config: CarouselConfig) => void;
  initialImageStyle?: CarouselImageStyle;
  /** Contrast chosen on the topic screen, so the chip opens on what was used. */
  initialContrastMode?: CarouselContrastMode;
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
  initialHookHeadlineWeight?: HookHeadlineWeight;
  /** Editorial Scientific only — hook image URLs pregenerated per boldness level, keyed
   *  by weight. Lets "Hook weight" swap the displayed image instantly instead of
   *  regenerating (see "Generate other weights" in the Refine image panel). */
  initialHookImagesByWeight?: Partial<Record<HookHeadlineWeight, string>>;
  stylePreset?: import("@/lib/types").CarouselStylePreset;
  carouselFormat?: CarouselFormat;
  /** When the editor was opened from the library, the saved-carousel id flows
   *  in so the "Save" button updates that record in place instead of minting
   *  a brand-new carousel on every save. */
  initialSavedId?: string | null;
  /** Leave the editor (back to the library). Batch review passes onChangeHook instead. */
  onExit?: () => void;
  /** Fires after a successful save with the resulting carousel id. Lets a parent
   *  (e.g. BatchView's queue cards) surface a "Saved ✓" state of its own. */
  onSaved?: (id: string) => void;
  /** Fact-verification record loaded alongside a saved carousel, if it has one. */
  initialVerification?: import("@/lib/types").VerificationRecord;
};

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
function ToolbarButton({ label, onClick, active = false, disabled = false, badge = false }: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  /** Small dot in the corner — flags "this panel has something worth checking". */
  badge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...toolbarBtnStyle(active), opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer", position: "relative" }}
    >
      {label}
      {badge && (
        <span style={{
          position: "absolute", top: -3, right: -3,
          width: 8, height: 8, borderRadius: "50%",
          background: "var(--warning, #b45309)", border: "1.5px solid var(--bg)",
        }} />
      )}
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

export default function PreviewStep({ config, hookTone, onRestart, onChangeHook, onSelectHook, onContentChange, initialImageStyle, initialContrastMode, initialMoodId, initialReelsMode, initialCitationFontSize, initialSlideBgColor, initialDarkBackground, initialLogoScale, initialArrowScale, initialHeadlineScale, initialBodyScale, initialIconScale, initialShowLuniaLifeWatermark, initialHookOverlays, initialShowSlideArrows, initialShowSlideNumbers, initialShowCitationBars, initialHookHeadlineWeight, initialHookImagesByWeight, stylePreset = "default", carouselFormat = "standard", initialSavedId = null, onSaved, initialVerification, onExit }: Props) {
  const apiBase = useCarouselApi();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [verification, setVerification] = useState<VerificationRecord | undefined>(initialVerification);
  const [autoVerify, setAutoVerify] = useState(false);
  const [staleUnitIds, setStaleUnitIds] = useState<string[]>([]);
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
  const [graphicComment, setGraphicComment] = useState<Record<number, string>>({});
  const GRAPHIC_REGEN_LIMIT = 5;
  const isV2 = apiBase === "/api/carousel-v2";
  // v2-only: hook image overlay settings + control panel toggle
  const [hookOverlays, setHookOverlays] = useState<HookOverlaySettings>(() => initialHookOverlays ?? ({
    ...DEFAULT_HOOK_OVERLAYS,
    // Seed frame color from brand accent if available
    frame: { ...DEFAULT_HOOK_OVERLAYS.frame, color: config.brandStyle?.accent ?? DEFAULT_HOOK_OVERLAYS.frame.color },
  }));
  // Collapsible "Slide controls" drawer — open by default, collapse to bring the
  // preview up and clear the screen.
  // v2-only: editor (3-zone workspace) vs feed (IG/TikTok mockup preview)
  const [viewMode, setViewMode] = useState<"editor" | "feed">("editor");
  const [feedIndex, setFeedIndex] = useState(0);
  // v2 editor: focused slide shown in the canvas + which inspector panel is open
  const [focusedSlide, setFocusedSlide] = useState(0);
  // Which PART of the focused slide is selected. Clicking the headline on the
  // canvas puts the headline's controls in the inspector and hides everything
  // else — instead of six identical S/M/L/XL rows, none of which said which
  // part of the picture they moved.
  const [selectedElement, setSelectedElement] = useState<SlideElement | null>(null);
  // Double-click puts a text zone into edit mode. Held per slide so leaving a
  // slide can't leave an invisible edit open on the one you left.
  const [editing, setEditing] = useState<{ slide: number; element: SlideElement } | null>(null);
  // The brief — topic and hook — folded into the workspace instead of living
  // two screens back. Collapsed by default: it is what you decided, not what
  // you are doing.
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(null);
  // v2 editor: AI-suggested icon ids for the focused content slide, held
  // un-applied so opening the icon panel never mutates the slide.
  const [iconSuggestions, setIconSuggestions] = useState<string[]>([]);
  // v2 editor: measured editor width — canvas scale is derived from it.
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editorW, setEditorW] = useState(0);
  const [editorH, setEditorH] = useState(0);
  const [railTab, setRailTab] = useState<"slide" | "style" | "brief" | "caption" | "check">("slide");
  // v2-only: graphic type picker — which slide's picker is open (or null)
  // v2-only: graphic data editor — which slide's editor is open (or null)
  const [exportError, setExportError] = useState<string | null>(null);
  const [graphicError, setGraphicError] = useState<string | null>(null);
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
  const isFreePress = stylePreset === "free-press";
  // Editorial Scientific renders content slides with a bespoke layout —
  // logo top, big editorial headline + rule, body, optional icon-stat rows,
  // optional product photo. Drop-in compatible with ContentSlide's props.
  const ContentSlideComponent = isFreePress
    ? FreePressContentSlide
    : isEditorial
      ? EditorialContentSlide
      : ContentSlide;
  const TakeawaySlideComponent = isFreePress ? FreePressTakeawaySlide : TakeawaySlide;
  // Editorial Scientific: default the slide bg to Soft Ivory if no saved color.
  const [slideBgColor, setSlideBgColor] = useState<string | undefined>(initialSlideBgColor ?? (isFreePress ? FP_COLORS.paper : isEditorial ? "#EFEFF4" : undefined));
  // Decoration toggles — default true to preserve every existing carousel's look.
  const [showSlideArrows, setShowSlideArrows] = useState(initialShowSlideArrows ?? true);
  const [showSlideNumbers, setShowSlideNumbers] = useState(initialShowSlideNumbers ?? true);
  const [showCitationBars, setShowCitationBars] = useState(initialShowCitationBars ?? true);
  const [hookHeadlineWeight, setHookHeadlineWeight] = useState<HookHeadlineWeight>(initialHookHeadlineWeight ?? "default");
  // Tracks the weight actually baked into the current hook image (Editorial Scientific
  // only) so we can flag when the setting has drifted from what's on-screen and a
  // regenerate is needed. Best-effort: assumes the loaded/initial image matches the
  // saved setting (or "default" for a freshly generated carousel, which always bakes
  // at default weight since the control isn't reachable until this step).
  const [lastBakedHeadlineWeight, setLastBakedHeadlineWeight] = useState<HookHeadlineWeight>(initialHookHeadlineWeight ?? "default");
  // Editorial Scientific only — pregenerated hook image per boldness level, populated by
  // "Generate other weights". Selecting a weight that has an entry here swaps the
  // displayed image instantly instead of showing the "regenerate to apply" warning.
  const [hookImagesByWeight, setHookImagesByWeight] = useState<Partial<Record<HookHeadlineWeight, string>>>(initialHookImagesByWeight ?? {});
  const [generatingWeightVariants, setGeneratingWeightVariants] = useState(false);
  const [weightVariantsError, setWeightVariantsError] = useState<string | null>(null);
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
  const [citationFontSize, setCitationFontSize] = useState(initialCitationFontSize ?? (isFreePress ? FP_TYPE.source : isEditorial ? 26 : 36));
  const [headlineScale, setHeadlineScale] = useState(initialHeadlineScale ?? (isEditorial ? 1.15 : 1));
  const [bodyScale, setBodyScale] = useState(initialBodyScale ?? 1.2); // default "L"
  const [iconScale, setIconScale] = useState(initialIconScale ?? 1); // icon-layout graphic size, default "M"
  const [reelsMode, setReelsMode] = useState(initialReelsMode ?? false);
  // Track the aspect ratio of the current hook image so we can prompt the user to regenerate

  // Icon picker state (content slides 1–3, i.e. slideIndex 0–2)
  const [iconPickerOpen, setIconPickerOpen] = useState<number | null>(null);
  const [iconPickerCategory, setIconPickerCategory] = useState<IconCategory>("sleep");
  const [iconPickerLayout, setIconPickerLayout] = useState<"row" | "column" | "grid" | "scattered">("row");
  const [suggestingIcons, setSuggestingIcons] = useState<number | null>(null);

  // Text editor state (content slides 1–3, i.e. slideIndex 0–2)

  function updateSlideField(slideIndex: number, field: "headline" | "body" | "citation", value: string) {
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
  // "standard" = the flat edge-to-edge ivory hook (unchanged default).
  // "high" = paper type band over a near-black ground with one luminous focal
  // element. Composes with paperTone, which still picks the paper hue.
  // Hook image only — content slide backgrounds are unaffected.
  const [contrastMode, setContrastMode] = useState<CarouselContrastMode>(initialContrastMode ?? "standard");

  // Hook image history — newest first. Populated whenever a regenerate
  // displaces the current image, so the user can revert to any prior take.
  // Session-only (does not persist on save) — keeps the surface tiny.
  const [hookImageHistory, setHookImageHistory] = useState<string[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Export frame per channel. Null follows the editor (story when Reels mode
  // is on, feed otherwise). The ref mirrors the state so an export started
  // right after switching frames reads the frame it asked for.
  const [exportFrame, setExportFrame] = useState<ExportFrame | null>(null);
  const exportFrameRef = useRef<ExportFrame | null>(null);
  const currentFrame = (): ExportFrame => exportFrameRef.current ?? (reelsMode ? "story" : "feed");
  const frame: ExportFrame = exportFrame ?? (reelsMode ? "story" : "feed");
  const frameH = EXPORT_FRAMES[frame].h;
  const frameReels = frame === "story";
  // Named looks: whole-deck style settings saved from this tab and applied
  // here or from the brief. Loaded once the Style tab first needs them.
  const [looks, setLooks] = useState<CarouselLook[] | null>(null);
  const [lookName, setLookName] = useState("");
  const [lookBusy, setLookBusy] = useState(false);
  const [lookError, setLookError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/carousel-v2/looks").then((r) => r.json()).then((d) => { if (alive) setLooks(Array.isArray(d) ? d : []); }).catch(() => { if (alive) setLooks([]); });
    return () => { alive = false; };
  }, []);
  function captureLook(): CarouselLookSettings {
    return {
      stylePreset, imageStyle, reelsMode, darkBackground, slideBgColor, logoScale, arrowScale, citationFontSize, headlineScale, bodyScale, iconScale,
      showLuniaLifeWatermark, hookOverlays, showSlideArrows, showSlideNumbers, showCitationBars, hookHeadlineWeight, contentBgOverlayOpacity,
    };
  }
  /** Everything a look carries except the style preset and image engine,
   *  which are fixed once a carousel is generated. Those apply from the brief. */
  function applyLook(s: CarouselLookSettings) {
    if (s.reelsMode !== undefined) setReelsMode(s.reelsMode);
    if (s.darkBackground !== undefined) setDarkBackground(s.darkBackground);
    if (s.slideBgColor !== undefined) setSlideBgColor(s.slideBgColor);
    if (s.logoScale !== undefined) setLogoScale(s.logoScale);
    if (s.arrowScale !== undefined) setArrowScale(s.arrowScale);
    if (s.citationFontSize !== undefined) setCitationFontSize(s.citationFontSize);
    if (s.headlineScale !== undefined) setHeadlineScale(s.headlineScale);
    if (s.bodyScale !== undefined) setBodyScale(s.bodyScale);
    if (s.iconScale !== undefined) setIconScale(s.iconScale);
    if (s.showLuniaLifeWatermark !== undefined) setShowLuniaLifeWatermark(s.showLuniaLifeWatermark);
    if (s.hookOverlays) setHookOverlays(s.hookOverlays as HookOverlaySettings);
    if (s.showSlideArrows !== undefined) setShowSlideArrows(s.showSlideArrows);
    if (s.showSlideNumbers !== undefined) setShowSlideNumbers(s.showSlideNumbers);
    if (s.showCitationBars !== undefined) setShowCitationBars(s.showCitationBars);
    if (s.hookHeadlineWeight !== undefined) setHookHeadlineWeight(s.hookHeadlineWeight);
    if (s.contentBgOverlayOpacity !== undefined) setContentBgOverlayOpacity(s.contentBgOverlayOpacity);
  }
  async function saveLook() {
    const name = lookName.trim();
    if (!name || lookBusy) return;
    setLookBusy(true); setLookError(null);
    try {
      const res = await fetch("/api/carousel-v2/looks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, settings: captureLook() }) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) { setLookError(data?.error ?? "Could not save the look."); return; }
      setLooks((prev) => [data as CarouselLook, ...(prev ?? [])]);
      setLookName("");
    } catch { setLookError("Network error."); }
    finally { setLookBusy(false); }
  }
  async function deleteLook(id: string) {
    setLooks((prev) => (prev ?? []).filter((l) => l.id !== id));
    await fetch(`/api/carousel-v2/looks?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

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
  // Takeaway now merges the follow-line CTA into itself and closes the deck —
  // no separate CTA slide/label when it's present (see slideNodes below).
  // Derived from the deck rather than assumed. The old fixed list hardcoded
  // three content slides, so a shorter deck crashed on content.slides[1] and a
  // longer one silently dropped everything past the third.
  const slideLabels = [
    "Hook",
    ...content.slides.map((_, i) => `Slide ${i + 2}`),
    hasTakeaway ? "Takeaway" : "CTA",
  ];
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
        ...(stylePreset !== "default" ? { stylePreset } : {}),
        ...(content.hookImageSpec ? { hookImageSpec: content.hookImageSpec } : {}),
        ...(isEditorial ? { imageDirection, paperTone, contrastMode, imageSubject, headlineWeight: hookHeadlineWeight } : {}),
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
  }, [selectedHook, currentImagePrompt, imageStyle, regenEngine, moodId, isEditorial, content.hookImageSpec, targetAspectForPreview, imageDirection, paperTone, contrastMode, imageSubject, hookHeadlineWeight]);

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
    const fr = currentFrame();
    const filename = `lunia-${EXPORT_FRAMES[fr].file}-${index + 1}-${label}.png`;
    const exportH = EXPORT_FRAMES[fr].h;

    // Infographic content slides (slides 1..N) with a GraphicSpec graphic, no AI
    // background image, and standard (non-Reels) format render via Remotion for
    // pixel-deterministic output. Hook/CTA, image-backed, and Reels slides keep
    // the html-to-image path. Any failure falls back to it too.
    const contentIdx = index - 1;
    const isContentSlide = contentIdx >= 0 && contentIdx < content.slides.length;
    const hasBgImage = isContentSlide && !!contentBgImages[contentIdx];
    if (isContentSlide && !hasBgImage && fr === "feed") {
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

  // Recompute which units drifted from their verdict whenever the copy changes.
  // Per-unit, so editing one slide doesn't discard the whole deck's verification.
  useEffect(() => {
    let cancelled = false;
    if (!verification) {
      setStaleUnitIds([]);
      return;
    }
    const units = extractCarouselUnits(config.content);
    findStaleUnits(verification, units).then((ids) => {
      if (!cancelled) setStaleUnitIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [verification, config.content]);

  // Export state, driven by the gating policy rather than a hardcoded rule.
  // DEFAULT_GATING ships fully advisory, so nothing blocks: the export always
  // works and the button simply tells you what it knows. Flip a surface to
  // "block" in the gating config to restore a hard gate.
  const verificationStatus = verification ? deriveRecordStatus(verification) : null;
  const gating = DEFAULT_GATING.carousel;
  const action = verificationStatus === "red" ? gating.red : verificationStatus === "amber" ? gating.amber : "warn";
  const exportBlocked = action === "block" && verificationStatus !== null && verificationStatus !== "green";
  const exportWarned =
    verificationStatus === "red" || verificationStatus === "amber" || staleUnitIds.length > 0;
  const exportNote =
    verificationStatus === "red"
      ? "Contains a claim contradicted by its sources. Review the Fact check panel before posting."
      : staleUnitIds.length > 0
        ? `${staleUnitIds.length} unit${staleUnitIds.length > 1 ? "s" : ""} edited since the last check.`
        : verificationStatus === "amber"
          ? "Part of this carousel could not be checked."
          : undefined;

  async function downloadAll() {
    if (exportBlocked) return;
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

  /** Export every slide in a channel frame. The hidden export nodes re-render
   *  at the frame's height first; a short wait lets fonts and layout settle. */
  async function downloadAllAs(fr: ExportFrame) {
    if (exportBlocked || downloadingAll) return;
    exportFrameRef.current = fr;
    setExportFrame(fr);
    await new Promise((r) => setTimeout(r, 400));
    try { await downloadAll(); }
    finally { exportFrameRef.current = null; setExportFrame(null); }
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
          hookHeadlineWeight,
          hookImagesByWeight,
        }),
      });
      if (!res.ok) return;
      const { id } = await res.json();
      const firstSave = !savedId;
      setSavedId(id);
      onSaved?.(id);
      // Every carousel is fact-checked. A first save starts the run without a
      // click; later saves leave the panel's stale-unit logic to prompt a re-check.
      if (firstSave) setAutoVerify(true);
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

  // ─── v2 editor helpers ────────────────────────────────────────────────────
  // Open an inspector tool for the focused slide. Toggles closed if already open.
  function openInspector(mode: Exclude<InspectorMode, null>) {
    setInspectorMode((cur) => (cur === mode ? null : mode));
    setRailTab("slide");
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

  /** Double-click a text zone → type on the artwork itself. */
  function beginEditElement(slideIndex: number, element: SlideElement) {
    if (!isEditableElement(element)) return;
    setFocusedSlide(slideIndex);
    setSelectedElement(element);
    setInspectorMode("element");
    setEditing({ slide: slideIndex, element });
  }

  /** Blur or Enter. Writes through the same path the inspector field uses, so
   *  both ways of editing land in one place and undo/save behave identically. */
  function commitEditElement(slideIndex: number, element: SlideElement, value: string) {
    setEditing(null);
    if (!isEditableElement(element)) return;
    const current = content.slides[slideIndex - 1];
    if (!current) return;
    const field = element as "headline" | "body" | "citation";
    if ((current[field] ?? "") === value) return; // nothing typed — don't dirty the carousel
    updateSlideField(slideIndex - 1, field, value);
  }

  /** Click a part of the slide → that part's controls, and only those. */
  function selectElement(slideIndex: number, element: SlideElement) {
    if (slideIndex !== focusedSlide) {
      setFocusedSlide(slideIndex);
      setIconSuggestions([]);
    }
    setSelectedElement(element);
    setInspectorMode("element");
  }

  // Focus a slide in the canvas. Clears stale icon suggestions and closes any
  // inspector panel that doesn't apply to the newly focused slide.
  function selectSlide(i: number) {
    setFocusedSlide(i);
    setIconSuggestions([]);
    setSelectedElement(null);
    setEditing(null);
    setInspectorMode((cur) => {
      if (cur === null || cur === "settings") return cur;
      if (cur === "element") return null;
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
      // Clear the draft comment on success
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
          ...(stylePreset !== "default" ? { stylePreset } : {}),
          ...(content.hookImageSpec ? { hookImageSpec: content.hookImageSpec } : {}),
          ...(isEditorial ? { imageDirection, paperTone, contrastMode, imageSubject, headlineWeight: hookHeadlineWeight } : {}),
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
      setLastBakedHeadlineWeight(hookHeadlineWeight);
      // A fresh generation is a brand-new composition — any previously pregenerated
      // weight variants were edits of the old photo and no longer apply.
      setHookImagesByWeight({ [hookHeadlineWeight]: imgData.url });
      setWeightVariantsError(null);
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

  // "Generate other weights" — takes the current hook image as-is and asks
  // gpt-image-2's /edit endpoint to re-render it at each of the other
  // boldness levels, keeping composition/lighting/background fixed. Fires
  // the missing weights in parallel; a partial failure still keeps whichever
  // variants succeeded (Promise.allSettled, not all-or-nothing).
  async function handleGenerateOtherWeights() {
    if (!isEditorial || !imgs[0] || generatingWeightVariants) return;
    setGeneratingWeightVariants(true);
    setWeightVariantsError(null);
    try {
      const sourceUrl = imgs[0];
      const sourceWeight = lastBakedHeadlineWeight;
      const allWeights: HookHeadlineWeight[] = ["default", "medium", "bold", "black"];
      const targets = allWeights.filter((w) => w !== sourceWeight && !hookImagesByWeight[w]);
      if (targets.length === 0) return;

      const settled = await Promise.allSettled(targets.map(async (weight) => {
        const res = await fetch(`${apiBase}/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slideIndex: 0,
            topic: topic ?? "",
            hook,
            imageStyle,
            imageAspect: reelsMode ? "9:16" : "4:5",
            stylePreset: "editorial-scientific",
            ...(content.hookImageSpec ? { hookImageSpec: content.hookImageSpec } : {}),
            editSourceImageUrl: sourceUrl,
            headlineWeight: weight,
          }),
        });
        const text = await res.text();
        let data: { url?: string; error?: string };
        try { data = JSON.parse(text); }
        catch { throw new Error(`Non-JSON response (HTTP ${res.status})`); }
        if (!res.ok || data.error || !data.url) throw new Error(data.error ?? `Failed (HTTP ${res.status})`);
        return { weight, url: data.url };
      }));

      const next = { ...hookImagesByWeight, [sourceWeight]: sourceUrl };
      const failures: string[] = [];
      for (const r of settled) {
        if (r.status === "fulfilled") next[r.value.weight] = r.value.url;
        else failures.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
      setHookImagesByWeight(next);
      if (failures.length > 0) setWeightVariantsError(`${failures.length} of ${targets.length} variant(s) failed: ${failures[0]}`);
    } finally {
      setGeneratingWeightVariants(false);
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
  // Shared by the settings panel and the per-element panel. Hoisted out of the
  // settings branch when the size rows moved to the elements they resize.
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

  function getInspector(mode: InspectorMode = inspectorMode): { title: string; subtitle?: string; body: React.ReactNode } | null {
    if (!mode) return null;
    const slideIdx = focusedSlide - 1; // 0-2 when a content slide is focused

    // ── Settings ──────────────────────────────────────────────────────────
    if (mode === "settings") {
      return {
        title: "Settings",
        body: (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Looks</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {looks === null && <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading looks</div>}
              {looks && looks.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>No saved looks yet. Set the style below, name it, and save it to reuse on the next carousel.</div>}
              {looks?.map((l) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <UiButton size="sm" variant="secondary" onClick={() => applyLook(l.settings)} title={`Apply ${l.name} to this carousel. Style preset and image engine apply from the brief only.`} style={{ flex: 1, justifyContent: "flex-start" }}>{l.name}</UiButton>
                  <UiIconButton size="sm" title={`Delete ${l.name}`} onClick={() => deleteLook(l.id)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg></UiIconButton>
                </div>
              ))}
              <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); saveLook(); }}>
                <UiInput size="sm" value={lookName} onChange={(e) => setLookName(e.target.value)} placeholder="Name the current style" aria-label="Look name" style={{ flex: 1 }} />
                <UiButton size="sm" variant="secondary" type="submit" disabled={!lookName.trim()} busy={lookBusy}>Save look</UiButton>
              </form>
              {lookError && <div style={{ fontSize: 11, color: "var(--error)" }}>{lookError}</div>}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Branding &amp; format</div>
            {/* Only what applies to the WHOLE deck lives here. Headline, body,
                citation and icon sizing moved onto the elements they resize —
                click that part of the slide. Six identical S/M/L/XL rows in one
                panel was the thing nobody could read. */}
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
            {/* Hook slide only — boldness of the first-slide headline text. "Default" preserves today's weight. */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Hook weight</span>
              {([
                { value: "default", label: "Default" },
                { value: "medium", label: "Medium" },
                { value: "bold", label: "Bold" },
                { value: "black", label: "Black" },
              ] as const).map(({ value, label }) => {
                const pregenUrl = hookImagesByWeight[value];
                return (
                  <button key={value} onClick={() => {
                    setHookHeadlineWeight(value);
                    // Already generated for this weight — swap the displayed image
                    // instantly instead of leaving the "regenerate" warning up.
                    if (pregenUrl) {
                      const prevImages = config.slideImages ?? [null, null, null, null, null];
                      const newImages = [...prevImages];
                      newImages[0] = pregenUrl;
                      onContentChange({ ...config, slideImages: newImages as (string | null)[] });
                      setLastBakedHeadlineWeight(value);
                    }
                  }} title={pregenUrl ? "Pregenerated — switches instantly" : undefined} style={{
                    padding: "3px 8px", fontSize: 11, fontWeight: 700,
                    background: hookHeadlineWeight === value ? "var(--text)" : "var(--surface)",
                    color: hookHeadlineWeight === value ? "var(--bg)" : "var(--muted)",
                    border: `1px solid ${pregenUrl ? "var(--accent)" : "var(--border)"}`, borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                  }}>{label}{pregenUrl ? " ✓" : ""}</button>
                );
              })}
            </div>
            {/* Editorial Scientific bakes the headline into the image itself — changing
                the weight here doesn't touch an already-generated image unless that
                weight was already pregenerated (✓ above). Flag it so the user knows
                to hit "New image" or "Generate other weights" in the Refine image panel. */}
            {isEditorial && imgs[0] && hookHeadlineWeight !== lastBakedHeadlineWeight && (
              <div style={{ fontSize: 11, color: "var(--warning, #b45309)", display: "flex", alignItems: "center", gap: 5 }}>
                ⚠ Regenerate the hook image to apply this weight
              </div>
            )}
          </div>
        ),
      };
    }

    // ── Selected element ──────────────────────────────────────────────────
    // The controls for the part of the slide you clicked, and nothing else.
    // Everything here used to live in one flat Settings panel where a headline
    // control and a logo control looked identical and sat next to each other.
    if (mode === "element" && selectedElement) {
      const slide = content.slides[slideIdx];
      if (!slide) return null;

      const fieldStyle: React.CSSProperties = {
        width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.45,
        fontFamily: "inherit", color: "var(--text)", background: "var(--bg)",
        border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px",
      };
      const groupLabel = (t: string) => (
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{t}</div>
      );

      let body: React.ReactNode = null;

      if (selectedElement === "headline") {
        body = (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              {groupLabel("Text")}
              <textarea
                value={slide.headline}
                onChange={(e) => updateSlideField(slideIdx, "headline", e.target.value)}
                rows={2}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
              <div style={{ marginTop: 8 }}>
                <RewriteBar text={slide.headline} context={`Slide ${slideIdx + 1} of a carousel about "${topic}". Headline: ${slide.headline}. Body: ${slide.body}`} onResult={(t) => updateSlideField(slideIdx, "headline", t)} />
              </div>
            </div>
            <div>
              {groupLabel("Size")}
              {sizeRow("Headline", [0.85, 1, 1.15, 1.3], ["S", "M", "L", "XL"], headlineScale, setHeadlineScale)}
            </div>
          </div>
        );
      }

      if (selectedElement === "body") {
        body = (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              {groupLabel("Text")}
              <textarea
                value={slide.body}
                onChange={(e) => updateSlideField(slideIdx, "body", e.target.value)}
                rows={7}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
              <div style={{ marginTop: 8 }}>
                <RewriteBar text={slide.body} context={`Slide ${slideIdx + 1} of a carousel about "${topic}". Headline: ${slide.headline}. Body: ${slide.body}`} onResult={(t) => updateSlideField(slideIdx, "body", t)} />
              </div>
            </div>
            <div>
              {groupLabel("Size")}
              {sizeRow("Body", [0.85, 1, 1.2, 1.5, 1.85, 2.25], ["S", "M", "L", "XL", "2XL", "3XL"], bodyScale, setBodyScale)}
            </div>
          </div>
        );
      }

      if (selectedElement === "citation") {
        body = (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              {groupLabel("Source")}
              <textarea
                value={slide.citation}
                onChange={(e) => updateSlideField(slideIdx, "citation", e.target.value)}
                rows={3}
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            </div>
            <div>
              {groupLabel("Size")}
              {sizeRow("Citation", [18, 26, 36, 48], ["S", "M", "L", "XL"], citationFontSize, setCitationFontSize)}
            </div>
            <div>
              {groupLabel("Visibility")}
              <Button
                variant={showCitationBars ? "selected" : "secondary"}
                onClick={() => setShowCitationBars((v) => !v)}
              >
                {showCitationBars ? "Shown on every slide" : "Hidden on every slide"}
              </Button>
            </div>
          </div>
        );
      }

      if (selectedElement === "graphic") {
        body = (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              {groupLabel("Graphic")}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => setInspectorMode("graphicType")}>Change type</Button>
                <Button onClick={() => setInspectorMode("graphicData")}>Edit data</Button>
                <Button onClick={openIconInspector}>Icons</Button>
              </div>
            </div>
            <div>
              {groupLabel("Icon size")}
              {/* Only bites on slides whose graphic is an icon layout. */}
              {sizeRow("Icons", [0.75, 1, 1.3, 1.6], ["S", "M", "L", "XL"], iconScale, setIconScale)}
            </div>
          </div>
        );
      }

      return {
        title: SLIDE_ELEMENT_LABEL[selectedElement],
        // Says where you are and how to skip the round trip through this panel.
        subtitle: isEditableElement(selectedElement)
          ? `${slideLabels[focusedSlide]} · double-click on the slide to type there`
          : slideLabels[focusedSlide],
        body,
      };
    }

    // ── Text editor (content slides) ──────────────────────────────────────
    if (mode === "text") {
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
    if (mode === "takeaway") {
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

            <div>
              <label style={labelStyle}>Follow line</label>
              <input
                type="text"
                value={content.cta.followLine}
                onChange={(e) => onContentChange({ ...config, content: { ...content, cta: { ...content.cta, followLine: e.target.value } } })}
                placeholder="Follow @lunia_life for..."
                style={fieldStyle}
              />
            </div>
          </div>
        ),
      };
    }

    // ── Icon picker (non-destructive suggestions) ─────────────────────────
    if (mode === "icons") {
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
    if (mode === "graphicType") {
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
    if (mode === "graphicData") {
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
    if (mode === "graphicComment") {
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
    if (mode === "overlays") {
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
    if (mode === "image") {
      return {
        title: "Refine hook image",
        subtitle: "Edit the prompt or add guidelines — Claude rewrites it, then regenerates.",
        body: (
          <div>
            <div style={{ marginBottom: 12 }}>
              <UiButton size="sm" variant={libraryOpen ? "secondary" : "ghost"} onClick={() => setLibraryOpen((v) => !v)}>{libraryOpen ? "Hide the library" : "Use a library photo"}</UiButton>
              {libraryOpen && (
                <div style={{ marginTop: 8 }}>
                  <AssetBrowser target="A pick replaces the hook image. The current one stays in the history below." onPick={(a) => { revertToHookImage(a.url); setLastBakedHeadlineWeight(hookHeadlineWeight); setLibraryOpen(false); }} />
                </div>
              )}
            </div>
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
                {/* Contrast — Standard is the flat ivory frame. High splits the
                    frame into a paper type zone over a near-black subject zone
                    with one luminous focal element. Composes with Paper tone,
                    which still picks the paper hue. */}
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>Contrast</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  {([
                    { value: "standard", label: "Standard",      swatch: paperTone === "warm" ? "#EFE1C8" : "#EFEFF4" },
                    { value: "high",     label: "High contrast", swatch: `linear-gradient(180deg, ${paperTone === "warm" ? "#EFE1C8" : "#EFEFF4"} 50%, #0B0A09 50%)` },
                  ] as const).map((opt) => {
                    const active = contrastMode === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setContrastMode(opt.value)} style={{
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
                {contrastMode === "high" && (
                  <p style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5, margin: "-4px 0 12px" }}>
                    Applies on the next image — hit &quot;New image&quot; to regenerate.
                  </p>
                )}
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
            {/* "Generate other weights" — edits the current image into the other 3 boldness
                levels (same composition, different headline weight) so "Hook weight" can
                swap between them instantly instead of regenerating each time. */}
            {isEditorial && imgs[0] && (() => {
              const allWeights: HookHeadlineWeight[] = ["default", "medium", "bold", "black"];
              const missing = allWeights.filter((w) => w !== lastBakedHeadlineWeight && !hookImagesByWeight[w]);
              return (
                <div style={{ marginTop: 10 }}>
                  {weightVariantsError && <p style={{ fontSize: 12, color: "var(--error)", margin: "0 0 8px" }}>{weightVariantsError}</p>}
                  <button
                    onClick={handleGenerateOtherWeights}
                    disabled={generatingWeightVariants || regeneratingImage || regeneratingPrompt || missing.length === 0}
                    style={{
                      width: "100%", background: "transparent",
                      color: (generatingWeightVariants || missing.length === 0) ? "var(--subtle)" : "var(--accent)",
                      border: "1px dashed var(--accent)", borderRadius: 6, padding: "9px 16px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                      cursor: (generatingWeightVariants || missing.length === 0) ? "not-allowed" : "pointer",
                    }}
                  >
                    {generatingWeightVariants
                      ? "Generating other weights…"
                      : missing.length === 0
                      ? "✓ All weights generated"
                      : `✨ Generate other weights (${missing.length} more image${missing.length === 1 ? "" : "s"})`}
                  </button>
                  <p style={{ fontSize: 10, color: "var(--muted)", margin: "6px 0 0" }}>
                    Edits this image at each other boldness level — same composition, different headline weight. Takes a few minutes.
                  </p>
                </div>
              );
            })()}
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
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} overlays={isV2 ? hookOverlays : undefined} reels={reelsMode} headlineWeight={hookHeadlineWeight} />,
    ...content.slides.map((s, i) => (
      <ContentSlideComponent key={i + 1} headline={s.headline} body={s.body} citation={s.citation} graphic={s.graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={contentBgImages[i] ?? undefined} bgImageShimmer={contentBgGenerating.has(i)} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale}
        onSelectElement={(el) => selectElement(i + 1, el)}
        selectedElement={focusedSlide === i + 1 ? selectedElement : null}
        editingElement={editing?.slide === i + 1 ? editing.element : null}
        onBeginEditElement={(el) => beginEditElement(i + 1, el)}
        onCommitElement={(el, v) => commitEditElement(i + 1, el, v)}
        onCancelEditElement={() => setEditing(null)} />
    )),
    ...(hasTakeaway && content.takeaway
      ? [<TakeawaySlideComponent key="takeaway" headline={content.takeaway.headline} points={content.takeaway.points} interaction={content.takeaway.interaction} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} reels={reelsMode} />]
      : [carouselFormat === "engagement" && content.commentKeyword
          ? <CommentCTASlide key="cta" headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />
          : <CTASlide key="cta" headline={content.cta.headline} followLine={content.cta.followLine} graphic={content.cta.graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={reelsMode} />]),
  ];

  // Export nodes use proxied URLs so html-to-image canvas export works (avoids CORS taint)
  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} sourceNote={hook.sourceNote} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} overlays={isV2 ? hookOverlays : undefined} reels={frameReels} frameH={frameH} headlineWeight={hookHeadlineWeight} />,
    ...content.slides.map((s, i) => (
      <ContentSlideComponent key={i + 1} headline={s.headline} body={s.body} citation={s.citation} graphic={s.graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} bgImageUrl={proxyUrl(contentBgImages[i])} bgImageOverlayOpacity={contentBgOverlayOpacity} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} citationFontSize={citationFontSize} reels={frameReels} frameH={frameH} headlineScale={headlineScale} bodyScale={bodyScale} iconScale={iconScale} />
    )),
    ...(hasTakeaway && content.takeaway
      ? [<TakeawaySlideComponent key="takeaway" headline={content.takeaway.headline} points={content.takeaway.points} interaction={content.takeaway.interaction} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} reels={frameReels} frameH={frameH} />]
      : [carouselFormat === "engagement" && content.commentKeyword
          ? <CommentCTASlide key="cta" headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={frameReels} frameH={frameH} />
          : <CTASlide key="cta" headline={content.cta.headline} followLine={content.cta.followLine} graphic={content.cta.graphic} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} slideBgColor={slideBgColor} showLuniaLifeWatermark={showLuniaLifeWatermark} prominentWatermark={isV2} stylePreset={stylePreset} showSlideArrows={showSlideArrows} showSlideNumbers={showSlideNumbers} showCitationBars={showCitationBars} reels={frameReels} frameH={frameH} />]),
  ];

  const slideW = Math.round(1080 * PREVIEW_SCALE);
  const slideH = Math.round((reelsMode ? 1920 : 1350) * PREVIEW_SCALE);
  const inspector = isV2 ? getInspector() : null;

  // The stage measures itself; the focused slide scales to fit both axes.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const measure = () => { const w = el.clientWidth; const h = el.clientHeight; if (w > 0) setEditorW(w); if (h > 0) setEditorH(h); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isV2, viewMode]);

  const STAGE_PAD = 40;
  const canvasScale = editorW > 0
    ? Math.min(1, (editorW - STAGE_PAD * 2) / slideW, editorH > 0 ? (editorH - STAGE_PAD * 2) / slideH : 1)
    : 0.5;
  const slideInspector = inspector && inspectorMode !== "settings" ? inspector : null;
  const settingsInspector = isV2 ? getInspector("settings") : null;

  return (
    <>
      <EditorShell<"editor" | "feed">
        kindLabel="Carousel"
        title={topic}
        onBack={onChangeHook ?? onExit}
        saveState={savedId ? (saving ? "saving" : "saved") : "unsaved"}
        saveActions={<>
          <UiButton size="sm" variant={savedId ? "ghost" : "secondary"} onClick={handleSave} busy={saving} title={savedId ? "Update the saved carousel" : "Save this carousel to the library"}>{saveLabel ?? (savedId ? "Update" : "Save to library")}</UiButton>
          {savedId && <UiTooltip label={copyLabel}><UiIconButton title="Copy share link" size="sm" onClick={handleCopyShareLink}><UiIcCopy size={14} /></UiIconButton></UiTooltip>}
          {imagesLoading && <span className="shell__save shell__save--saving"><span className="ui-spinner" style={{ width: 10, height: 10 }} />Generating visuals</span>}
        </>}
        views={[{ value: "editor", label: "Editor" }, { value: "feed", label: reelsMode ? "TikTok feed" : "IG feed" }]}
        view={viewMode}
        onView={setViewMode}
        exportLabel={downloadingAll ? "Exporting" : exportBlocked ? "Download blocked" : "Export"}
        exportNote={exportNote}
        exportTone={verificationStatus === "red" ? "danger" : exportWarned ? "warning" : undefined}
        exportMenu={[
          { type: "heading", label: "Export" },
          ...(["feed", "story", "square"] as ExportFrame[]).map((fr) => ({ label: `Download all, ${EXPORT_FRAMES[fr].label}`, disabled: downloadingAll || exportBlocked, onSelect: () => { void downloadAllAs(fr); } })),
          { label: downloading === focusedSlide ? "Exporting this slide" : `Download ${slideLabels[focusedSlide]} (PNG)`, disabled: downloading !== null, onSelect: () => downloadSlide(focusedSlide) },
          ...(focusedSlide >= 1 && focusedSlide <= 3 ? [{ label: "Preview HD for this slide", disabled: hdLoading !== null, onSelect: () => previewHD(focusedSlide) }] : []),
          ...(carouselFormat === "engagement" ? [{ label: generatingPdf ? "Generating PDF" : "PDF guide", disabled: generatingPdf, onSelect: handleGeneratePdf }] : []),
          { type: "separator" },
          { label: "Copy Instagram caption", disabled: !content.caption, onSelect: () => { navigator.clipboard.writeText(content.caption).then(() => { setCaptionCopyLabel("Copied!"); setTimeout(() => setCaptionCopyLabel("Copy"), 2000); }); } },
          ...(savedId ? [{ label: "Copy share link", onSelect: handleCopyShareLink }] : []),
          { type: "separator" },
          { label: "Start over", danger: true, onSelect: onRestart },
        ]}
        left={<>
          <RailHead>Slides <UiBadge>{slideCount}</UiBadge></RailHead>
          <div style={{ padding: 8 }}>
            <SlideRail slides={slideNodes} labels={slideLabels} focused={focusedSlide} onSelect={selectSlide} slideW={slideW} slideH={slideH} thumbW={168} />
          </div>
        </>}
        right={<>
          <div style={{ padding: "8px 8px 0" }}>
            <UiTabs value={railTab} onChange={setRailTab} ariaLabel="Properties" items={[{ value: "slide", label: "Slide" }, { value: "style", label: "Style" }, { value: "brief", label: "Brief" }, { value: "caption", label: "Caption" }, { value: "check", label: "Check" }]} />
          </div>
          <div className="shell__rail-body">
            {exportError && <div className="ui-badge ui-badge--danger" style={{ whiteSpace: "normal", padding: 8, height: "auto" }}>{exportError}</div>}
            {pdfError && <div className="ui-badge ui-badge--danger" style={{ whiteSpace: "normal", padding: 8, height: "auto", display: "flex", justifyContent: "space-between", gap: 8 }}><span>PDF error: {pdfError}</span><button type="button" onClick={() => setPdfError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }} aria-label="Dismiss">×</button></div>}
            {graphicError && <div className="ui-badge ui-badge--danger" style={{ whiteSpace: "normal", padding: 8, height: "auto", display: "flex", justifyContent: "space-between", gap: 8 }}><span>{graphicError}</span><button type="button" onClick={() => setGraphicError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }} aria-label="Dismiss">×</button></div>}
            {railTab === "slide" && (slideInspector ? (
              <UiPanel title={slideInspector.title} actions={<UiIconButton title="Close" size="sm" onClick={() => { setInspectorMode(null); setSelectedElement(null); }}>×</UiIconButton>}>
                {slideInspector.subtitle && <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>{slideInspector.subtitle}</span>}
                {slideInspector.body}
              </UiPanel>
            ) : (
              <UiPanel title={slideLabels[focusedSlide]}>
                <span style={{ fontSize: 13, color: "var(--ui-text-2)", lineHeight: 1.5 }}>Click any text on the slide to select it, double-click to edit it there. The actions under the slide open their controls here.</span>
              </UiPanel>
            ))}
            {railTab === "style" && settingsInspector && <UiPanel title="Settings">{settingsInspector.body}</UiPanel>}
            {railTab === "brief" && (
              <UiPanel title="Brief">
                {onSelectHook && content.hooks.length > 1 ? (
                  <div>
                    <Label kind="section">Hook</Label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {content.hooks.map((h, i) => {
                        const active = i === selectedHook;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => onSelectHook(i)}
                            style={{
                              textAlign: "left", padding: "10px 12px", borderRadius: 8,
                              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                              background: active ? "var(--accent-dim)" : "var(--bg)",
                              cursor: "pointer", fontFamily: "inherit", color: "var(--text)",
                              transition: "border-color 120ms ease, background 120ms ease",
                            }}
                          >
                            <div style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, lineHeight: 1.35 }}>{h.headline}</div>
                            {h.subline && (
                              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>{h.subline}</div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                      Switching the hook changes the first slide&apos;s text. The image already
                      generated for it stays — regenerate it from Refine image if you want a new one.
                    </p>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>One hook was written for this carousel. A new hook image is one click away in Refine image on the hook slide.</span>
                )}
                <div style={{ fontSize: 12, color: "var(--ui-text-3)" }}>Hook tone: {hookTone}. Start over, in the Export menu, rewrites everything from a new brief.</div>
              </UiPanel>
            )}
            {railTab === "caption" && (
              <UiPanel title="Instagram caption" actions={<UiButton size="sm" variant="primary" disabled={!content.caption} onClick={() => { navigator.clipboard.writeText(content.caption).then(() => { setCaptionCopyLabel("Copied!"); setTimeout(() => setCaptionCopyLabel("Copy"), 2000); }); }}>{captionCopyLabel}</UiButton>}>
                {content.caption ? <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{content.caption}</div> : <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>No caption was written for this carousel.</span>}
              </UiPanel>
            )}
            {railTab === "check" && (savedId ? (
              <VerificationPanel
                carouselId={savedId}
                record={verification}
                // Pass the policy explicitly. Without it the panel fell back to a
                // hardcoded "contradicted claims block download", which stopped
                // being true when verification went advisory — so the footer
                // claimed a block that no longer existed.
                gating={gating}
                staleUnitIds={staleUnitIds}
                pendingUnitLabels={extractCarouselUnits(config.content).map((u) => u.label)}
                onRecordChange={setVerification}
                autoRun={autoVerify}
                onApplyFix={(unitId, fields: UnitFields) => {
                  // Writes into the live content. The unit's hash now differs from
                  // the one on its verdict, so the staleness effect marks it edited
                  // and the panel stops presenting the old verdict as current.
                  onContentChange({ ...config, content: applyUnitFields(config.content, unitId, fields) });
                }}
              />
            ) : (
              <UiPanel title="Fact check">
                <span style={{ fontSize: 13, color: "var(--ui-text-2)" }}>Save this carousel first. The check runs on its own after the first save, and every slide is checked against real sources.</span>
              </UiPanel>
            ))}
          </div>
        </>}
      >
        {viewMode === "feed" ? (
          <div className="shell__stage">
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
          </div>
        ) : (
          <>
            <div className="shell__stage" ref={editorRef}>
              <div style={{
                position: "relative",
                width: Math.round(slideW * canvasScale),
                height: Math.round(slideH * canvasScale),
                borderRadius: 4, overflow: "hidden", flexShrink: 0, boxShadow: "var(--ui-elev-2)",
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
            </div>
            <div className="shell__zoombar" style={{ justifyContent: "center" }}>
                {/* Action bar */}
                {(() => {
                  const sIdx = focusedSlide - 1;
                  const isContent = focusedSlide >= 1 && focusedSlide <= 3;
                  const isHook = focusedSlide === 0;
                  const isTakeaway = hasTakeaway && focusedSlide === 4;
                  // When Takeaway is present it IS the last slide (merged CTA) —
                  // there's no separate CTA render to attach icon-editing to.
                  const isCta = focusedSlide === slideCount - 1 && !isTakeaway;
                  const isDownloading = downloading === focusedSlide;
                  const bgGenerating = isContent && contentBgGenerating.has(sIdx);
                  const hasBg = isContent && !!contentBgImages[sIdx];
                  // CTA icons currently only render on the editorial preset.
                  const ctaIconsAvailable = isCta && isEditorial;
                  return (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", maxWidth: slideW }}>
                      <ToolbarButton label={isDownloading ? "Exporting…" : "↓ PNG"} onClick={() => downloadSlide(focusedSlide)} disabled={isDownloading || downloadingAll} />
                      {isContent && <ToolbarButton label={hdLoading === focusedSlide ? "Rendering…" : "✨ Preview HD"} active={!!hdPreviewUrl} onClick={() => previewHD(focusedSlide)} disabled={hdLoading !== null} />}
                      <ToolbarButton label="Style" active={railTab === "style"} onClick={() => setRailTab("style")} />
                      {isHook && <ToolbarButton label="Refine image" active={inspectorMode === "image"} badge={isEditorial && !!imgs[0] && hookHeadlineWeight !== lastBakedHeadlineWeight} onClick={() => { const willOpen = inspectorMode !== "image"; setInspectorMode(willOpen ? "image" : null); if (willOpen) fetchSuggestedPrompts(); }} />}
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
              <span style={{ marginLeft: 12, color: "var(--ui-text-3)", fontFamily: "var(--ui-font-mono)", fontSize: 11 }}>{slideW} × {slideH} · {slideLabels[focusedSlide]}</span>
            </div>
          </>
        )}
      </EditorShell>

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

      {/* Hidden full-size slides for accurate PNG export */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        {exportNodes.map((node, i) => (
          <div key={i} ref={el => { exportRefs.current[i] = el; }} style={{ width: 1080, height: frameH }}>
            {node}
          </div>
        ))}
      </div>
    </>
  );
}
