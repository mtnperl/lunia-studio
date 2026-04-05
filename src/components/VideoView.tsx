"use client";

import { useState, useMemo } from "react";
import { VideoAdScene, VideoAdData, VideoAdSceneType, SceneImageConfig, VideoStyle, VideoFormat, VideoCaptionsData, VideoTextStyle } from "@/lib/types";
import VideoTopicStep from "./video/steps/VideoTopicStep";
import VideoScriptStep from "./video/steps/VideoScriptStep";
import VideoAssetsStep from "./video/steps/VideoAssetsStep";
import VideoPreviewStep from "./video/steps/VideoPreviewStep";

type Step = 1 | 2 | 3 | 4;
type AutoImageStatus = "loading" | "done" | "error";

const SCRIPT_GEN_MSGS = [
  "Reading topic...",
  "Selecting hook tone...",
  "Writing 5-scene structure...",
  "Applying brand rules...",
  "Checking claims...",
  "Finalizing script...",
];

function VideoScriptLoader() {
  return (
    <div className="loader-wrap" style={{ marginTop: 20 }}>
      <div className="hp-label">GENERATING VIDEO SCRIPT</div>
      <div className="hp-track"><div className="hp-fill" /></div>
      <div className="loader-log">
        {SCRIPT_GEN_MSGS.slice(0, 4).map((msg, i, arr) => (
          <div key={i} className={i === arr.length - 1 ? "active" : ""}>
            {i === arr.length - 1 ? `> ${msg}` : `  ${msg} OK`}
            {i === arr.length - 1 && <span className="blink">_</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const FF = "Helvetica Neue, Helvetica, Arial, sans-serif";

function CaptionsScriptStep({
  captions,
  topic,
  onUpdate,
  onNext,
  onBack,
}: {
  captions: string[];
  topic: string;
  onUpdate: (c: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 style={{ fontFamily: FF, fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.02em" }}>
        Caption Script
      </h2>
      <p style={{ fontFamily: FF, fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {topic} — edit any caption before continuing.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {captions.map((caption, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)", paddingTop: 11, flexShrink: 0, width: 20, textAlign: "right" }}>
              {i + 1}
            </div>
            <textarea
              value={caption}
              rows={2}
              onChange={(e) => {
                const next = [...captions];
                next[i] = e.target.value;
                onUpdate(next);
              }}
              style={{
                flex: 1,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "10px 12px",
                fontFamily: FF,
                fontSize: 13,
                color: "var(--text)",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onNext}
          style={{ background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 4, padding: "12px 32px", fontFamily: FF, fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em" }}
        >
          Next: Assets
        </button>
        <button onClick={onBack} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 4, padding: "12px 20px", fontFamily: FF, fontSize: 13, color: "var(--muted)", cursor: "pointer" }}>
          Back
        </button>
      </div>
    </div>
  );
}

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
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("brand-story");

  // Step 2 — brand-story format
  const [scenes, setScenes] = useState<VideoAdScene[]>([]);
  // Step 2 — captions format
  const [captions, setCaptions] = useState<string[]>([]);

  // Step 3
  const [sceneImages, setSceneImages] = useState<Partial<Record<VideoAdSceneType, SceneImageConfig>>>({});
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [autoImageStatus, setAutoImageStatus] = useState<Partial<Record<VideoAdSceneType, AutoImageStatus>>>({});

  // Step 4
  const [fontScale, setFontScale] = useState(1.0);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>("cinematic");
  const [textStyle, setTextStyle] = useState<VideoTextStyle>({});

  const videoAdData: VideoAdData = useMemo(() => ({
    topic,
    scenes,
    sceneImages,
    logoUrl,
    fontScale,
    videoStyle,
    videoFormat,
    textStyle,
    fps: 30,
    durationFrames: scenes.reduce((acc, s) => acc + s.durationFrames, 0),
  }), [topic, scenes, sceneImages, logoUrl, fontScale, videoStyle, videoFormat, textStyle]);

  const videoCaptionsData: VideoCaptionsData = useMemo(() => ({
    topic,
    captions,
    backgroundImageUrl: Object.values(sceneImages)[0]?.url,
    logoUrl,
    fontScale,
    videoStyle,
    fps: 30,
    durationFrames: captions.length * 75,
  }), [topic, captions, sceneImages, logoUrl, fontScale, videoStyle]);

  async function generateSceneImage(scene: VideoAdScene, currentTopic: string) {
    const sceneType = scene.type;
    setAutoImageStatus((prev) => ({ ...prev, [sceneType]: "loading" }));
    try {
      const promptRes = await fetch("/api/video/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneType, topic: currentTopic, headline: scene.headline }),
      });
      if (!promptRes.ok) throw new Error("Prompt failed");
      const { prompt } = await promptRes.json();

      const imageRes = await fetch("/api/video/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!imageRes.ok) throw new Error("Image failed");
      const { url, error: imgErr } = await imageRes.json();
      if (imgErr) throw new Error(imgErr);

      setSceneImages((prev) => ({ ...prev, [sceneType]: { url, fit: "cover" } }));
      setAutoImageStatus((prev) => ({ ...prev, [sceneType]: "done" }));
    } catch {
      setAutoImageStatus((prev) => ({ ...prev, [sceneType]: "error" }));
    }
  }

  function triggerAutoImageGeneration(generatedScenes: VideoAdScene[], currentTopic: string) {
    // Fire in parallel — don't await
    Promise.all(generatedScenes.map((scene) => generateSceneImage(scene, currentTopic))).catch(() => {});
  }

  async function handleRetryImage(sceneType: VideoAdSceneType) {
    const scene = scenes.find((s) => s.type === sceneType);
    if (!scene) return;
    await generateSceneImage(scene, topic);
  }

  async function handleTopicNext(newTopic: string, subjectId?: string, hookTone?: string) {
    setLoading(true);
    setError(null);
    try {
      if (subjectId) {
        fetch(`/api/subjects/${subjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markUsed" }),
        }).catch(() => {});
      }

      if (videoFormat === "captions") {
        const res = await fetch("/api/video/generate-captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: newTopic, subjectId, hookTone }),
        });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg ?? "Generation failed");
        }
        const { captions: generated } = await res.json();
        setTopic(newTopic);
        setCaptions(generated);
        setStep(2);
        return;
      }

      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: newTopic, subjectId, hookTone }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? "Generation failed");
      }

      const { scenes: generated } = await res.json();
      setTopic(newTopic);
      setScenes(generated);
      // Reset images from any prior generation
      setSceneImages({});
      setAutoImageStatus({});
      setStep(2);
      // Fire image generation in background — don't block step advance
      triggerAutoImageGeneration(generated, newTopic);
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
    <div style={{ padding: "32px 40px", maxWidth: step === 3 ? 1120 : 760, margin: "0 auto" }}>
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
                fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
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
            fontFamily: "Helvetica Neue, sans-serif",
            fontSize: 13,
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {loading && <VideoScriptLoader />}

      {!loading && step === 1 && (
        <VideoTopicStep
          onNext={handleTopicNext}
          loading={loading}
          videoStyle={videoStyle}
          onStyleChange={(s) => setVideoStyle(s as VideoStyle)}
          videoFormat={videoFormat}
          onFormatChange={(f) => setVideoFormat(f as VideoFormat)}
        />
      )}

      {!loading && step === 2 && videoFormat === "brand-story" && (
        <VideoScriptStep
          scenes={scenes}
          topic={topic}
          onUpdate={setScenes}
          onRegenerate={handleRegenerateScene}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {!loading && step === 2 && videoFormat === "captions" && (
        <CaptionsScriptStep
          captions={captions}
          topic={topic}
          onUpdate={setCaptions}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {!loading && step === 3 && (
        <VideoAssetsStep
          scenes={videoFormat === "captions" ? [] : scenes}
          topic={topic}
          sceneImages={sceneImages}
          logoUrl={logoUrl}
          onUpdate={setSceneImages}
          onLogoUpdate={setLogoUrl}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
          captionsMode={videoFormat === "captions"}
          autoImageStatus={autoImageStatus}
          onRetryImage={handleRetryImage}
        />
      )}

      {!loading && step === 4 && (
        <VideoPreviewStep
          videoAdData={videoAdData}
          videoCaptionsData={videoCaptionsData}
          videoFormat={videoFormat}
          onUpdateScenes={setScenes}
          onFontScaleChange={setFontScale}
          onTextStyleChange={setTextStyle}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
