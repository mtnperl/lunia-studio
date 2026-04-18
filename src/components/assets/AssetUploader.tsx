"use client";
// Drag-and-drop (or click-to-select) uploader for BrandAssets. Sends a
// multipart/form-data POST to /api/brand-assets/upload with fields:
//   - file (required, ≤ 8 MB, PNG/JPEG/WebP)
//   - kind (product | logo | reference)
//   - name (optional)
//   - hasTransparentBg (optional; defaults true for PNG logos)
//   - tags (comma-separated)

import { useRef, useState } from "react";
import type { BrandAssetKind } from "@/lib/types";

type Props = {
  onUploaded: () => void;
};

const KIND_HELP: Record<BrandAssetKind, string> = {
  product: "Real Lunia bottle shot — FAL will keep this in frame.",
  logo: "Transparent PNG logo — stamped onto the final ad canvas.",
  reference: "Inspiration / style reference — conditions scene mood.",
};

export default function AssetUploader({ onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<BrandAssetKind>("product");
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [transparent, setTransparent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
    // Sensible default: PNG logos usually have transparent bg
    if (f && kind === "logo" && f.type === "image/png") setTransparent(true);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      if (name.trim()) fd.append("name", name.trim());
      fd.append("hasTransparentBg", transparent ? "true" : "false");
      if (tags.trim()) fd.append("tags", tags.trim());
      const res = await fetch("/api/brand-assets/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { asset?: unknown; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      // Reset form
      setFile(null);
      setPreview(null);
      setName("");
      setTags("");
      setTransparent(false);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px dashed var(--border-strong)",
        borderRadius: 10,
        background: "var(--surface)",
        padding: 20,
        display: "grid",
        gridTemplateColumns: preview ? "120px 1fr" : "1fr",
        gap: 20,
        alignItems: "flex-start",
      }}
    >
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          style={{
            width: 120,
            height: 120,
            objectFit: "contain",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg)",
            fontSize: 13,
            color: "var(--muted)",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {file ? (
            <>
              <strong style={{ color: "var(--text)" }}>{file.name}</strong>{" "}
              <span style={{ color: "var(--subtle)" }}>
                ({Math.round(file.size / 1024)} KB)
              </span>
            </>
          ) : (
            <>📎 Drop image here or click to select — PNG / JPEG / WebP, ≤ 8 MB</>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Kind
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as BrandAssetKind)}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontFamily: "inherit",
              }}
            >
              <option value="product">Product</option>
              <option value="logo">Logo</option>
              <option value="reference">Reference</option>
            </select>
            <span style={{ fontSize: 11, color: "var(--subtle)" }}>{KIND_HELP[kind]}</span>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lunia bottle — front"
              maxLength={120}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontFamily: "inherit",
              }}
            />
          </label>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Tags <span style={{ color: "var(--subtle)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(comma separated)</span>
          </span>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="white-bg, 3-4-angle, hero"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              background: "var(--bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontFamily: "inherit",
            }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--muted)" }}>
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
          />
          Transparent background (recommended for logos)
        </label>

        {error && (
          <div style={{ fontSize: 12, color: "var(--error)" }}>⚠ {error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 7,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: !file || uploading ? "not-allowed" : "pointer",
              opacity: !file || uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading…" : "Upload asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
