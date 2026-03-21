"use client";
import { useState, useEffect, useRef } from "react";
import { AssetMetadata } from "@/lib/types";

export default function AssetsView() {
  const [assets, setAssets] = useState<AssetMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      // fail silently — assets are non-critical
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssets(); }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append("file", file);
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
      // fail silently
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Brand assets</h1>
          <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>Reference images for carousel production. Up to 5 MB per file.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: "var(--text)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: uploading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading..." : "+ Upload image"}
          </button>
        </div>
      </div>

      {uploadError && (
        <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#9b1c1c" }}>
          {uploadError}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 14, color: "var(--muted)", padding: "40px 0" }}>Loading assets...</div>
      ) : assets.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🖼</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No assets yet</div>
          <div style={{ fontSize: 13 }}>Upload brand images to reference during carousel production.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {assets.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid var(--border)",
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
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text)",
                      textDecoration: "none",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      padding: "4px 8px",
                      background: "var(--bg)",
                    }}
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#9b1c1c",
                      border: "1px solid #f5c6c6",
                      borderRadius: 5,
                      padding: "4px 8px",
                      background: "var(--bg)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
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
