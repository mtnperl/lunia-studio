"use client";
import { useState, useEffect, useRef } from "react";
import { BrandStyle, CarouselContent, CarouselConfig, CarouselFormat, DidYouKnowContent, EngagementSubType, HookTone, MultiVariantResponse, SavedCarousel } from "@/lib/types";
import TopicStep, { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import ContentStep from "@/components/carousel/steps/ContentStep";
import HookStep from "@/components/carousel/steps/HookStep";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import DidYouKnowPreviewStep from "@/components/carousel/steps/DidYouKnowPreviewStep";
import { RetroImageLoader, RetroImageError } from "@/components/carousel/shared/RetroLoader";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Topic",
  2: "Content",
  3: "Hook",
  4: "Preview",
};

const CAROUSEL_LOADER_MSGS = [
  "Reading topic...",
  "Drafting hooks...",
  "Writing slide content...",
  "Pulling citations...",
  "Applying brand rules...",
  "Generating infographics...",
  "Formatting CTA...",
  "Finalizing...",
];


function CarouselLoader() {
  return (
    <div className="loader-wrap" style={{ marginTop: 20 }}>
      <div className="hp-label">GEN PROGRESS</div>
      <div className="hp-track"><div className="hp-fill" /></div>
      <div className="loader-log">
        {CAROUSEL_LOADER_MSGS.slice(0, 4).map((msg, i, arr) => (
          <div key={i} className={i === arr.length - 1 ? "active" : ""}>
            {i === arr.length - 1 ? `> ${msg}` : `  ${msg} OK`}
            {i === arr.length - 1 && <span className="blink">_</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CarouselView({ initialCarousel, onCarouselLoaded }: { initialCarousel?: SavedCarousel | null; onCarouselLoaded?: () => void }) {
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
  const [hookImageUrl, setHookImageUrl] = useState<string | null>(null);
  const [slideImages, setSlideImages] = useState<(string | null)[]>([null, null, null, null, null]);

  // ─── Load saved carousel ──────────────────────────────────────────────────
  useEffect(() => {
    if (!initialCarousel) return;
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
  const [carouselFormat, setCarouselFormat] = useState<CarouselFormat>("standard");
  const [engagementSubType, setEngagementSubType] = useState<EngagementSubType>("reveal");
  const [didYouKnowVariants, setDidYouKnowVariants] = useState<DidYouKnowContent[]>([]);
  const [selectedDidYouKnow, setSelectedDidYouKnow] = useState(0);
  const [falStatus, setFalStatus] = useState<"idle" | "loading" | "done" | "failed">("idle");
  const [falCount, setFalCount] = useState(0); // how many images loaded so far
  const [falErrors, setFalErrors] = useState<(string | null)[]>([null, null, null, null, null]);

  const content = variants[selectedVariant] ?? null;

  const config: CarouselConfig | null = content
    ? { topic, content, selectedHook, brandStyle: brandStyle ?? undefined, hookImageUrl: hookImageUrl ?? undefined, slideImages }
    : null;

  // Only generate hook (0) — content + CTA slides stay clean with brand colors
  const FAL_SLIDE_INDICES = [0] as const;
  const FAL_TOTAL = FAL_SLIDE_INDICES.length;

  function generateSlideImages(currentTopic: string, currentContent: CarouselContent, currentHookIndex: number, currentImageStyle: CarouselImageStyle = "realistic") {
    setSlideImages([null, null, null, null, null]);
    setFalErrors([null, null, null, null, null]);
    setFalStatus("loading");
    setFalCount(0);
    const hook = currentContent.hooks[currentHookIndex];
    let loaded = 0;
    let failed = 0;
    FAL_SLIDE_INDICES.forEach((i) => {
      fetch('/api/carousel/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIndex: i, topic: currentTopic, hook, imagePrompt: currentContent.imagePrompt, imageStyle: currentImageStyle }),
      })
        .then((r) => r.json())
        .then(({ url, error: apiErr }) => {
          if (url) {
            setSlideImages((prev) => { const next = [...prev]; next[i] = url; return next; });
            loaded++;
            setFalCount(loaded);
            if (loaded + failed === FAL_TOTAL) setFalStatus("done");
          } else {
            const msg = apiErr ?? "Image generation failed";
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

  async function handleTopicNext(t: string, tone: HookTone, subjectId?: string, conciseMode?: boolean, style?: CarouselImageStyle, format?: CarouselFormat, engSubType?: EngagementSubType) {
    setTopic(t);
    setHookTone(tone);
    setConcise(conciseMode ?? false);
    setImageStyle(style ?? "realistic");
    setCarouselFormat(format ?? "standard");
    setEngagementSubType(engSubType ?? "reveal");
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
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: t,
          hookTone: tone,
          count: format === "did_you_know" ? 3 : 1,
          concise: conciseMode ?? false,
          format: format ?? "standard",
          engagementSubType: engSubType,
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
      setHookImageUrl((data as any).hookImageUrl ?? null);
      setFalStatus("idle");
      setFalCount(0);
      const msgs = [
        std.styleRefsUsed ? `${std.styleRefsUsed} style reference${std.styleRefsUsed > 1 ? "s" : ""} applied.` : null,
        std.warning ?? null,
      ].filter(Boolean);
      if (msgs.length) setWarning(msgs.join(" "));
      setStep(2);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>Carousel builder</h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>Generate a 5-slide Instagram carousel for Lunia Life.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* fal.ai status badge */}
          {falBadge}

          <button
            onClick={handleRestart}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 600,
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
            }}
          >New</button>
        </div>
      </div>

      <>
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div key={s} style={{
                padding: "8px 18px", fontSize: 13,
                fontWeight: step === s ? 700 : 500,
                color: step === s ? "var(--accent)" : "var(--subtle)",
                borderBottom: step === s ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: -1,
                opacity: step < s ? 0.35 : 1,
              }}>
                {s}. {STEP_LABELS[s]}
              </div>
            ))}
          </div>

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
            <TopicStep onNext={handleTopicNext} />
          )}
          {!loading && !error && step === 2 && content && (
            <ContentStep
              content={content}
              topic={topic}
              hookTone={hookTone}
              carouselFormat={carouselFormat}
              onChange={(c) => {
                const next = [...variants];
                next[selectedVariant] = c;
                setVariants(next);
              }}
              onNext={() => setStep(3)}
            />
          )}
          {!loading && !error && step === 3 && content && (
            <HookStep
              content={content}
              selectedHook={selectedHook}
              onSelectHook={setSelectedHook}
              onNext={() => {
                setStep(4);
                generateSlideImages(topic, content, selectedHook, imageStyle);
                // Persist draft so HomeView can reopen it (30-min window)
                try {
                  const draftId = draftIdRef.current || `draft_${Date.now()}`;
                  draftIdRef.current = draftId;
                  const existing = JSON.parse(localStorage.getItem("lunia:drafts") ?? "[]") as Array<Record<string, unknown>>;
                  const others = existing.filter((d) => d.id !== draftId);
                  others.unshift({ id: draftId, topic, hookTone, content, selectedHook, savedAt: new Date().toISOString(), _unsaved: true });
                  localStorage.setItem("lunia:drafts", JSON.stringify(others.slice(0, 20)));
                } catch {}
              }}
              onImagePromptChange={(prompt) => {
                const next = [...variants];
                next[selectedVariant] = { ...content, imagePrompt: prompt };
                setVariants(next);
              }}
              brandStyle={brandStyle}
              backgroundImageUrl={hookImageUrl}
              topic={topic}
              imageStyle={imageStyle}
              onImageStyleChange={setImageStyle}
            />
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
            ]} />
          )}
          {!loading && !error && step === 4 && carouselFormat !== "did_you_know" && falStatus === "failed" && (
            <RetroImageError
              items={[
                { label: "HOOK SLIDE", done: !!slideImages[0], error: falErrors[0] },
              ]}
              onRetry={() => content && generateSlideImages(topic, content, selectedHook, imageStyle)}
            />
          )}
          {!loading && !error && step === 4 && carouselFormat !== "did_you_know" && (falStatus === "done" || falStatus === "idle") && config && (
            <PreviewStep
              config={config}
              hookTone={hookTone}
              onRestart={handleRestart}
              onChangeHook={() => setStep(3)}
              initialImageStyle={imageStyle}
              initialReelsMode={initialCarousel?.reelsMode}
              initialCitationFontSize={initialCarousel?.citationFontSize}
              carouselFormat={carouselFormat}
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
