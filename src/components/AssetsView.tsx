"use client";
import { useState, useEffect, useRef } from "react";
import { AssetMetadata, AssetType, CarouselTemplate } from "@/lib/types";

const ASSET_TYPES: { value: AssetType; label: string; description: string; color: string }[] = [
  { value: "logo",                label: "Logo",              description: "Brand logo or wordmark",            color: "#1e7a8a" },
  { value: "carousel-style",      label: "Carousel Style",    description: "Reference layout for generation",   color: "#7c3aed" },
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

  // Carousel templates state
  const [templates, setTemplates] = useState<CarouselTemplate[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateStyleNotes, setTemplateStyleNotes] = useState("");
  const [templateDensity, setTemplateDensity] = useState<"minimal" | "medium" | "dense">("medium");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

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

  async function loadTemplates() {
    try {
      const res = await fetch("/api/carousel-templates");
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadAssets();
    loadTemplates();
  }, []);

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

  async function handleDeleteTemplate(id: string) {
    try {
      await fetch(`/api/carousel-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // non-critical
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || templateFiles.length === 0) return;
    setCreatingTemplate(true);
    setTemplateError(null);
    try {
      const form = new FormData();
      form.append("name", templateName.trim());
      if (templateDesc.trim()) form.append("description", templateDesc.trim());
      if (templateStyleNotes.trim()) form.append("styleNotes", templateStyleNotes.trim());
      form.append("contentDensity", templateDensity);
      templateFiles.forEach((file, i) => {
        form.append("images", file);
        form.append(`slideName_${i}`, `Slide ${i + 1}`);
      });
      const res = await fetch("/api/carousel-templates", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setTemplateError((data as { error?: string }).error ?? "Failed to create template");
        return;
      }
      setTemplates((prev) => [data as CarouselTemplate, ...prev]);
      setShowTemplateForm(false);
      setTemplateName("");
      setTemplateDesc("");
      setTemplateStyleNotes("");
      setTemplateDensity("medium");
      setTemplateFiles([]);
    } catch {
      setTemplateError("Network error — please try again.");
    } finally {
      setCreatingTemplate(false);
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
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

      {/* ─── Carousel Templates ─────────────────────────────────────────────── */}
      <div style={{ marginTop: 48, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Carousel Templates</h2>
            <p style={{ color: "var(--muted)", marginTop: 3, fontSize: 13 }}>
              Upload multi-slide templates for Claude to match when generating content.
            </p>
          </div>
          <button
            onClick={() => setShowTemplateForm((v) => !v)}
            style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 700,
              background: "var(--text)", color: "var(--bg)",
              border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {showTemplateForm ? "Cancel" : "New Template"}
          </button>
        </div>

        {/* Template creation form */}
        {showTemplateForm && (
          <form onSubmit={handleCreateTemplate} style={{ border: "1.5px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 24, background: "var(--surface)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Minimal Dark"
                  required
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Content Density</label>
                <select
                  value={templateDensity}
                  onChange={(e) => setTemplateDensity(e.target.value as "minimal" | "medium" | "dense")}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", cursor: "pointer", boxSizing: "border-box" }}
                >
                  <option value="minimal">Minimal</option>
                  <option value="medium">Medium</option>
                  <option value="dense">Dense</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description (optional)</label>
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Brief description of this template style"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Style Notes (optional)</label>
              <input
                type="text"
                value={templateStyleNotes}
                onChange={(e) => setTemplateStyleNotes(e.target.value)}
                placeholder="e.g. Bold headers, minimal body text, strong CTA"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Slide Images * (upload all slides)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => setTemplateFiles(Array.from(e.target.files ?? []))}
                style={{ fontSize: 13, fontFamily: "inherit" }}
              />
              {templateFiles.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                  {templateFiles.length} file{templateFiles.length > 1 ? "s" : ""} selected
                </div>
              )}
            </div>
            {templateError && (
              <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#9b1c1c" }}>
                {templateError}
              </div>
            )}
            <button
              type="submit"
              disabled={creatingTemplate || !templateName.trim() || templateFiles.length === 0}
              style={{
                padding: "10px 24px", fontSize: 14, fontWeight: 700,
                background: "var(--text)", color: "var(--bg)",
                border: "none", borderRadius: 7, cursor: creatingTemplate ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: creatingTemplate ? 0.6 : 1,
              }}
            >
              {creatingTemplate ? "Uploading..." : "Create Template"}
            </button>
          </form>
        )}

        {/* Template list */}
        {templates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: 13 }}>
            No templates yet. Create one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {templates.map((t) => (
              <div
                key={t.id}
                style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--surface)" }}
              >
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      {t.contentDensity} density · {t.images.length} slide{t.images.length !== 1 ? "s" : ""} · {formatDate(t.uploadedAt)}
                      {t.description && ` · ${t.description}`}
                    </div>
                    {t.styleNotes && (
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontStyle: "italic" }}>{t.styleNotes}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    style={{ fontSize: 12, fontWeight: 600, color: "#9b1c1c", border: "1px solid #f5c6c6", borderRadius: 5, padding: "4px 10px", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit", flexShrink: 0, marginLeft: 12 }}
                  >
                    Delete
                  </button>
                </div>
                {/* Slide thumbnails */}
                <div style={{ display: "flex", gap: 8, padding: 12, overflowX: "auto" }}>
                  {t.images.map((img) => (
                    <div key={img.id} style={{ flexShrink: 0, textAlign: "center" }}>
                      <img
                        src={img.url}
                        alt={img.slideName}
                        style={{ width: 80, aspectRatio: "4/5", objectFit: "cover", borderRadius: 6, display: "block", border: "1px solid var(--border)" }}
                      />
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>{img.slideName}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
