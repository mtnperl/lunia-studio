"use client";
import { useState, useEffect, useRef } from "react";
import { BrandStyle, CarouselContent, CarouselConfig, CarouselContrastMode, CarouselFormat, CarouselStylePreset, DidYouKnowContent, EngagementSubType, HookTone, MultiVariantResponse, SavedCarousel, type CarouselLookSettings } from "@/lib/types";
import { lookFromCarousel } from "@/lib/carousel-looks";
import TopicStep, { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import DidYouKnowPreviewStep from "@/components/carousel/steps/DidYouKnowPreviewStep";
import { RetroImageLoader, RetroImageError } from "@/components/carousel/shared/RetroLoader";
import { useCarouselApi } from "@/components/carousel/api-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

/** The studio has two states: writing the brief, or working on the artwork.
 *  It kept a 1-4 step machine long after Content and Hook stopped being
 *  screens; 1 and 4 are all that is left, and the names below say which. */
type Step = 1 | 4;
const BRIEF = 1 as const;
const STUDIO = 4 as const;

const CAROUSEL_LOADER_MSGS = [
  "Reading the topic",
  "Drafting hooks",
  "Writing the slides",
  "Finding citations",
  "Applying your brand rules",
  "Building the infographics",
  "Shaping the call to action",
  "Almost there",
];


/**
 * Generation progress.
 *
 * Was a terminal log — `GEN PROGRESS`, `> Reading topic... OK`, a blinking
 * underscore — which is a different product's aesthetic wearing this one's
 * clothes. It also lied: the four lines were a fixed slice, so the same three
 * steps always showed "OK" whatever the model was actually doing.
 *
 * This walks the real step list on a timer instead. It is still an estimate,
 * and it says so by naming only the step it believes it is on rather than
 * ticking off work it cannot observe.
 */
function CarouselLoader() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => Math.min(i + 1, CAROUSEL_LOADER_MSGS.length - 1));
    }, 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
        borderRadius: "var(--r-lg)",
        padding: "28px 30px",
        maxWidth: 560,
        margin: "40px auto",
      }}
      aria-live="polite"
    >
      <h2 className="display display-md" style={{ margin: "0 0 20px" }}>
        Writing your carousel
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
            background: "var(--accent)", animation: "pulse 1s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 14.5 }}>{CAROUSEL_LOADER_MSGS[idx]}</span>
      </div>
      <div
        style={{
          height: 3, borderRadius: 2,
          background: "linear-gradient(90deg, var(--surface) 0%, var(--surface-h) 50%, var(--surface) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export default function CarouselView({ initialCarousel, onCarouselLoaded, onSaved, onExit, varyFrom, onVaryConsumed, version = "v1" }: { initialCarousel?: SavedCarousel | null; onCarouselLoaded?: () => void; onSaved?: (id: string) => void; onExit?: () => void; version?: "v1" | "v2"; varyFrom?: SavedCarousel | null; onVaryConsumed?: () => void }) {
  const apiBase = useCarouselApi();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [concise, setConcise] = useState(false);
  const [variants, setVariants] = useState<CarouselContent[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedHook, setSelectedHook] = useState(0);
  const [brandStyle, setBrandStyle] = useState<BrandStyle | null>(null);
  const [stylePreset, setStylePreset] = useState<CarouselStylePreset>("default");
  // Chosen on the topic screen so the FIRST hook image already has it —
  // the refine-panel chip only ever applied from the next regenerate.
  const [contrastMode, setContrastMode] = useState<CarouselContrastMode>("standard");
  const [includeSeoFooter, setIncludeSeoFooter] = useState<boolean>(true);
  const [hookImageUrl, setHookImageUrl] = useState<string | null>(null);
  const [slideImages, setSlideImages] = useState<(string | null)[]>([null, null, null, null, null]);

  // ─── Load saved carousel ──────────────────────────────────────────────────
  useEffect(() => {
    if (!initialCarousel) return;
    // A document opened by id is the source of truth; a draft restored from
    // this browser a moment earlier is not "your unsaved carousel". The id is
    // kept here because the parent clears `initialCarousel` once consumed.
    setRestoredDraft(false);
    setLoadedId(initialCarousel.id);
    setTopic(initialCarousel.topic);
    setHookTone(initialCarousel.hookTone);
    setVariants([initialCarousel.content]);
    setSelectedVariant(0);
    setSelectedHook(initialCarousel.selectedHook ?? 0);
    setBrandStyle(initialCarousel.brandStyle ?? null);
    setHookImageUrl(initialCarousel.hookImageUrl ?? null);
    const loadedImages = initialCarousel.slideImages ?? [null, null, null, null, null];
    setSlideImages(loadedImages);
    if (initialCarousel.imageStyle) setImageStyle(initialCarousel.imageStyle as CarouselImageStyle);
    if (initialCarousel.format) setCarouselFormat(initialCarousel.format);
    if (initialCarousel.stylePreset) setStylePreset(initialCarousel.stylePreset);
    if (initialCarousel.didYouKnowContent) {
      setDidYouKnowVariants([initialCarousel.didYouKnowContent]);
      setSelectedDidYouKnow(0);
    }
    setStep(4);
    onCarouselLoaded?.();

  }, [initialCarousel]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Draft persistence ────────────────────────────────────────────────────
  const draftIdRef = useRef<string>("");

  // ─── fal.ai status ────────────────────────────────────────────────────────
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>("realistic");
  // null = "Auto" → server picks a random VISUAL_MOODS entry per call.
  const [moodId, setMoodId] = useState<string | null>(null);
  const [carouselFormat, setCarouselFormat] = useState<CarouselFormat>("standard");
  const [engagementSubType, setEngagementSubType] = useState<EngagementSubType>("reveal");
  const [didYouKnowVariants, setDidYouKnowVariants] = useState<DidYouKnowContent[]>([]);
  const [selectedDidYouKnow, setSelectedDidYouKnow] = useState(0);
  const [falStatus, setFalStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [falCount, setFalCount] = useState(0); // how many images loaded so far
  const [falErrors, setFalErrors] = useState<(string | null)[]>([null, null, null, null, null]);

  // ─── Auto-save / restore in-progress work ─────────────────────────────────
  // A reload (deploy version-skew, a tab crash, or an accidental refresh) used
  // to wipe everything in the builder. We now persist the working state to
  // localStorage on every change and restore it on mount, so a reload resumes
  // exactly where you left off instead of losing the carousel.
  const DRAFT_KEY = `lunia:builder:active:${version}`;
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(initialCarousel?.id ?? null);
  // The look chosen in the brief; the studio opens with its settings when no
  // saved carousel supplies its own.
  const [pendingLook, setPendingLook] = useState<CarouselLookSettings | null>(null);
  const varyLook = varyFrom ? lookFromCarousel(varyFrom) : null;
  const restoreAttempted = useRef(false);

  function clearActiveDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setRestoredDraft(false);
  }

  // Restore once on mount — unless we're opening a specific saved carousel,
  // which takes precedence over the autosaved draft.
  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    if (initialCarousel) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      const hasWork = d && (d.topic || (d.variants?.length ?? 0) > 0 || (d.didYouKnowVariants?.length ?? 0) > 0);
      if (!hasWork) return;
      if (typeof d.topic === "string") setTopic(d.topic);
      if (d.hookTone) setHookTone(d.hookTone);
      if (typeof d.concise === "boolean") setConcise(d.concise);
      if (Array.isArray(d.variants)) setVariants(d.variants);
      if (typeof d.selectedVariant === "number") setSelectedVariant(d.selectedVariant);
      if (typeof d.selectedHook === "number") setSelectedHook(d.selectedHook);
      if (d.brandStyle !== undefined) setBrandStyle(d.brandStyle);
      if (d.stylePreset) setStylePreset(d.stylePreset);
      if (d.contrastMode) setContrastMode(d.contrastMode);
      if (typeof d.includeSeoFooter === "boolean") setIncludeSeoFooter(d.includeSeoFooter);
      if (d.hookImageUrl !== undefined) setHookImageUrl(d.hookImageUrl);
      if (Array.isArray(d.slideImages)) setSlideImages(d.slideImages);
      if (d.imageStyle) setImageStyle(d.imageStyle);
      if (d.moodId !== undefined) setMoodId(d.moodId);
      if (d.carouselFormat) setCarouselFormat(d.carouselFormat);
      if (d.engagementSubType) setEngagementSubType(d.engagementSubType);
      if (Array.isArray(d.didYouKnowVariants)) setDidYouKnowVariants(d.didYouKnowVariants);
      if (typeof d.selectedDidYouKnow === "number") setSelectedDidYouKnow(d.selectedDidYouKnow);
      // Deliberately ignores any stored step. It used to accept 1-4, and 2 and 3
      // no longer render anything — a draft saved on the old Content or Hook
      // screen restored into a blank page. The screen follows the content:
      // something to work on means the studio, nothing means the brief.
      const restoredContent = Array.isArray(d.variants) && d.variants.length > 0;
      const restoredDyk = Array.isArray(d.didYouKnowVariants) && d.didYouKnowVariants.length > 0;
      setStep(restoredContent || restoredDyk ? STUDIO : BRIEF);
      setRestoredDraft(true);
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the working state whenever it changes (skip the empty initial state
  // so we never clobber a real draft with a blank one).
  useEffect(() => {
    if (!topic && variants.length === 0 && didYouKnowVariants.length === 0) return;
    const draft = {
      v: 1, step, topic, hookTone, concise, variants, selectedVariant, selectedHook,
      brandStyle, stylePreset, contrastMode, includeSeoFooter, hookImageUrl, slideImages,
      imageStyle, moodId, carouselFormat, engagementSubType, didYouKnowVariants,
      selectedDidYouKnow,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage quota — drop the (regenerable) image refs and retry.
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, slideImages: undefined, hookImageUrl: undefined })); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, topic, hookTone, concise, variants, selectedVariant, selectedHook, brandStyle, stylePreset, contrastMode, includeSeoFooter, hookImageUrl, slideImages, imageStyle, moodId, carouselFormat, engagementSubType, didYouKnowVariants, selectedDidYouKnow]);

  const content = variants[selectedVariant] ?? null;

  const config: CarouselConfig | null = content
    ? {
        topic,
        content,
        selectedHook,
        brandStyle: brandStyle ?? undefined,
        hookImageUrl: hookImageUrl ?? undefined,
        slideImages,
        contentBgImages: initialCarousel?.contentBgImages,
        contentBgOverlayOpacity: initialCarousel?.contentBgOverlayOpacity,
      }
    : null;

  // Only generate hook (0) — content + CTA slides stay clean with brand colors
  const FAL_SLIDE_INDICES = [0] as const;
  const FAL_TOTAL = FAL_SLIDE_INDICES.length;

  function generateSlideImages(currentTopic: string, currentContent: CarouselContent, currentHookIndex: number, currentImageStyle: CarouselImageStyle = "realistic", currentMoodId: string | null = null, currentStylePreset: CarouselStylePreset = "default", currentContrastMode: CarouselContrastMode = "standard") {
    setSlideImages([null, null, null, null, null]);
    setFalErrors([null, null, null, null, null]);
    setFalStatus("loading");
    setFalCount(0);
    const hook = currentContent.hooks[currentHookIndex];
    let loaded = 0;
    let failed = 0;
    FAL_SLIDE_INDICES.forEach((i) => {
      fetch(`${apiBase}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slideIndex: i,
          topic: currentTopic,
          hook,
          imagePrompt: currentContent.imagePrompt,
          imageStyle: currentImageStyle,
          ...(currentMoodId ? { moodId: currentMoodId } : {}),
          ...(currentStylePreset && currentStylePreset !== "default" ? { stylePreset: currentStylePreset } : {}),
          ...(currentContrastMode === "high" ? { contrastMode: currentContrastMode } : {}),
          ...(currentContent.hookImageSpec ? { hookImageSpec: currentContent.hookImageSpec } : {}),
          // Honour any user-edited full prompt from PreviewStep's prompt editor.
          ...(currentContent.hookImagePromptOverride && currentContent.hookImagePromptOverride.trim()
              ? { customPrompt: currentContent.hookImagePromptOverride }
              : {}),
        }),
      })
        .then(async (r) => {
          // Read body as text first so we can surface non-JSON errors
          // (Vercel timeout pages, HTML 502/504 responses, etc.) instead
          // of throwing a useless "Unexpected token" JSON parse error.
          const raw = await r.text();
          let parsed: { url?: string; error?: string; engine?: string; kind?: string } = {};
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            const snippet = raw.slice(0, 160).replace(/\s+/g, " ").trim();
            return { url: undefined, error: `HTTP ${r.status}: ${snippet || "non-JSON response"}` };
          }
          if (!r.ok && !parsed.error) {
            return { url: undefined, error: `HTTP ${r.status}` };
          }
          return parsed;
        })
        .then(({ url, error: apiErr, kind }) => {
          if (url) {
            setSlideImages((prev) => { const next = [...prev]; next[i] = url; return next; });
            loaded++;
            setFalCount(loaded);
            if (loaded + failed === FAL_TOTAL) setFalStatus("done");
          } else {
            // A refusal is not a fault to retry — say so, rather than dumping
            // fal's JSON body at someone who cannot act on it.
            const msg = kind === "content_policy"
              ? "The image engine declined this concept. Rewrite the hook image prompt in Refine image, then generate again."
              : apiErr ?? "Image generation failed";
            setFalErrors((prev) => { const next = [...prev]; next[i] = msg; return next; });
            failed++;
            if (loaded + failed === FAL_TOTAL) setFalStatus(loaded > 0 ? "done" : "failed");
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Network error";
          setFalErrors((prev) => { const next = [...prev]; next[i] = msg; return next; });
          failed++;
          if (loaded + failed === FAL_TOTAL) setFalStatus(loaded > 0 ? "done" : "failed");
        });
    });

  }

  async function handleTopicNext(t: string, tone: HookTone, subjectId?: string, conciseMode?: boolean, style?: CarouselImageStyle, format?: CarouselFormat, engSubType?: EngagementSubType, preset?: CarouselStylePreset, seoFooter?: boolean, contrast?: CarouselContrastMode, look?: CarouselLookSettings) {
    setPendingLook(look ?? varyLook);
    setTopic(t);
    setHookTone(tone);
    setConcise(conciseMode ?? false);
    setImageStyle(style ?? "realistic");
    setCarouselFormat(format ?? "standard");
    setEngagementSubType(engSubType ?? "reveal");
    setStylePreset(preset ?? "default");
    setContrastMode(contrast ?? "standard");
    setIncludeSeoFooter(seoFooter ?? true);
    setError(null);
    setWarning(null);

    setLoading(true);
    if (subjectId) {
      fetch(`/api/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markUsed" }),
      }).catch(() => {});
    }
    try {
      const res = await fetch(`${apiBase}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: t,
          ...(subjectId ? { subjectId } : {}),
          hookTone: tone,
          count: format === "did_you_know" ? 3 : 1,
          concise: conciseMode ?? false,
          format: format ?? "standard",
          engagementSubType: engSubType,
          stylePreset: preset ?? "default",
          includeSeoFooter: seoFooter ?? true,
          ...(varyFrom ? { structureFrom: { documentId: varyFrom.id } } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate content. Please try again.");
        return;
      }
      if (format === "did_you_know") {
        const dykVariants = (data.variants ?? []) as DidYouKnowContent[];
        if (dykVariants.length === 0) {
          setError("No usable variants returned. Try again.");
          return;
        }
        setDidYouKnowVariants(dykVariants);
        setSelectedDidYouKnow(0);
        setVariants([]);
        setFalStatus("idle");
        setFalCount(0);
        setStep(4);
        return;
      }
      const std = data as MultiVariantResponse & { styleRefsUsed?: number; brandStyle?: BrandStyle };
      setVariants(std.variants);
      setSelectedVariant(0);
      setSelectedHook(0);
      setBrandStyle(std.brandStyle ?? null);
      setHookImageUrl((data as { hookImageUrl?: string | null }).hookImageUrl ?? null);
      setFalStatus("idle");
      setFalCount(0);
      const msgs = [
        std.styleRefsUsed ? `${std.styleRefsUsed} style reference${std.styleRefsUsed > 1 ? "s" : ""} applied.` : null,
        std.warning ?? null,
      ].filter(Boolean);
      if (msgs.length) setWarning(msgs.join(" "));
      // Straight to the canvas. Content and Hook used to be two screens
      // between here and the artwork; both of their jobs now happen ON the
      // canvas — copy is edited in place, the hook is switched from the Brief
      // drawer — so stopping at them was asking you to visit a page to do
      // something you could already do on the next one.
      setStep(4);
      startImages({
        topic: t,
        content: std.variants[0],
        hookIndex: 0,
        hookTone: tone,
        imageStyle: style ?? "realistic",
        stylePreset: preset ?? "default",
        contrastMode: contrast ?? "standard",
        moodId,
      });
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Begin the image pass and record a recoverable draft.
   *
   * Previously inlined in HookStep's "Preview carousel" handler, which is
   * also why images could not start until you had visited that screen. Now
   * generation and rendering are one continuous act.
   */
  /**
   * Begin the image pass and record a recoverable draft.
   *
   * EVERY VALUE IS PASSED IN, none read from state, and that is the whole
   * point of the signature. This runs inside handleTopicNext, in the same tick
   * as the setTopic/setImageStyle/setStylePreset calls that precede it — so
   * the state this closure can see is the PREVIOUS render's, which on a fresh
   * carousel means `topic` is still "". The route rejected that with "Topic
   * required" and the run died before a single image was requested.
   *
   * It worked before only by accident of distance: image generation used to be
   * triggered from the Hook screen's "Preview carousel" button, two renders and
   * two user clicks later, by which time state had long settled. Moving it next
   * to the setters is what exposed it.
   */
  function startImages(args: {
    topic: string;
    content: CarouselContent;
    hookIndex: number;
    hookTone: HookTone;
    imageStyle: CarouselImageStyle;
    stylePreset: CarouselStylePreset;
    contrastMode: CarouselContrastMode;
    moodId: string | null;
  }) {
    generateSlideImages(
      args.topic, args.content, args.hookIndex,
      args.imageStyle, args.moodId, args.stylePreset, args.contrastMode,
    );
    try {
      const draftId = draftIdRef.current || `draft_${Date.now()}`;
      draftIdRef.current = draftId;
      const existing = JSON.parse(localStorage.getItem("lunia:drafts") ?? "[]") as Array<Record<string, unknown>>;
      const others = existing.filter((d) => d.id !== draftId);
      others.unshift({
        id: draftId, topic: args.topic, hookTone: args.hookTone,
        content: args.content, selectedHook: args.hookIndex,
        savedAt: new Date().toISOString(), _unsaved: true,
      });
      localStorage.setItem("lunia:drafts", JSON.stringify(others.slice(0, 20)));
    } catch {}
  }

  function handleRestart() {
    setStep(1);
    setTopic("");
    setHookTone("educational");
    setImageStyle("realistic");
    setVariants([]);
    setSelectedVariant(0);
    setSelectedHook(0);
    setBrandStyle(null);
    setStylePreset("default");
    setContrastMode("standard");
    setHookImageUrl(null);
    setSlideImages([null, null, null, null, null]);
    setError(null);
    setWarning(null);
    setFalStatus("idle");
    setFalCount(0);
    setFalErrors([null, null, null, null, null]);
    setDidYouKnowVariants([]);
    setSelectedDidYouKnow(0);
    setCarouselFormat("standard");
    clearActiveDraft();
  }

  // ─── fal.ai status badge ──────────────────────────────────────────────────
  const falBadge = falStatus !== "idle" && (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      border: "1px solid",
      borderColor: falStatus === "done" ? "rgba(95,158,117,0.4)" : falStatus === "failed" ? "rgba(184,92,92,0.4)" : "var(--accent-mid)",
      background: falStatus === "done" ? "rgba(95,158,117,0.08)" : falStatus === "failed" ? "rgba(184,92,92,0.08)" : "var(--accent-dim)",
      color: falStatus === "done" ? "var(--success)" : falStatus === "failed" ? "var(--error)" : "var(--accent)",
    }}>
      {falStatus === "loading" && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse 1s ease-in-out infinite" }} />
      )}
      {falStatus === "done" && "✓"}
      {falStatus === "failed" && "✗"}
      {" "}fal.ai
      {falStatus === "loading" && ` ${falCount}/1`}
      {falStatus === "done" && ` ${falCount}/1`}
    </div>
  );

  const inStudio = !loading && !error && step === 4 && carouselFormat !== "did_you_know" && (falStatus === "done" || falStatus === "idle") && !!config;

  return (
    // The studio is full-bleed inside the app shell: the editor shell owns its
    // own chrome. The brief, loaders and the Did You Know preview keep a page
    // frame with a title.
    <div className={inStudio ? "studio-frame" : undefined} style={inStudio ? undefined : { maxWidth: 1240, margin: "0 auto", padding: "40px 40px 80px" }}>
      {!inStudio && (
        <PageHeader
          title={step === 1 ? "New carousel" : "Carousel"}
          description={step === 1 ? "Pick a subject, shape the slides, and export a finished set for Instagram." : undefined}
          actions={<>
            {falBadge}
            {step !== 1 && <Button variant="secondary" onClick={handleRestart}>New</Button>}
          </>}
        />
      )}

      <>
          {restoredDraft && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--accent)" }}>
              <span>↩ Restored your unsaved carousel from this browser.</span>
              <button
                onClick={handleRestart}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                Discard & start over
              </button>
            </div>
          )}

          {warning && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
              ⚠ {warning}
            </div>
          )}

          {error && !loading && (
            <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--error)", marginBottom: 4 }}>Generation failed</div>
              <div style={{ fontSize: 13, color: "var(--error)", marginBottom: 12 }}>{error}</div>
              <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "var(--error)", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
                Try again
              </button>
            </div>
          )}

          {loading && <CarouselLoader />}

          {!loading && !error && step === 1 && (
            <TopicStep onNext={handleTopicNext} initialLook={varyLook ?? undefined} initialFormat={varyFrom?.format} varyFrom={varyFrom?.topic} onClearVary={onVaryConsumed} />
          )}
          {!loading && !error && step === 4 && carouselFormat === "did_you_know" && didYouKnowVariants.length > 0 && (
            <DidYouKnowPreviewStep
              topic={topic}
              variants={didYouKnowVariants}
              selected={selectedDidYouKnow}
              onSelect={setSelectedDidYouKnow}
            />
          )}
          {!loading && !error && step === 4 && carouselFormat !== "did_you_know" && falStatus === "loading" && (
            <RetroImageLoader items={[
              { label: "HOOK SLIDE", done: !!slideImages[0], error: falErrors[0] },
            ]} modelLabel={version === "v2" ? "fal-ai/recraft/v4/pro" : "fal-ai/recraft-v3"} />
          )}
          {!loading && !error && step === 4 && carouselFormat !== "did_you_know" && falStatus === "failed" && (
            <RetroImageError
              items={[
                { label: "HOOK SLIDE", done: !!slideImages[0], error: falErrors[0] },
              ]}
              onRetry={() => content && generateSlideImages(topic, content, selectedHook, imageStyle, moodId, stylePreset, contrastMode)}
              modelLabel={version === "v2" ? "fal-ai/recraft/v4/pro" : "fal-ai/recraft-v3"}
            />
          )}
          {!loading && !error && step === 4 && carouselFormat !== "did_you_know" && (falStatus === "done" || falStatus === "idle") && config && (
            <PreviewStep
              // Remount when a saved carousel loads over a restored draft, so
              // the studio's saved id, settings and verification come from the
              // document and Save cannot create a duplicate.
              key={loadedId ?? "draft"}
              config={config}
              hookTone={hookTone}
              onRestart={handleRestart}
              onSelectHook={setSelectedHook}
              initialImageStyle={imageStyle}
              initialContrastMode={contrastMode}
              initialMoodId={moodId}
              initialReelsMode={initialCarousel?.reelsMode ?? pendingLook?.reelsMode}
              initialCitationFontSize={initialCarousel?.citationFontSize ?? pendingLook?.citationFontSize}
              initialSlideBgColor={initialCarousel?.slideBgColor ?? pendingLook?.slideBgColor}
              initialDarkBackground={initialCarousel?.darkBackground ?? pendingLook?.darkBackground}
              initialLogoScale={initialCarousel?.logoScale ?? pendingLook?.logoScale}
              initialArrowScale={initialCarousel?.arrowScale ?? pendingLook?.arrowScale}
              initialHeadlineScale={initialCarousel?.headlineScale ?? pendingLook?.headlineScale}
              initialBodyScale={initialCarousel?.bodyScale ?? pendingLook?.bodyScale}
              initialIconScale={initialCarousel?.iconScale ?? pendingLook?.iconScale}
              initialShowLuniaLifeWatermark={initialCarousel?.showLuniaLifeWatermark ?? pendingLook?.showLuniaLifeWatermark}
              initialHookOverlays={initialCarousel?.hookOverlays ?? pendingLook?.hookOverlays}
              initialShowSlideArrows={initialCarousel?.showSlideArrows ?? pendingLook?.showSlideArrows}
              initialShowSlideNumbers={initialCarousel?.showSlideNumbers ?? pendingLook?.showSlideNumbers}
              initialShowCitationBars={initialCarousel?.showCitationBars ?? pendingLook?.showCitationBars}
              initialHookHeadlineWeight={initialCarousel?.hookHeadlineWeight ?? pendingLook?.hookHeadlineWeight}
              initialHookImagesByWeight={initialCarousel?.hookImagesByWeight}
              initialSavedId={loadedId}
              onSaved={onSaved}
              onExit={onExit}
              initialVerification={initialCarousel?.verification}
              carouselFormat={carouselFormat}
              stylePreset={stylePreset}
              onContentChange={(c) => {
                const next = [...variants];
                next[selectedVariant] = c.content;
                setVariants(next);
                // Also sync slideImages and hookImageUrl — needed for image regen
                if (c.slideImages) setSlideImages(c.slideImages as (string | null)[]);
                if (c.hookImageUrl !== undefined) setHookImageUrl(c.hookImageUrl ?? null);
              }}
            />
          )}
      </>
    </div>
  );
}
