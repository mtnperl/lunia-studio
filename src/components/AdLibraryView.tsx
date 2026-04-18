"use client";
// AdLibraryView — chronological grid of saved Meta ads.
// Click a card to reopen in the builder at step 4; trash icon to delete.

import { useEffect, useState } from "react";
import { AD_ANGLE_LABELS, type SavedAd } from "@/lib/types";

type Props = {
  onOpenAd?: (ad: SavedAd) => void;
};

function proxy(url: string): string {
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  return `/api/ad/image-proxy?url=${encodeURIComponent(url)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdLibraryView({ onOpenAd }: Props) {
  const [ads, setAds] = useState<SavedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ad/library")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setAds(data);
        else setError("Failed to load ads");
      })
      .catch(() => {
        if (!cancelled) setError("Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this ad? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ad/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAds((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError("Delete failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}
        >
          Ad library
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>
          Everything you&apos;ve saved, newest first.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(184,92,92,0.08)",
            border: "1px solid rgba(184,92,92,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--error)",
            marginBottom: 20,
          }}
        >
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</div>
      )}

      {!loading && ads.length === 0 && (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 10,
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          Nothing saved yet. Build an ad and hit “Save to library”.
        </div>
      )}

      {!loading && ads.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {ads.map((ad) => (
            <div
              key={ad.id}
              onClick={() => onOpenAd?.(ad)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--surface)",
                cursor: onOpenAd ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: ad.aspectRatio === "1:1" ? "1 / 1" : "4 / 5",
                  background: "var(--surface-r)",
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxy(ad.imageUrl)}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    bottom: 10,
                    color: "#fff",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 18,
                    lineHeight: 1.1,
                    textShadow: "0 2px 8px rgba(0,0,0,0.55)",
                  }}
                >
                  {ad.concept.overlayText}
                </div>
              </div>

              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                  {ad.concept.headline}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {AD_ANGLE_LABELS[ad.angle] ?? ad.angle} · {formatDate(ad.savedAt)}
                  </div>
                  <button
                    onClick={(e) => handleDelete(ad.id, e)}
                    disabled={deletingId === ad.id}
                    title="Delete"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--muted)",
                      fontSize: 13,
                      fontFamily: "inherit",
                      opacity: deletingId === ad.id ? 0.4 : 1,
                    }}
                  >
                    {deletingId === ad.id ? "…" : "✕"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
