"use client";
import { useState, useEffect, useRef } from "react";
import type { CampaignContent, SavedCampaign, SavedCarousel } from "@/lib/types";
import BriefStep, { type CampaignBrief } from "@/components/campaign/BriefStep";
import CampaignEditor from "@/components/campaign/CampaignEditor";
import { CampaignGenLoader } from "@/components/campaign/Loaders";

export default function CampaignView({
  initialCampaign,
  initialCarousel,
  onCampaignLoaded,
  onCarouselConsumed,
}: {
  initialCampaign?: SavedCampaign | null;
  initialCarousel?: SavedCarousel | null;
  onCampaignLoaded?: () => void;
  onCarouselConsumed?: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState<CampaignContent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Load a saved campaign from the library. Guard against re-loading the
  // SAME campaign more than once: if the library hands us the same id we
  // already have open, do nothing — otherwise this effect would clobber any
  // unsaved edits (e.g. a freshly generated hero image whose URL hasn't been
  // saved yet) with the stale server snapshot every time the parent
  // re-renders.
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCampaign) return;
    if (loadedIdRef.current === initialCampaign.id) {
      // Already loaded this campaign; ignore reruns.
      onCampaignLoaded?.();
      return;
    }
    loadedIdRef.current = initialCampaign.id;
    setTopic(initialCampaign.topic);
    setContent(initialCampaign.content);
    setSavedId(initialCampaign.id);
    setStep(2);
    onCampaignLoaded?.();
  }, [initialCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate(brief: CampaignBrief, pinHeroUrl?: string | null) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      const data = await res.json();
      if (!res.ok || !data.content) {
        setError(data.error ?? "Generation failed, please try again.");
        return;
      }
      const next: CampaignContent = data.content;
      if (pinHeroUrl) {
        const hero = next.images.find((i) => i.role === "hero");
        if (hero) hero.url = pinHeroUrl;
      }
      setTopic(data.topic ?? brief.topic);
      setContent(next);
      setSavedId(null);
      setStep(2);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Seed the campaign from a carousel handed in by the library — auto-runs
  // generation using the carousel caption as the brief topic, then pins the
  // hero image to the carousel's hook image. Guarded by a ref so the same
  // carousel never re-triggers generation on subsequent re-renders.
  const seededCarouselIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCarousel) return;
    if (initialCampaign) return; // explicit library campaign wins
    if (seededCarouselIdRef.current === initialCarousel.id) {
      onCarouselConsumed?.();
      return;
    }
    seededCarouselIdRef.current = initialCarousel.id;
    const caption = initialCarousel.content?.caption?.trim() ?? "";
    const topicSeed = (caption.length >= 4 ? caption : initialCarousel.topic).slice(0, 600);
    const hookImg =
      initialCarousel.hookImageUrl ??
      initialCarousel.slideImages?.find((u): u is string => !!u) ??
      null;
    const brief: CampaignBrief = {
      topic: topicSeed,
      occasion: "",
      offer: "",
      ctaUrl: "https://www.lunialife.com/products/lunia-sleep-vitamins",
      tone: "calm, editorial",
    };
    handleGenerate(brief, hookImg);
    onCarouselConsumed?.();
  }, [initialCarousel]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRestart() {
    setStep(1);
    setTopic("");
    setContent(null);
    setSavedId(null);
    setError(null);
    // Reset the loaded-id ref so the next library open re-seeds editor state.
    loadedIdRef.current = null;
    // Likewise reset the carousel seed ref so re-opening the same carousel
    // from the library after a manual New re-runs generation.
    seededCarouselIdRef.current = null;
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Campaign builder
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>
            Generate a Lunia Life marketing email — subject, copy, and images — then export the HTML.
          </p>
        </div>
        {step === 2 && (
          <button
            onClick={handleRestart}
            style={{
              padding: "6px 14px", fontSize: 13, fontWeight: 600,
              background: "var(--surface)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 7,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >New</button>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "var(--error)", marginBottom: 8 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "var(--error)", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
            Dismiss
          </button>
        </div>
      )}

      {loading && <CampaignGenLoader />}

      {!loading && step === 1 && <BriefStep onGenerate={handleGenerate} />}

      {!loading && step === 2 && content && (
        <CampaignEditor
          topic={topic}
          content={content}
          savedId={savedId}
          onChange={setContent}
          onSaved={setSavedId}
        />
      )}
    </div>
  );
}
