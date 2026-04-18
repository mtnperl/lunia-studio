"use client";
// AdView — top-level orchestrator for the Meta static-ad builder.
// 4-step flow: angle → concepts → visual + edit loop → preview/export.
// Mirrors CarouselView's shape so existing muscle memory transfers.

import { useEffect, useState } from "react";
import AdAngleStep from "@/components/ad/steps/AdAngleStep";
import AdConceptStep from "@/components/ad/steps/AdConceptStep";
import AdVisualStep from "@/components/ad/steps/AdVisualStep";
import AdPreviewStep from "@/components/ad/steps/AdPreviewStep";
import type {
  AdAngle,
  AdConcept,
  AdImageHistoryEntry,
  SavedAd,
  VisualFormat,
} from "@/lib/types";

type Step = 1 | 2 | 3 | 4;
type Aspect = "1:1" | "4:5";

const STEP_LABELS: Record<Step, string> = {
  1: "Angle",
  2: "Concept",
  3: "Visual",
  4: "Preview",
};

type ConceptWithLint = AdConcept & { complianceIssues?: string[] };

type Props = {
  initialAd?: SavedAd | null;
  onAdLoaded?: () => void;
};

export default function AdView({ initialAd, onAdLoaded }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 state
  const [angle, setAngle] = useState<AdAngle>("credibility");
  const [visualFormat, setVisualFormat] = useState<VisualFormat>("product-dark");
  const [customHook, setCustomHook] = useState<string>("");

  // Step 2 state
  const [concepts, setConcepts] = useState<ConceptWithLint[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<AdConcept | null>(null);

  // Step 3 state
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [activeChipKeys, setActiveChipKeys] = useState<string[]>([
    "brand-palette",
    "negative-space",
  ]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<AdImageHistoryEntry[]>([]);
  const [aspect, setAspect] = useState<Aspect>("1:1");

  // ─── Load a saved ad ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialAd) return;
    setAngle(initialAd.angle);
    setVisualFormat(initialAd.visualFormat);
    setSelectedConcept(initialAd.concept);
    setConcepts([initialAd.concept]);
    setImagePrompt(initialAd.imagePrompt);
    setImageUrl(initialAd.imageUrl);
    setImageHistory(initialAd.imageHistory ?? []);
    setAspect(initialAd.aspectRatio);
    setStep(4);
    onAdLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAd]);

  async function runGenerate(
    a: AdAngle,
    vf: VisualFormat,
    hook: string,
  ): Promise<ConceptWithLint[] | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle: a, visualFormat: vf, customHook: hook || undefined }),
      });
      const data = (await res.json()) as {
        concepts?: ConceptWithLint[];
        error?: string;
      };
      if (!res.ok || !data.concepts) {
        setError(data.error ?? "Concept generation failed");
        return null;
      }
      return data.concepts;
    } catch {
      setError("Network error — check connection and try again");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleAngleNext(a: AdAngle, vf: VisualFormat, hook: string) {
    setAngle(a);
    setVisualFormat(vf);
    setCustomHook(hook);
    const result = await runGenerate(a, vf, hook);
    if (result) {
      setConcepts(result);
      setStep(2);
    }
  }

  async function handleRegenerateConcepts() {
    const result = await runGenerate(angle, visualFormat, customHook);
    if (result) setConcepts(result);
  }

  async function seedImagePrompt(concept: AdConcept): Promise<string> {
    // Ask Claude to rewrite the concept's visualDirection into a Recraft-V4-ready
    // prompt with brand guardrails + active chips. On failure, fall back to the
    // raw visualDirection so the user can still generate something.
    try {
      const res = await fetch("/api/ad/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPrompt: concept.visualDirection,
          visualFormat,
          activeChipKeys,
        }),
      });
      const data = (await res.json()) as { prompt?: string; error?: string };
      if (res.ok && data.prompt) return data.prompt;
    } catch {
      // fall through
    }
    return concept.visualDirection;
  }

  async function handlePickConcept(concept: AdConcept) {
    setSelectedConcept(concept);
    setLoading(true);
    setError(null);
    try {
      const seeded = await seedImagePrompt(concept);
      setImagePrompt(seeded);
      setImageUrl(null);
      setImageHistory([]);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setStep(1);
    setConcepts([]);
    setSelectedConcept(null);
    setImagePrompt("");
    setImageUrl(null);
    setImageHistory([]);
    setCustomHook("");
    setError(null);
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            Meta ad builder
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>
            Generate a compliant, on-brand static ad for Lunia Life. Recraft V4 + Seedream 5 Lite Edit.
          </p>
        </div>
        <button
          onClick={handleRestart}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          New
        </button>
      </div>

      {/* Step indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 36,
          borderBottom: "1px solid var(--border)",
          paddingBottom: 0,
        }}
      >
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

      {error && !loading && (
        <div
          style={{
            background: "rgba(184,92,92,0.08)",
            border: "1px solid rgba(184,92,92,0.3)",
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--error)", marginBottom: 4 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: "var(--error)", marginBottom: 12 }}>{error}</div>
          <button
            onClick={() => setError(null)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--error)",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
              fontFamily: "inherit",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "24px 18px",
            fontSize: 13,
            color: "var(--muted)",
            textAlign: "center",
          }}
        >
          Generating with Claude Sonnet 4.5…
        </div>
      )}

      {!loading && step === 1 && <AdAngleStep onNext={handleAngleNext} />}

      {!loading && step === 2 && (
        <AdConceptStep
          concepts={concepts}
          onPick={handlePickConcept}
          onRegenerate={handleRegenerateConcepts}
          regenerating={loading}
          onBack={() => setStep(1)}
        />
      )}

      {!loading && step === 3 && selectedConcept && (
        <AdVisualStep
          concept={selectedConcept}
          visualFormat={visualFormat}
          prompt={imagePrompt}
          onPromptChange={setImagePrompt}
          activeChipKeys={activeChipKeys}
          onActiveChipKeysChange={setActiveChipKeys}
          imageUrl={imageUrl}
          aspect={aspect}
          onAspectChange={setAspect}
          history={imageHistory}
          onHistoryChange={setImageHistory}
          onImageChange={setImageUrl}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {!loading && step === 4 && selectedConcept && imageUrl && (
        <AdPreviewStep
          concept={selectedConcept}
          imageUrl={imageUrl}
          imagePrompt={imagePrompt}
          imageHistory={imageHistory}
          aspect={aspect}
          angle={angle}
          visualFormat={visualFormat}
          onAspectChange={setAspect}
          onBack={() => setStep(3)}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
