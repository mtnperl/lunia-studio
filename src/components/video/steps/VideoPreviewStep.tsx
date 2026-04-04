"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { VideoAd } from "@/remotion/VideoAd";
import { VideoAdCaptions } from "@/remotion/VideoAdCaptions";
import { VideoAdData, VideoCaptionsData, VideoFormat } from "@/lib/types";

type Props = {
  videoAdData: VideoAdData;
  videoCaptionsData?: VideoCaptionsData;
  videoFormat?: VideoFormat;
  onUpdateScenes: (scenes: VideoAdData["scenes"]) => void;
  onFontScaleChange: (scale: number) => void;
  onBack: () => void;
};

export default function VideoPreviewStep({ videoAdData, videoCaptionsData, videoFormat = "brand-story", onFontScaleChange, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [renderStatus, setRenderStatus] = useState<"idle" | "rendering" | "done" | "failed">("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCaptions = videoFormat === "captions";
  const activeData = isCaptions ? videoCaptionsData : videoAdData;
  const totalFrames = isCaptions
    ? (videoCaptionsData?.durationFrames ?? 0)
    : videoAdData.scenes.reduce((acc, s) => acc + s.durationFrames, 0);
  const fontScale = videoAdData.fontScale ?? 1;
  const compositionId = isCaptions ? "VideoAdCaptions" : "VideoAd";

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
    setDownloadUrl(null);
    setError(null);
    try {
      const renderData = isCaptions ? videoCaptionsData : videoAdData;
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: renderData, compositionId }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg || "Render failed");
      }
      const { url } = await res.json();
      setDownloadUrl(url);
      setRenderStatus("done");
      // Auto-trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `lunia-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setRenderStatus("failed");
      setError(err instanceof Error ? err.message : "Render failed. Please try again.");
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component={(isCaptions ? VideoAdCaptions : VideoAd) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            inputProps={(activeData ?? videoAdData) as any}
            durationInFrames={Math.max(totalFrames, 1)}
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
              onClick={renderStatus === "done" && downloadUrl ? () => {
                const a = document.createElement("a");
                a.href = downloadUrl;
                a.download = `lunia-video.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              } : handleRender}
              disabled={renderStatus === "rendering"}
              style={{
                background: renderStatus === "done" ? "var(--success, #3d7a5c)" : "transparent",
                border: `1px solid ${renderStatus === "done" ? "var(--success, #3d7a5c)" : renderStatus === "failed" ? "var(--error, #b85c5c)" : "var(--border)"}`,
                borderRadius: 4,
                padding: "11px 24px",
                fontFamily: FF,
                fontSize: 13,
                color: renderStatus === "done" ? "#fff" : renderStatus === "failed" ? "var(--error, #b85c5c)" : "var(--muted)",
                cursor: renderStatus === "rendering" ? "not-allowed" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {renderStatus === "idle" && "Export MP4"}
              {renderStatus === "rendering" && "Rendering… (1-3 min)"}
              {renderStatus === "done" && "Download MP4"}
              {renderStatus === "failed" && "Retry Export"}
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
