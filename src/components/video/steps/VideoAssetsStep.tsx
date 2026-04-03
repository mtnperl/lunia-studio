"use client";

import { useState, useEffect, useRef } from "react";
import { VideoAssetMetadata } from "@/lib/types";

type Props = {
  selectedUrl: string | null;
  onSelect: (url: string | null) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function VideoAssetsStep({ selectedUrl, onSelect, onNext, onBack }: Props) {
  const [assets, setAssets] = useState<VideoAssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/video-assets")
      .then((r) => r.json())
      .then((d) => { setAssets(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const productImages = assets.filter(
    (a) => a.assetType === "product-image-vertical" || a.assetType === "lifestyle-image"
  );

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assetType", "product-image-vertical");
      const res = await fetch("/api/video-assets/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg);
      }
      const { url } = await res.json();
      const refreshed = await fetch("/api/video-assets").then((r) => r.json());
      setAssets(Array.isArray(refreshed) ? refreshed : []);
      onSelect(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 6 }}>
        Product image
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Select a product image for the product scene, or skip to use a placeholder.
      </p>

      {error && (
        <div style={{ background: "rgba(184,92,92,0.12)", border: "1px solid var(--error)", borderRadius: 6, padding: "10px 16px", marginBottom: 16, fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--error)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", padding: "24px 0" }}>Loading...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {/* None option */}
          <button
            onClick={() => onSelect(null)}
            style={{
              aspectRatio: "9/16",
              background: "var(--surface)",
              border: `1px solid ${selectedUrl === null ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 24, opacity: 0.3 }}>—</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>No image</span>
          </button>

          {productImages.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.url)}
              style={{
                aspectRatio: "9/16",
                border: `2px solid ${selectedUrl === asset.url ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                padding: 0,
                background: "var(--surface-r)",
                position: "relative",
              }}
            >
              <img
                src={asset.url}
                alt={asset.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {selectedUrl === asset.url && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    background: "var(--accent)",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "var(--bg)",
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          ))}

          {/* Upload button */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              aspectRatio: "9/16",
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              borderRadius: 8,
              cursor: uploading ? "not-allowed" : "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 24, color: "var(--muted)" }}>+</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)" }}>
              {uploading ? "Uploading..." : "Upload"}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleUpload} />
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "10px 20px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 4,
            padding: "10px 28px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--bg)",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Preview Video
        </button>
      </div>
    </div>
  );
}
