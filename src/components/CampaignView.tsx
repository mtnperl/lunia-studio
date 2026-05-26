"use client";
import { useState, useEffect, useRef } from "react";
import type { CampaignContent, SavedCampaign } from "@/lib/types";
import BriefStep, { type CampaignBrief } from "@/components/campaign/BriefStep";
import CampaignEditor from "@/components/campaign/CampaignEditor";
import { CampaignGenLoader } from "@/components/campaign/Loaders";

export default function CampaignView({
  initialCampaign,
  onCampaignLoaded,
}: {
  initialCampaign?: SavedCampaign | null;
  onCampaignLoaded?: () => void;
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

  async function handleGenerate(brief: CampaignBrief) {
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
      setTopic(data.topic ?? brief.topic);
      setContent(data.content);
      setSavedId(null);
      setStep(2);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleRestart() {
    setStep(1);
    setTopic("");
    setContent(null);
    setSavedId(null);
    setError(null);
    // Reset the loaded-id ref so the next library open re-seeds editor state.
    loadedIdRef.current = null;
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
