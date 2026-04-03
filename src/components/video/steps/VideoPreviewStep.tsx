"use client";

import { useState, useCallback } from "react";
import { Player } from "@remotion/player";
import { VideoAd } from "@/remotion/VideoAd";
import { VideoAdData, VideoAdScene, VideoAdSceneType } from "@/lib/types";

type Props = {
  videoAdData: VideoAdData;
  onUpdateScenes: (scenes: VideoAdScene[]) => void;
  onBack: () => void;
};

export default function VideoPreviewStep({ videoAdData, onUpdateScenes, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "done" | "failed" | "unavailable">("idle");
  const [error, setError] = useState<string | null>(null);

  const totalFrames = videoAdData.scenes.reduce((acc, s) => acc + s.durationFrames, 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/video/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId ?? undefined, data: videoAdData }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { id } = await res.json();
      setSavedId(id);
    } catch {
      setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRender() {
    setRenderStatus("rendering");
    setError(null);
    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: videoAdData }),
      });
      if (res.status === 503) {
        setRenderStatus("unavailable");
        return;
      }
      if (!res.ok) throw new Error("Render failed");
      setRenderStatus("done");
    } catch {
      setRenderStatus("failed");
      setError("Render failed. Check Lambda configuration.");
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 6 }}>
        Preview
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        {videoAdData.topic}
      </p>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {/* Player */}
        <div style={{ flexShrink: 0 }}>
          <Player
            component={VideoAd}
            inputProps={videoAdData}
            durationInFrames={totalFrames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            style={{
              width: 270,
              height: 480,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
            controls
            loop
          />
          <div style={{ fontFamily: "Fira Code, monospace", fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
            {Math.round(totalFrames / 30)}s · 1080×1920 · 30fps
          </div>
        </div>

        {/* Actions + scene summary */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {error && (
            <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--error)" }}>
              {error}
            </div>
          )}

          {savedId && (
            <div style={{ background: "rgba(95,158,117,0.12)", border: "1px solid var(--success)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--success)" }}>
              Saved to library.
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: saving ? "var(--surface-r)" : "var(--accent)",
                color: saving ? "var(--muted)" : "var(--bg)",
                border: "none",
                borderRadius: 4,
                padding: "11px 24px",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {saving ? "Saving..." : savedId ? "Saved" : "Save Draft"}
            </button>

            <div style={{ position: "relative" }}>
              <button
                onClick={handleRender}
                disabled={renderStatus === "rendering"}
                title={renderStatus === "unavailable" ? "Set REMOTION_LAMBDA_FUNCTION_NAME to enable video rendering" : "Export as MP4 via Remotion Lambda"}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "11px 24px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: renderStatus === "unavailable" ? "var(--subtle)" : "var(--muted)",
                  cursor: renderStatus === "rendering" ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {renderStatus === "idle" && "Export MP4"}
                {renderStatus === "rendering" && "Rendering..."}
                {renderStatus === "done" && "Render complete"}
                {renderStatus === "failed" && "Render failed"}
                {renderStatus === "unavailable" && "Export MP4 (Lambda not configured)"}
              </button>
            </div>
          </div>

          {/* Scene summary */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Scenes
            </div>
            {videoAdData.scenes.map((scene) => (
              <div
                key={scene.type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  gap: 8,
                }}
              >
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                    {scene.type}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                    {scene.headline}
                  </div>
                </div>
                <span style={{ fontFamily: "Fira Code, monospace", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
                  {Math.round(scene.durationFrames / 30)}s
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={onBack}
            style={{
              marginTop: 16,
              background: "transparent",
              border: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              color: "var(--muted)",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            Back to assets
          </button>
        </div>
      </div>
    </div>
  );
}
