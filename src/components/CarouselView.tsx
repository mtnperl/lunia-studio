"use client";
import { useState } from "react";
import { CarouselContent, CarouselConfig, GraphicStyle, HookTone, MultiVariantResponse } from "@/lib/types";
import TopicStep from "@/components/carousel/steps/TopicStep";
import ContentStep from "@/components/carousel/steps/ContentStep";
import HookStep from "@/components/carousel/steps/HookStep";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import CarouselLibraryView from "@/components/CarouselLibraryView";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Topic",
  2: "Content",
  3: "Hook + Graphics",
  4: "Preview",
};

const CAROUSEL_LOADER_MSGS = [
  "Reading topic...",
  "Drafting hooks...",
  "Writing slide content...",
  "Pulling citations...",
  "Applying brand rules...",
  "Checking for em-dashes...",
  "Formatting CTA...",
  "Finalizing...",
];

function CarouselLoader({ count }: { count: number }) {
  return (
    <div className="loader-wrap" style={{ marginTop: 20 }}>
      <div className="hp-label">
        {count > 1 ? `GENERATING ${count} VARIANTS` : "GEN PROGRESS"}
      </div>
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

export default function CarouselView() {
  const [view, setView] = useState<"builder" | "library">("builder");
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [variantCount, setVariantCount] = useState(1);
  const [variants, setVariants] = useState<CarouselContent[]>([]);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedHook, setSelectedHook] = useState(0);
  const [graphicStyles, setGraphicStyles] = useState<[GraphicStyle, GraphicStyle, GraphicStyle]>(["wave", "bars", "steps"]);

  const content = variants[selectedVariant] ?? null;

  const config: CarouselConfig | null = content
    ? { topic, content, selectedHook, graphicStyles }
    : null;

  async function handleTopicNext(t: string, tone: HookTone, count: number) {
    setTopic(t);
    setHookTone(tone);
    setVariantCount(count);
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, hookTone: tone, count }),
      });
      const data: MultiVariantResponse & { error?: string } = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to generate content. Please try again.");
        return;
      }
      setVariants(data.variants);
      setSelectedVariant(0);
      setSelectedHook(0);
      if (data.warning) setWarning(data.warning);
      setStep(2);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleVariantSelect(i: number) {
    setSelectedVariant(i);
    setSelectedHook(0);
  }

  function handleRestart() {
    setStep(1);
    setTopic("");
    setHookTone("educational");
    setVariantCount(1);
    setVariants([]);
    setSelectedVariant(0);
    setSelectedHook(0);
    setGraphicStyles(["wave", "bars", "steps"]);
    setError(null);
    setWarning(null);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Carousel builder</h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>Generate a 5-slide Instagram carousel for Lunia Life.</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setView("builder")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: view === "builder" ? "var(--surface)" : "transparent",
              color: view === "builder" ? "var(--text)" : "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            New
          </button>
          <button
            onClick={() => setView("library")}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              background: view === "library" ? "var(--surface)" : "transparent",
              color: view === "library" ? "var(--text)" : "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Library
          </button>
        </div>
      </div>

      {view === "library" && <CarouselLibraryView />}

      {view === "builder" && (
        <>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 0, marginBottom: 36, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
            {([1, 2, 3, 4] as Step[]).map((s) => (
              <div
                key={s}
                style={{
                  padding: "8px 18px",
                  fontSize: 13,
                  fontWeight: step === s ? 700 : 500,
                  color: step === s ? "var(--text)" : "var(--subtle)",
                  borderBottom: step === s ? "2px solid var(--text)" : "2px solid transparent",
                  marginBottom: -1,
                  opacity: step < s ? 0.35 : 1,
                }}
              >
                {s}. {STEP_LABELS[s]}
              </div>
            ))}
          </div>

          {/* Warning banner */}
          {warning && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
              ⚠ {warning}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "14px 18px", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#9b1c1c", marginBottom: 4 }}>Generation failed</div>
              <div style={{ fontSize: 13, color: "#9b1c1c", marginBottom: 12 }}>{error}</div>
              <button
                onClick={() => setError(null)}
                style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "#9b1c1c", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && <CarouselLoader count={variantCount} />}

          {/* Steps */}
          {!loading && !error && step === 1 && (
            <TopicStep onNext={handleTopicNext} />
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
              variants={variants}
              selectedVariant={selectedVariant}
              onSelectVariant={handleVariantSelect}
              content={content}
              selectedHook={selectedHook}
              graphicStyles={graphicStyles}
              onSelectHook={setSelectedHook}
              onSelectStyle={(slideIdx, style) => {
                const next: [GraphicStyle, GraphicStyle, GraphicStyle] = [...graphicStyles];
                next[slideIdx] = style;
                setGraphicStyles(next);
              }}
              onNext={() => setStep(4)}
            />
          )}
          {!loading && !error && step === 4 && config && (
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
