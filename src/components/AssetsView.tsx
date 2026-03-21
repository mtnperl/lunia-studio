"use client";
import { useState, useEffect, useRef } from "react";
import { AssetMetadata, AssetType } from "@/lib/types";

const ASSET_TYPES: { value: AssetType; label: string; description: string; color: string }[] = [
  { value: "logo",                label: "Logo",              description: "Brand logo or wordmark",            color: "#1e7a8a" },
  { value: "carousel-style",      label: "Carousel Style",    description: "Reference layout for generation",   color: "#7c3aed" },
  { value: "carousel-template",   label: "Carousel Template", description: "Visual template to apply when creating",  color: "#d97706" },
  { value: "product-image",       label: "Product Image",     description: "Product photos",                    color: "#b45309" },
  { value: "other",               label: "Other",             description: "General brand asset",               color: "#4a5568" },
];

function TypeBadge({ assetType }: { assetType?: AssetType }) {
  const t = ASSET_TYPES.find((a) => a.value === assetType) ?? ASSET_TYPES[3];
  return (
    <span style={{
      display: "inline-block",
      background: `${t.color}18`,
      color: t.color,
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 7px",
      borderRadius: 4,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      border: `1px solid ${t.color}30`,
    }}>
      {t.label}
    </span>
  );
}

export default function AssetsView() {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<AssetType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssets(); }, []);

  function selectType(type: AssetType) {
    setPendingType(type);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingType) return;
    await doUpload(file, pendingType);
    setPendingType(null);
  }

  async function doUpload(file: File, assetType: AssetType) {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", assetType);
    try {
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError((data as { error?: string }).error ?? "Upload failed");
        return;
      }
      await loadAssets();
    } catch {
      setUploadError("Network error — please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/assets/${id}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // non-critical
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const styleCount = assets.filter((a) => a.assetType === "carousel-style").length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Brand assets</h1>
        <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>
          Upload tagged assets. Carousel Style references are automatically sent to Claude when generating.
          {styleCount > 0 && <span style={{ color: "#7c3aed", fontWeight: 600 }}> {styleCount} style reference{styleCount > 1 ? "s" : ""} active.</span>}
        </p>
      </div>

      {/* Upload type picker */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Upload as
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {ASSET_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => selectType(t.value)}
              disabled={uploading}
              style={{
                border: `1.5px solid ${t.color}40`,
                borderRadius: 9,
                padding: "12px 14px",
                cursor: uploading ? "not-allowed" : "pointer",
                background: "var(--bg)",
                textAlign: "left",
                fontFamily: "inherit",
                opacity: uploading ? 0.5 : 1,
                transition: "border-color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => { if (!uploading) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: t.color, marginBottom: 3 }}>
                {uploading && pendingType === t.value ? "Uploading..." : `+ ${t.label}`}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {uploadError && (
        <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#9b1c1c" }}>
          {uploadError}
        </div>
      )}

      {/* Carousel style notice */}
      {styleCount > 0 && (
        <div style={{ background: "#f5f0ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#5b21b6" }}>
          <strong>{styleCount} Carousel Style reference{styleCount > 1 ? "s" : ""}</strong> — Claude will analyze {styleCount > 1 ? "these" : "this"} when generating your next carousel to match the layout and structure.
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading assets...</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🖼</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No assets yet</div>
          <div style={{ fontSize: 13 }}>Upload tagged images to use as references during carousel generation.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
          {assets.map((a) => (
            <div
              key={a.id}
              style={{
                border: a.assetType === "carousel-style" ? "1.5px solid #c4b5fd" : "1px solid var(--border)",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              <div style={{ aspectRatio: "1", overflow: "hidden", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <img
                  src={a.url}
                  alt={a.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div style={{ marginBottom: 6 }}>
                  <TypeBadge assetType={a.assetType} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={a.name}>
                  {a.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
                  {formatDate(a.uploadedAt)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 5, padding: "4px 8px", background: "var(--bg)" }}
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{ fontSize: 12, fontWeight: 600, color: "#9b1c1c", border: "1px solid #f5c6c6", borderRadius: 5, padding: "4px 8px", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Delete
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
