"use client";

import { useState, useEffect } from "react";
import { SavedVideoAd } from "@/lib/types";

export default function VideoLibraryView() {
  const [videos, setVideos] = useState<SavedVideoAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          Video Library
        </h2>
        <p style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif", fontSize: 13, color: "var(--muted)" }}>
          Saved video ad drafts. Click any card to review.
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 16px", marginBottom: 24, fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--error)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--muted)", padding: "40px 0" }}>
          Loading...
        </div>
      ) : videos.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 8,
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
            No saved videos yet
          </div>
          <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--subtle)" }}>
            Build a video ad and save it to see it here.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {videos.map((video) => {
            const firstSceneImage = Object.values(video.data.sceneImages ?? {})[0];
            const totalSecs = Math.round(video.data.durationFrames / 30);
            const savedDate = new Date(video.savedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric", year: "numeric",
            });

            return (
              <div
                key={video.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    aspectRatio: "9/16",
                    background: "var(--surface-r)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  {firstSceneImage ? (
                    <img
                      src={firstSceneImage.url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: firstSceneImage.fit,
                        objectPosition: firstSceneImage.position ?? "50% 50%",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontFamily: "Helvetica Neue, sans-serif",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--accent)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        textAlign: "center",
                        padding: 16,
                      }}
                    >
                      LUNIA
                      <br />
                      VIDEO
                    </div>
                  )}

                  {/* Duration badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      background: "rgba(16,38,53,0.85)",
                      borderRadius: 3,
                      padding: "3px 7px",
                      fontFamily: "Helvetica Neue, monospace",
                      fontSize: 10,
                      color: "var(--text)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {totalSecs}s
                  </div>
                </div>

                {/* Info */}
                <div style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      fontFamily: "Helvetica Neue, sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {video.topic}
                  </div>
                  <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 11, color: "var(--muted)" }}>
                    {savedDate} · {video.data.scenes.length} scenes
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(video.id)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(16,38,53,0.75)",
                    border: "none",
                    borderRadius: 4,
                    width: 28,
                    height: 28,
                    cursor: "pointer",
                    color: "var(--muted)",
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
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
