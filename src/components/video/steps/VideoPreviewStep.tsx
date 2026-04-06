"use client";

import { useState } from "react";
import { Player } from "@remotion/player";
import { VideoAd } from "@/remotion/VideoAd";
import { VideoAdCaptions } from "@/remotion/VideoAdCaptions";
import { VideoAdData, VideoCaptionsData, VideoFormat, TextPosition, VideoTextStyle } from "@/lib/types";

type Props = {
  videoAdData: VideoAdData;
  videoCaptionsData?: VideoCaptionsData;
  videoFormat?: VideoFormat;
  onUpdateScenes: (scenes: VideoAdData["scenes"]) => void;
  onFontScaleChange: (scale: number) => void;
  onTextStyleChange: (style: VideoTextStyle) => void;
  onBack: () => void;
};

type RenderStatus = "idle" | "rendering" | "done" | "failed";

const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: "top", label: "▲" },
  { value: "center", label: "◈" },
  { value: "bottom", label: "▼" },
];

export default function VideoPreviewStep({ videoAdData, videoCaptionsData, videoFormat = "brand-story", onUpdateScenes, onFontScaleChange, onTextStyleChange, onBack }: Props) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [mp4Status, setMp4Status] = useState<RenderStatus>("idle");
  const [gifStatus, setGifStatus] = useState<RenderStatus>("idle");
  const [mp4Url, setMp4Url] = useState<string | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCaptions = videoFormat === "captions";
  const activeData = isCaptions ? videoCaptionsData : videoAdData;
  const totalFrames = isCaptions
    ? (videoCaptionsData?.durationFrames ?? 0)
    : videoAdData.scenes.reduce((acc, s) => acc + s.durationFrames, 0);
  const fontScale = videoAdData.fontScale ?? 1;
  const ts = videoAdData.textStyle ?? {};
  const compositionId = isCaptions ? "VideoAdCaptions" : "VideoAd";

  function patchTextStyle(patch: Partial<VideoTextStyle>) {
    onTextStyleChange({ ...ts, ...patch });
  }

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

  // Cross-origin download: fetch as blob first so the browser allows the download attribute
  async function triggerDownload(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  }

  async function handleRender(format: "mp4" | "gif") {
    const setStatus = format === "mp4" ? setMp4Status : setGifStatus;
    const setUrl = format === "mp4" ? setMp4Url : setGifUrl;

    setStatus("rendering");
    setUrl(null);
    setError(null);

    try {
      const renderData = isCaptions ? videoCaptionsData : videoAdData;
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: renderData, compositionId, format }),
      });
      const text = await res.text();
      let json: { url?: string; error?: string } = {};
      try { json = JSON.parse(text); } catch {
        throw new Error(`Server error (${res.status}) — check Vercel logs`);
      }
      if (!res.ok || json.error) throw new Error(json.error ?? `Render failed (${res.status})`);
      const { url } = json;
      if (!url) throw new Error("Render succeeded but no URL returned");
      setUrl(url);
      setStatus("done");
      // Auto-trigger download
      const ext = format === "gif" ? "gif" : "mp4";
      await triggerDownload(url, `lunia-video-${Date.now()}.${ext}`);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Render failed. Please try again.");
    }
  }

  const FF = "Helvetica Neue, Helvetica, Arial, sans-serif";

  function ExportButton({ format }: { format: "mp4" | "gif" }) {
    const status = format === "mp4" ? mp4Status : gifStatus;
    const url = format === "mp4" ? mp4Url : gifUrl;
    const ext = format.toUpperCase();

    const isRendering = status === "rendering";
    const isDone = status === "done" && url;

    return (
      <button
        onClick={isDone ? () => triggerDownload(url, `lunia-video.${format}`) : () => handleRender(format)}
        disabled={isRendering}
        style={{
          background: isDone ? "var(--success, #3d7a5c)" : "transparent",
          border: `1px solid ${isDone ? "var(--success, #3d7a5c)" : status === "failed" ? "var(--error, #b85c5c)" : "var(--border)"}`,
          borderRadius: 4,
          padding: "11px 24px",
          fontFamily: FF,
          fontSize: 13,
          color: isDone ? "#fff" : status === "failed" ? "var(--error, #b85c5c)" : "var(--muted)",
          cursor: isRendering ? "not-allowed" : "pointer",
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "center",
          gap: 6,
          justifyContent: "center",
        }}
      >
        {status === "idle" && `Export ${ext}`}
        {status === "rendering" && `Rendering ${ext}… (1-3 min)`}
        {isDone && `↓ Download ${ext}`}
        {status === "failed" && `Retry ${ext}`}
      </button>
    );
  }

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

          {/* Text style controls */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Text Style
            </div>

            {/* Row 1: toggles */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {([
                { key: "textBackdrop", label: "Backdrop" },
                { key: "textStroke",   label: "Outline" },
                { key: "allCaps",      label: "ALL CAPS" },
              ] as { key: keyof VideoTextStyle; label: string }[]).map(({ key, label }) => {
                const active = !!ts[key];
                return (
                  <button
                    key={key}
                    onClick={() => patchTextStyle({ [key]: !active })}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 4,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim, rgba(255,216,0,0.12))" : "transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontFamily: FF,
                      fontSize: 12,
                      cursor: "pointer",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {label}
                  </button>
                );
              })}

              {/* Font weight toggle */}
              <button
                onClick={() => patchTextStyle({ fontWeight: ts.fontWeight === 900 ? 700 : 900 })}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  border: `1px solid ${ts.fontWeight === 900 ? "var(--accent)" : "var(--border)"}`,
                  background: ts.fontWeight === 900 ? "var(--accent-dim, rgba(255,216,0,0.12))" : "transparent",
                  color: ts.fontWeight === 900 ? "var(--accent)" : "var(--muted)",
                  fontFamily: FF,
                  fontSize: 12,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                  fontWeight: ts.fontWeight === 900 ? 700 : 400,
                }}
              >
                Heavy (900)
              </button>
            </div>

            {/* Row 2: Overlay intensity slider */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)" }}>Image overlay</span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)" }}>
                  {ts.overlayOpacity !== undefined ? `${Math.round(ts.overlayOpacity * 100)}%` : "default"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={ts.overlayOpacity !== undefined ? Math.round(ts.overlayOpacity * 100) : 55}
                  onChange={(e) => patchTextStyle({ overlayOpacity: Number(e.target.value) / 100 })}
                  style={{ flex: 1, accentColor: "var(--accent)" }}
                />
                {ts.overlayOpacity !== undefined && (
                  <button
                    onClick={() => patchTextStyle({ overlayOpacity: undefined })}
                    style={{ fontFamily: FF, fontSize: 10, color: "var(--subtle)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    reset
                  </button>
                )}
              </div>
            </div>

            {/* Row 3: Line width slider */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)" }}>Line width</span>
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--accent)" }}>
                  {ts.lineBreakChars ? `${ts.lineBreakChars} chars` : "off"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={ts.lineBreakChars ?? 0}
                onChange={(e) => patchTextStyle({ lineBreakChars: Number(e.target.value) || undefined })}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FF, fontSize: 10, color: "var(--subtle)", marginTop: 4 }}>
                <span>Off</span><span>Narrow</span><span>Wide</span>
              </div>
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
              {saving ? "Saving..." : savedId ? "Saved ✓" : "Save to Library"}
            </button>

            <ExportButton format="mp4" />
            <ExportButton format="gif" />
          </div>

          {/* Export note */}
          <div style={{ fontFamily: FF, fontSize: 11, color: "var(--subtle)", marginBottom: 20, lineHeight: 1.5 }}>
            MP4 — best quality for posting<br />
            GIF — shareable preview loop
          </div>

          {/* Scene summary + text position control */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: FF, fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Scenes
              </span>
              <span style={{ fontFamily: FF, fontSize: 10, color: "var(--subtle)" }}>
                Text position
              </span>
            </div>
            {videoAdData.scenes.map((scene) => (
              <div
                key={scene.type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FF, fontSize: 11, fontWeight: 600, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
                    {scene.type} · <span style={{ color: "var(--muted)", fontWeight: 400 }}>{Math.round(scene.durationFrames / 30)}s</span>
                  </div>
                  <div style={{ fontFamily: FF, fontSize: 12, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {scene.headline}
                  </div>
                </div>
                {/* Text position toggle */}
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {TEXT_POSITIONS.map(({ value, label }) => {
                    const isActive = (scene.textPosition ?? "center") === value;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          const updated = videoAdData.scenes.map((s) =>
                            s.type === scene.type ? { ...s, textPosition: value } : s
                          );
                          onUpdateScenes(updated);
                        }}
                        title={`Text ${value}`}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                          background: isActive ? "var(--accent-dim, rgba(255,216,0,0.12))" : "transparent",
                          color: isActive ? "var(--accent)" : "var(--subtle)",
                          fontFamily: FF,
                          fontSize: 11,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
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
