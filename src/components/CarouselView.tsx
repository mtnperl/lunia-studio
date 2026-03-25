"use client";
import { useState, useEffect } from "react";
import { BrandStyle, CarouselContent, CarouselConfig, HookTone, MultiVariantResponse } from "@/lib/types";
import TopicStep from "@/components/carousel/steps/TopicStep";
import ContentStep from "@/components/carousel/steps/ContentStep";
import HookStep from "@/components/carousel/steps/HookStep";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import CarouselLibraryView from "@/components/CarouselLibraryView";

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

// ─── Mock content for test mode ───────────────────────────────────────────────
const MOCK_CONTENT: CarouselContent = {
  hooks: [
    {
      headline: "Your body repairs itself while you sleep.",
      subline: "But only if you give it the right conditions.",
    },
    {
      headline: "Magnesium is your brain's off switch.",
      subline: "Most adults are deficient — and don't know it.",
    },
    {
      headline: "You're not bad at sleeping.",
      subline: "You're missing one mineral.",
    },
  ],
  slides: [
    {
      headline: "What happens at 11pm",
      body: "Cortisol drops. Melatonin rises. Your brain starts clearing the metabolic waste that built up during the day.",
      citation: "Sleep onset takes 7× longer when cortisol stays elevated",
      graphic: JSON.stringify({
        component: "timeline",
        data: { events: [
          { time: "10PM", label: "Cortisol starts to drop" },
          { time: "11PM", label: "Melatonin surges" },
          { time: "2AM", label: "Deep sleep peaks" },
          { time: "6AM", label: "Cortisol rises again" },
        ]},
      }),
    },
    {
      headline: "Why magnesium works",
      body: "Magnesium glycinate activates GABA receptors — the same pathway targeted by sleep medications, but without the dependency.",
      citation: "Participants fell asleep 17 minutes faster in clinical trials",
      graphic: JSON.stringify({
        component: "stat",
        data: { stat: "17", unit: "min", label: "Faster sleep onset with magnesium glycinate" },
      }),
    },
    {
      headline: "The L-theanine effect",
      body: "L-theanine increases alpha brain waves — the relaxed-but-alert state that makes winding down feel effortless.",
      citation: "Alpha wave activity increases within 30–40 minutes",
      graphic: JSON.stringify({
        component: "checklist",
        data: { items: [
          "L-theanine taken 30-60 min before bed",
          "Binds to GABA-A receptors",
          "Alpha brain waves increase",
          "Deep relaxation without sedation",
        ]},
      }),
    },
  ],
  cta: {
    headline: "Sleep better, starting tonight.",
    followLine: "Follow @lunia_life for evidence-based sleep science.",
  },
  caption: "#sleep #magnesium #lunia #sleepscience #wellness",
  imagePrompt: "Extreme macro of raw magnesium glycinate crystals dissolving in still dark water, single cold shaft of blue-white light striking crystal edges, deep navy background, ultra-sharp focus, shallow depth of field, editorial pharmaceutical photography, absolute stillness",
};

const MOCK_BRAND_STYLE: BrandStyle = {
  background: "#f0ece6",
  hookBackground: "#0d2137",
  headline: "#1e7a8a",
  hookHeadline: "#ffffff",
  body: "#2c3e50",
  secondary: "#9ab0b8",
  accent: "#1e7a8a",
};

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

// ─── Retro 90s game loader for fal.ai image generation ────────────────────────
// Only hook (index 0) and CTA (index 4) get fal.ai backgrounds.
// Content slides stay clean with brand colors + infographics.
const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];

type LoaderItem = { label: string; done: boolean; error: string | null };

