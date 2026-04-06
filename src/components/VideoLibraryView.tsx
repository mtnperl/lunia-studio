"use client";

import { useState, useEffect } from "react";
import { SavedVideoAd } from "@/lib/types";

type RenderingKey = `${string}:${"mp4" | "gif"}`;

export default function VideoLibraryView() {
  const [videos, setVideos] = useState<SavedVideoAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState<Partial<Record<RenderingKey, boolean>>>({});
  const [renderErrors, setRenderErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    fetch("/api/video/library")
      .then((r) => r.json())
      .then((d) => { setVideos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError("Failed to load library."); setLoading(false); });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this video ad?")) return;
    try {
      await fetch(`/api/video/${id}`, { method: "DELETE" });
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {
      setError("Delete failed.");
    }
  }

  async function handleDownload(video: SavedVideoAd, format: "mp4" | "gif") {
    const key: RenderingKey = `${video.id}:${format}`;
    setRendering((prev) => ({ ...prev, [key]: true }));
    setRenderErrors((prev) => ({ ...prev, [video.id]: undefined }));
    try {
      const res = await fetch("/api/video/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: video.data, format }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Render failed");

      // Trigger download
      const a = document.createElement("a");
      a.href = json.url;
      a.download = `lunia-${video.topic.slice(0, 30).replace(/\s+/g, "-").toLowerCase()}.${format}`;
      a.click();
    } catch (err) {
      setRenderErrors((prev) => ({
        ...prev,
        [video.id]: err instanceof Error ? err.message : "Render failed",
      }));
    } finally {
      setRendering((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontSize: 32, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Video Library
        </h2>
        <p style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontSize: 13, color: "var(--muted)" }}>
          Saved video ad drafts. Render and download MP4 or GIF from any card.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 16px", marginBottom: 24, fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--error)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--muted)", padding: "40px 0" }}>Loading...</div>
      ) : videos.length === 0 ? (
        <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>No saved videos yet</div>
          <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--subtle)" }}>Build a video ad and save it to see it here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {videos.map((video) => {
            const firstSceneImage = Object.values(video.data.sceneImages ?? {})[0];
            const totalSecs = Math.round(video.data.durationFrames / 30);
            const savedDate = new Date(video.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const isRenderingMp4 = !!rendering[`${video.id}:mp4`];
            const isRenderingGif = !!rendering[`${video.id}:gif`];
            const isAnyRendering = isRenderingMp4 || isRenderingGif;
            const renderErr = renderErrors[video.id];

            return (
              <div key={video.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                {/* Thumbnail */}
                <div style={{ aspectRatio: "9/16", background: "var(--surface-r)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {firstSceneImage ? (
                    <img src={firstSceneImage.url} alt="" style={{ width: "100%", height: "100%", objectFit: firstSceneImage.fit, objectPosition: firstSceneImage.position ?? "50% 50%" }} />
                  ) : (
                    <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", padding: 16 }}>
                      LUNIA<br />VIDEO
                    </div>
                  )}

                  {/* Rendering overlay */}
                  {isAnyRendering && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.2)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        Rendering {isRenderingMp4 ? "MP4" : "GIF"}…
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>up to 2 min</span>
                    </div>
                  )}

                  {/* Duration badge */}
                  <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(16,38,53,0.85)", borderRadius: 3, padding: "3px 7px", fontFamily: "Helvetica Neue, monospace", fontSize: 10, color: "var(--text)", letterSpacing: "0.04em" }}>
                    {totalSecs}s
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: "12px 14px 10px" }}>
                  <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {video.topic}
                  </div>
                  <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                    {savedDate} · {video.data.scenes.length} scenes
                  </div>

                  {/* Render error */}
                  {renderErr && (
                    <div style={{ fontSize: 10, color: "var(--error)", marginBottom: 8, lineHeight: 1.4 }}>⚠ {renderErr}</div>
                  )}

                  {/* Download buttons */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => handleDownload(video, "mp4")}
                      disabled={isAnyRendering}
                      title="Render and download MP4"
                      style={{
                        flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700,
                        fontFamily: "inherit", cursor: isAnyRendering ? "not-allowed" : "pointer",
                        borderRadius: 6, border: "1px solid var(--border)",
                        background: isRenderingMp4 ? "var(--accent-dim)" : "var(--bg)",
                        color: isRenderingMp4 ? "var(--accent)" : "var(--text)",
                        opacity: isAnyRendering && !isRenderingMp4 ? 0.4 : 1,
                        letterSpacing: "0.04em", transition: "all 0.15s",
                      }}
                    >
                      {isRenderingMp4 ? "…" : "↓ MP4"}
                    </button>
                    <button
                      onClick={() => handleDownload(video, "gif")}
                      disabled={isAnyRendering}
                      title="Render and download GIF"
                      style={{
                        flex: 1, padding: "7px 0", fontSize: 11, fontWeight: 700,
                        fontFamily: "inherit", cursor: isAnyRendering ? "not-allowed" : "pointer",
                        borderRadius: 6, border: "1px solid var(--border)",
                        background: isRenderingGif ? "var(--accent-dim)" : "var(--bg)",
                        color: isRenderingGif ? "var(--accent)" : "var(--text)",
                        opacity: isAnyRendering && !isRenderingGif ? 0.4 : 1,
                        letterSpacing: "0.04em", transition: "all 0.15s",
                      }}
                    >
                      {isRenderingGif ? "…" : "↓ GIF"}
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(video.id)}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(16,38,53,0.75)", border: "none", borderRadius: 4, width: 28, height: 28, cursor: "pointer", color: "var(--muted)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
