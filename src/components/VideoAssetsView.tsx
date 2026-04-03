"use client";

import { useState, useEffect, useRef } from "react";
import { VideoAssetMetadata, VideoAssetType } from "@/lib/types";

const ASSET_TYPE_LABELS: Record<VideoAssetType, string> = {
  "product-image-vertical": "Product",
  "lifestyle-image": "Lifestyle",
  "product-video": "Video Clip",
  "logo": "Logo",
};

export default function VideoAssetsView() {
  const [assets, setAssets] = useState<VideoAssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<VideoAssetType>("product-image-vertical");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchAssets() {
    try {
      const res = await fetch("/api/video-assets");
      if (res.ok) setAssets(await res.json());
    } catch {
      setError("Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAssets(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setUploadingCount(files.length);
    let failed = 0;
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("assetType", selectedType);
        const res = await fetch("/api/video-assets/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const { error: msg } = await res.json();
          throw new Error(msg);
        }
      } catch {
        failed++;
      }
      setUploadingCount((n) => n - 1);
    }
    if (failed > 0) setError(`${failed} file(s) failed to upload.`);
    await fetchAssets();
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset?")) return;
    try {
      await fetch(`/api/video-assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Delete failed.");
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: "var(--font-display, 'Cormorant Garamond', serif)",
            fontSize: 32,
            fontWeight: 300,
            color: "var(--text)",
            marginBottom: 8,
          }}
        >
          Video Assets
        </h2>
        <p style={{ fontFamily: "var(--font-ui, Inter, sans-serif)", fontSize: 13, color: "var(--muted)" }}>
          Upload product images and lifestyle shots to use in video ads. Max 30 MB per file.
        </p>
      </div>

      {/* Upload section */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
          marginBottom: 32,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <label
            style={{
              display: "block",
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              color: "var(--muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Asset Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as VideoAssetType)}
            style={{
              width: "100%",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "8px 12px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            <option value="product-image-vertical">Product Image (Vertical)</option>
            <option value="lifestyle-image">Lifestyle Image</option>
            <option value="product-video">Video Clip</option>
            <option value="logo">Logo (PNG with transparency)</option>
          </select>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            multiple
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingCount > 0}
            style={{
              background: uploadingCount > 0 ? "var(--surface-r)" : "var(--accent)",
              color: uploadingCount > 0 ? "var(--muted)" : "var(--bg)",
              border: "none",
              borderRadius: 4,
              padding: "10px 24px",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              cursor: uploadingCount > 0 ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {uploadingCount > 0 ? `Uploading ${uploadingCount}...` : "Upload Files"}
          </button>
        </div>
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

      {loading ? (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", padding: "40px 0" }}>
          Loading assets...
        </div>
      ) : assets.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 8,
            padding: "60px 40px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: "var(--muted)", fontWeight: 300, marginBottom: 8 }}>
            No video assets yet
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--subtle)" }}>
            Upload product images or lifestyle shots to use in your video ads.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {assets.map((asset) => (
            <div
              key={asset.id}
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
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: "10px 12px" }}>
                <div
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "var(--muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 4,
                  }}
                >
                  {asset.name}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 10,
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 3,
                    padding: "2px 6px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(asset.id)}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(13,12,10,0.7)",
                  border: "none",
                  borderRadius: 4,
                  width: 28,
                  height: 28,
                  cursor: "pointer",
                  color: "var(--muted)",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
