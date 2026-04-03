"use client";

import { useState, useMemo } from "react";
import { VideoAdScene, VideoAdData, VideoAdSceneType, SceneImageConfig } from "@/lib/types";
import VideoTopicStep from "./video/steps/VideoTopicStep";
import VideoScriptStep from "./video/steps/VideoScriptStep";
import VideoAssetsStep from "./video/steps/VideoAssetsStep";
import VideoPreviewStep from "./video/steps/VideoPreviewStep";

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<Step, string> = {
  1: "Topic",
  2: "Script",
  3: "Assets",
  4: "Preview",
};

export default function VideoView() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [topic, setTopic] = useState("");

  // Step 2
  const [scenes, setScenes] = useState<VideoAdScene[]>([]);

  // Step 3
  const [sceneImages, setSceneImages] = useState<Partial<Record<VideoAdSceneType, SceneImageConfig>>>({});

  const videoAdData: VideoAdData = useMemo(() => ({
    topic,
    scenes,
    sceneImages,
    fps: 30,
    durationFrames: scenes.reduce((acc, s) => acc + s.durationFrames, 0),
  }), [topic, scenes, sceneImages]);

  async function handleTopicNext(newTopic: string, subjectId?: string) {
    setLoading(true);
    setError(null);
    try {
      // Mark subject as used if from library
      if (subjectId) {
        fetch(`/api/subjects/${subjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markUsed" }),
        }).catch(() => {});
      }

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: newTopic, subjectId }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Generation failed");
      }

      const { scenes: generated } = await res.json();
      setTopic(newTopic);
      setScenes(generated);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerateScene(sceneType: VideoAdSceneType) {
    const res = await fetch("/api/video/regenerate-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, sceneType }),
    });
    if (!res.ok) return;
    const { scene } = await res.json();
    setScenes((prev) => prev.map((s) => s.type === sceneType ? scene : s));
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: 40 }}>
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: s === 1 ? "flex-start" : s === 4 ? "flex-end" : "center",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 2,
                background: step >= s ? "var(--accent)" : "var(--border)",
                marginBottom: 8,
                transition: "background 0.3s",
              }}
            />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: step >= s ? "var(--accent)" : "var(--muted)",
              }}
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: "rgba(184,92,92,0.12)",
            border: "1px solid var(--error)",
            borderRadius: 6,
            padding: "10px 16px",
            marginBottom: 24,
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <VideoTopicStep
          onNext={handleTopicNext}
          loading={loading}
        />
      )}

      {step === 2 && (
        <VideoScriptStep
          scenes={scenes}
          topic={topic}
          onUpdate={setScenes}
          onRegenerate={handleRegenerateScene}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <VideoAssetsStep
          sceneImages={sceneImages}
          onUpdate={setSceneImages}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && scenes.length > 0 && (
        <VideoPreviewStep
          videoAdData={videoAdData}
          onUpdateScenes={setScenes}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
