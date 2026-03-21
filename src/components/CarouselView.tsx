"use client";
import { useState } from "react";
import { CarouselContent, CarouselConfig, GraphicStyle } from "@/lib/types";
import TopicStep from "@/components/carousel/steps/TopicStep";
import ContentStep from "@/components/carousel/steps/ContentStep";
import HookStep from "@/components/carousel/steps/HookStep";
import PreviewStep from "@/components/carousel/steps/PreviewStep";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Topic",
  2: "Content",
  3: "Hook + Graphics",
  4: "Preview",
};

export default function CarouselView() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState<CarouselContent | null>(null);
  const [selectedHook, setSelectedHook] = useState(0);
  const [graphicStyles, setGraphicStyles] = useState<[GraphicStyle, GraphicStyle, GraphicStyle]>(["wave", "bars", "steps"]);

  async function handleTopicNext(t: string) {
    setTopic(t);
    setLoading(true);
    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      setContent(data);
      setStep(2);
    } catch {
      alert("Failed to generate content. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const config: CarouselConfig | null = content
    ? { topic, content, selectedHook, graphicStyles }
    : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Carousel builder</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>Generate a 5-slide Instagram carousel for Lunia Life.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 40, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: step === s ? 700 : 500,
              color: step === s ? "#1e7a8a" : step > s ? "var(--muted)" : "var(--subtle)",
              borderBottom: step === s ? "2px solid #1e7a8a" : "2px solid transparent",
              marginBottom: -1,
              opacity: step < s ? 0.4 : 1,
            }}
          >
            {s}. {STEP_LABELS[s]}
          </div>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 16, color: "#1e7a8a", fontWeight: 600, marginBottom: 8 }}>Generating content...</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>Writing hooks, slides, and citations</div>
        </div>
      )}

      {/* Steps */}
      {!loading && step === 1 && (
        <TopicStep onNext={handleTopicNext} />
      )}
      {!loading && step === 2 && content && (
        <ContentStep
          content={content}
          onChange={setContent}
          onNext={() => setStep(3)}
        />
      )}
      {!loading && step === 3 && content && (
        <HookStep
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
      {!loading && step === 4 && config && (
        <PreviewStep
          config={config}
          onRestart={() => { setStep(1); setTopic(""); setContent(null); setSelectedHook(0); setGraphicStyles(["wave", "bars", "steps"]); }}
          onChangeHook={() => setStep(3)}
        />
      )}
    </div>
  );
}
