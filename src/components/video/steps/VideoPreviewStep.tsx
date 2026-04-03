"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { VideoAd } from "@/remotion/VideoAd";
import { VideoAdData } from "@/lib/types";

type Props = {
  videoAdData: VideoAdData;
  onUpdateScenes: (scenes: VideoAdData["scenes"]) => void;
  onFontScaleChange: (scale: number) => void;
  onBack: () => void;
};

export default function VideoPreviewStep({ videoAdData, onFontScaleChange, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "done" | "failed" | "unavailable">("idle");
  const [error, setError] = useState<string | null>(null);

  const totalFrames = videoAdData.scenes.reduce((acc, s) => acc + s.durationFrames, 0);
  const fontScale = videoAdData.fontScale ?? 1;

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

  const FF = "Helvetica Neue, Helvetica, Arial, sans-serif";

  return (
    <div>
      <h2 style={{ fontFamily: FF, fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 6, letterSpacing: "-0.02em" }}>
        Preview
      </h2>
      <p style={{ fontFamily: FF, fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
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
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
            {Math.round(totalFrames / 30)}s · 1080×1920 · 30fps
          </div>
        </div>

        {/* Controls + actions */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {error && (
            <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontFamily: FF, fontSize: 13, color: "var(--error)" }}>
              {error}
            </div>
          )}

          {savedId && (
            <div style={{ background: "rgba(95,158,117,0.12)", border: "1px solid var(--success)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontFamily: FF, fontSize: 13, color: "var(--success)" }}>
              Saved to library.
            </div>
          )}

          {/* Font size control */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Font size
              </span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)" }}>
                {Math.round(fontScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={140}
              step={5}
              value={Math.round(fontScale * 100)}
              onChange={(e) => onFontScaleChange(Number(e.target.value) / 100)}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FF, fontSize: 10, color: "var(--subtle)", marginTop: 4 }}>
              <span>Small</span><span>Default</span><span>Large</span>
            </div>
          </div>

          {/* Actions */}
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
                fontFamily: FF,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {saving ? "Saving..." : savedId ? "Saved" : "Save to Library"}
            </button>

            <button
              onClick={handleRender}
              disabled={renderStatus === "rendering"}
              title={renderStatus === "unavailable" ? "Set REMOTION_LAMBDA_FUNCTION_NAME to enable video rendering" : "Export as MP4 via Remotion Lambda"}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                padding: "11px 24px",
                fontFamily: FF,
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

          {/* Scene summary */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
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
                  <div style={{ fontFamily: FF, fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                    {scene.type}
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                    {scene.headline}
                  </div>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
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
              fontFamily: FF,
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