function RetroImageLoader({ items }: { items: LoaderItem[] }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 180);
    return () => clearInterval(t);
  }, []);

  const total = items.length;
  const completed = items.filter((it) => it.done || !!it.error).length;
  const loaded = items.filter((it) => it.done).length;
  const activeIdx = items.findIndex((it) => !it.done && !it.error);
  const barFilled = Math.round((completed / total) * 28);
  const bar = "█".repeat(barFilled) + "░".repeat(28 - barFilled);
  const pct = Math.round((completed / total) * 100);
  const spinner = SPINNER_FRAMES[frame];

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: "#000",
      color: "#fff",
      border: "3px solid #fff",
      borderRadius: 2,
      padding: "32px 36px",
      maxWidth: 520,
      margin: "48px auto",
      position: "relative",
      overflow: "hidden",
      userSelect: "none",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)`,
      }} />

      {/* Title bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18,
        fontSize: 11, letterSpacing: "0.12em",
      }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span style={{ color: "#888" }}>fal-ai/recraft-v3 · v2.0</span>
        <span>{spinner}</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 22, fontSize: 12, letterSpacing: "0.08em" }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
          RENDERING SLIDE BACKGROUNDS
        </div>
        <div style={{ color: "#888", fontSize: 11 }}>
          MODEL: fal-ai/recraft-v3 · realistic_image · 1024×1280
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: "#888", marginBottom: 5, letterSpacing: "0.1em" }}>
          ── RENDER PROGRESS ──────────────────────
        </div>
        <div style={{ fontSize: 14, letterSpacing: 1.5, marginBottom: 6 }}>[{bar}]</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#ccc" }}>
          <span>{loaded} / {total} BACKGROUNDS COMPLETE</span>
          <span>{pct}%</span>
        </div>
      </div>

      {/* Slide log */}
      <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 16 }}>
        {items.map((item, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={i} style={{ marginBottom: item.error ? 8 : 5 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, fontSize: 12, letterSpacing: "0.06em",
                color: item.error ? "#f55" : item.done ? "#fff" : isActive ? "#fff" : "#444",
              }}>
                <span style={{ width: 16, flexShrink: 0 }}>
                  {item.error ? "✗" : item.done ? "✓" : isActive ? ">" : "·"}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 11 }}>
                  {item.error ? "FAILED" : item.done ? "DONE" : isActive
                    ? <span>GEN{frame % 2 === 0 ? "..." : ".  "}<span className="blink">█</span></span>
                    : "QUEUE"}
                </span>
              </div>
              {item.error && (
                <div style={{ marginLeft: 26, fontSize: 10, color: "#f55", marginTop: 2, lineHeight: 1.4 }}>
                  ERR: {item.error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
        <span>RECRAFT V3 — ANTHROPIC × FAL.AI</span>
        <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
      </div>
    </div>
  );
}

// ─── Retro error screen ───────────────────────────────────────────────────────
function RetroImageError({ items, onRetry }: { items: LoaderItem[]; onRetry: () => void }) {
  const errored = items.filter((it) => !!it.error);
  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      background: "#000", color: "#f55", border: "3px solid #f55",
      borderRadius: 2, padding: "32px 36px", maxWidth: 520, margin: "48px auto",
    }}>
      <div style={{ borderBottom: "1px solid #f55", paddingBottom: 10, marginBottom: 18, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
        <span>RENDER ERROR</span>
        <span>EXIT CODE: 1</span>
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>!! IMAGE GENERATION FAILED !!</div>
        <div style={{ fontSize: 12, color: "#c44", marginTop: 4 }}>fal-ai/recraft-v3 could not render the background images.</div>
      </div>
      <div style={{ borderTop: "1px solid #500", borderBottom: "1px solid #500", padding: "12px 0", marginBottom: 20 }}>
        {errored.map((item, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.06em" }}>
              <span style={{ marginRight: 10 }}>✗</span>{item.label}
            </div>
            <div style={{ marginLeft: 22, fontSize: 10, color: "#c44", marginTop: 3, lineHeight: 1.5 }}>{item.error}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={onRetry} style={{
          fontFamily: "'Courier New', Courier, monospace", background: "#f55", color: "#000",
          border: "none", padding: "8px 20px", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.08em", cursor: "pointer",
        }}>[RETRY]</button>
        <span style={{ fontSize: 10, color: "#c44" }}>Check FAL_KEY · rate limits · fal.ai status</span>
      </div>
    </div>
  );
}

export default function CarouselView() {
  const [view, setView] = useState<"builder" | "library">("builder");
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [variants, setVariants] = useState<CarouselContent[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedHook, setSelectedHook] = useState(0);
  const [brandStyle, setBrandStyle] = useState<BrandStyle | null>(null);
  const [hookImageUrl, setHookImageUrl] = useState<string | null>(null);
  const [slideImages, setSlideImages] = useState<(string | null)[]>([null, null, null, null, null]);

  // ─── Test mode & fal.ai status ────────────────────────────────────────────
  const [testMode, setTestMode] = useState(false);
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

  function generateSlideImages(currentTopic: string, currentContent: CarouselContent, currentHookIndex: number) {
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
        body: JSON.stringify({ slideIndex: i, topic: currentTopic, hook, imagePrompt: currentContent.imagePrompt }),
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

  async function handleTopicNext(t: string, tone: HookTone, subjectId?: string) {
    setTopic(t);
    setHookTone(tone);
    setError(null);
    setWarning(null);

    // ── Test mode: skip generation, inject mock content ──────────────────────
    if (testMode) {
      setVariants([MOCK_CONTENT]);
      setSelectedVariant(0);
      setSelectedHook(0);
      setBrandStyle(MOCK_BRAND_STYLE);
      setHookImageUrl(null);
      setFalStatus("idle");
      setFalCount(0);
      setStep(3); // jump straight to Hook step
      return;
    }

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
        body: JSON.stringify({ topic: t, hookTone: tone, count: 1 }),
      });
      const data: MultiVariantResponse & { error?: string; styleRefsUsed?: number; brandStyle?: BrandStyle } = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate content. Please try again.");
        return;
      }
      setVariants(data.variants);
      setSelectedVariant(0);
      setSelectedHook(0);
      setBrandStyle(data.brandStyle ?? null);
      setHookImageUrl((data as any).hookImageUrl ?? null);
      setFalStatus("idle");
      setFalCount(0);
      const msgs = [
        data.styleRefsUsed ? `${data.styleRefsUsed} style reference${data.styleRefsUsed > 1 ? "s" : ""} applied.` : null,
        data.warning ?? null,
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
  }

  // ─── fal.ai status badge ──────────────────────────────────────────────────
  const falBadge = falStatus !== "idle" && (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      border: "1px solid",
      borderColor: falStatus === "done" ? "rgba(34,197,94,0.4)" : falStatus === "failed" ? "rgba(239,68,68,0.4)" : "rgba(30,122,138,0.4)",
      background: falStatus === "done" ? "rgba(34,197,94,0.08)" : falStatus === "failed" ? "rgba(239,68,68,0.08)" : "rgba(30,122,138,0.08)",
      color: falStatus === "done" ? "#15803d" : falStatus === "failed" ? "#dc2626" : "#1e7a8a",
    }}>
      {falStatus === "loading" && (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1e7a8a", display: "inline-block", animation: "pulse 1s ease-in-out infinite" }} />
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
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Carousel builder</h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>Generate a 5-slide Instagram carousel for Lunia Life.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* fal.ai status badge */}
          {falBadge}

          {/* Test mode toggle */}
          <button
            onClick={() => setTestMode((v) => !v)}
            title="Skip content generation and jump straight to design"
            style={{
              padding: "5px 12px", fontSize: 12, fontWeight: 700,
              background: testMode ? "#1e7a8a" : "transparent",
              color: testMode ? "#fff" : "var(--muted)",
              border: `1px solid ${testMode ? "#1e7a8a" : "var(--border)"}`,
              borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}
          >
            ⚡ Test mode
          </button>

          <button
            onClick={() => { setView("builder"); handleRestart(); }}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 600,
              background: view === "builder" ? "var(--surface)" : "transparent",
              color: view === "builder" ? "var(--text)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
            }}
          >New</button>
          <button
            onClick={() => setView("library")}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 600,
              background: view === "library" ? "var(--surface)" : "transparent",
              color: view === "library" ? "var(--text)" : "var(--muted)",
              border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
            }}
          >Library</button>
        </div>
      </div>

      {view === "library" && <CarouselLibraryView />}

      {view === "builder" && (
        <>
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div key={s} style={{
                padding: "8px 18px", fontSize: 13,
                fontWeight: step === s ? 700 : 500,
                color: step === s ? "var(--text)" : "var(--subtle)",
                borderBottom: step === s ? "2px solid var(--text)" : "2px solid transparent",
                marginBottom: -1,
                opacity: testMode && s === 2 ? 0.2 : step < s ? 0.35 : 1,
                textDecoration: testMode && s === 2 ? "line-through" : "none",
              }}>
                {s}. {STEP_LABELS[s]}
              </div>
            ))}
            {testMode && (
              <div style={{
                marginLeft: "auto", marginBottom: -1,
                padding: "4px 10px",
                fontSize: 11, fontWeight: 700,
                color: "#1e7a8a",
                background: "rgba(30,122,138,0.08)",
                border: "1px solid rgba(30,122,138,0.3)",
                borderRadius: 20,
              }}>
                ⚡ Test mode — content step skipped
              </div>
            )}
          </div>

          {warning && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
              ⚠ {warning}
            </div>
          )}

          {error && !loading && (
            <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#9b1c1c", marginBottom: 4 }}>Generation failed</div>
              <div style={{ fontSize: 13, color: "#9b1c1c", marginBottom: 12 }}>{error}</div>
              <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "#9b1c1c", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
                Try again
              </button>
            </div>
          )}

          {loading && <CarouselLoader />}

          {!loading && !error && step === 1 && (
            <TopicStep onNext={(t, tone, subjectId) => handleTopicNext(t, tone, subjectId)} testMode={testMode} />
          )}
          {!loading && !error && step === 2 && content && (
            <ContentStep
              content={content}
              topic={topic}
              hookTone={hookTone}
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
                generateSlideImages(topic, content, selectedHook);
                // Persist last-generated so HomeView shows it even if unsaved
                try {
                  localStorage.setItem("lunia:lastCarousel", JSON.stringify({
                    id: "__last__",
                    topic,
                    hookTone,
                    content,
                    selectedHook,
                    savedAt: new Date().toISOString(),
                    _unsaved: true,
                  }));
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
            />
          )}
          {!loading && !error && step === 4 && falStatus === "loading" && (
            <RetroImageLoader items={[
              { label: "HOOK SLIDE", done: !!slideImages[0], error: falErrors[0] },
            ]} />
          )}
          {!loading && !error && step === 4 && falStatus === "failed" && (
            <RetroImageError
              items={[
                { label: "HOOK SLIDE", done: !!slideImages[0], error: falErrors[0] },
              ]}
              onRetry={() => content && generateSlideImages(topic, content, selectedHook)}
            />
          )}
          {!loading && !error && step === 4 && (falStatus === "done" || falStatus === "idle") && config && (
            <PreviewStep
              config={config}
              hookTone={hookTone}
              onRestart={handleRestart}
              onChangeHook={() => setStep(3)}
              onContentChange={(c) => {
                const next = [...variants];
                next[selectedVariant] = c.content;
                setVariants(next);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
