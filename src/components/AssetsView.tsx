"use client";
import { useState, useEffect, useRef } from "react";
import { AssetMetadata, AssetType, CarouselTemplate } from "@/lib/types";
import { ASSET_TYPES, UPLOADABLE_TYPES, ASSET_SECTIONS } from "@/lib/asset-shelves";
import { MAX_UPLOAD_BYTES, fmtSize, needsShrinking, shrinkForUpload } from "@/lib/image-shrink";
import { chunkForUpload } from "@/lib/upload-batching";

const LOADER_LINES = [
  "UPLOADING SLIDE IMAGES",
  "SAVING TO VAULT",
  "RUNNING VISION SCAN",
  "EXTRACTING BRAND PALETTE",
  "CALIBRATING COLOR MATRIX",
  "FINALIZING TEMPLATE",
];

function RetroLoader({ tick }: { tick: number }) {
  const [blink, setBlink] = useState(true);
  const step = Math.min(tick, LOADER_LINES.length - 1);
  const pct = Math.min(Math.round((tick / (LOADER_LINES.length + 1)) * 100), 96);
  const filled = Math.round(pct / 5);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      background: "#000",
      color: "#fff",
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 13,
      padding: "20px 24px",
      borderRadius: 8,
      border: "2px solid #fff",
      marginBottom: 24,
      lineHeight: 2,
      letterSpacing: "0.03em",
      minHeight: 220,
    }}>
      <div style={{
        textAlign: "center",
        fontSize: 10,
        letterSpacing: "0.25em",
        color: "#888",
        borderBottom: "1px solid #333",
        paddingBottom: 10,
        marginBottom: 14,
      }}>
        *** LUNIA TEMPLATE SYSTEM v1.0 ***
      </div>
      {LOADER_LINES.slice(0, step + 1).map((line, i) => (
        <div key={i} style={{ fontSize: 12 }}>
          <span style={{ color: "#555" }}>&gt; </span>
          {i < step ? (
            <>
              <span style={{ color: "#999" }}>{line}...</span>
              {"  "}
              <span style={{ color: "#fff", fontWeight: 700 }}>[ OK ]</span>
            </>
          ) : (
            <>
              <span>{line}...</span>
              <span style={{ opacity: blink ? 1 : 0 }}>_</span>
            </>
          )}
        </div>
      ))}
      <div style={{ marginTop: 18, fontSize: 11, color: "#666" }}>
        [{bar}] {pct}%
      </div>
    </div>
  );
}

// `uploadable: false` marks the categories nothing can be uploaded INTO —
function TypeBadge({ assetType }: { assetType?: AssetType }) {
  const t = ASSET_TYPES.find((a) => a.value === assetType)
    ?? ASSET_TYPES.find((a) => a.value === "other")!;
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
  /** Set when a file was too big and got re-encoded, so the size in the
   *  library not matching the file on disk is explained rather than mysterious. */
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  /** Files finished / files chosen, while a batch is in flight. Null when
   *  nothing is uploading. */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
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
  const [loaderTick, setLoaderTick] = useState(0);

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

  useEffect(() => {
    if (!creatingTemplate) { setLoaderTick(0); return; }
    const t = setInterval(() => setLoaderTick((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, [creatingTemplate]);

  function selectType(type: AssetType) {
    setPendingType(type);
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || !pendingType) return;
    await doUpload(files, pendingType);
    setPendingType(null);
  }

  async function doUpload(files: File[], assetType: AssetType) {
    setUploading(true);
    setUploadError(null);
    setUploadNote(null);
    setProgress({ done: 0, total: files.length });

    // Shrink first, sequentially: each pass decodes a full-resolution image
    // onto a canvas, and doing forty of those at once is how a browser tab
    // runs out of memory.
    //
    // A camera-resolution photo is routinely 8–12 MB, which used to come back
    // as a flat "File too large. Maximum size is 5 MB." and leave you to find
    // an image editor. The ceiling that actually bites is Vercel's 4.5 MB
    // request body, below our own 5 MB check, so a file between the two would
    // fail at the platform before the route ever saw it.
    const prepared: { blob: Blob; name: string }[] = [];
    const problems: string[] = [];
    let resizedCount = 0;
    let savedBytes = 0;

    for (const file of files) {
      if (!needsShrinking(file)) {
        prepared.push({ blob: file, name: file.name });
        continue;
      }
      const shrunk = await shrinkForUpload(file);
      if (shrunk.blob.size > MAX_UPLOAD_BYTES) {
        problems.push(`${file.name}: still ${fmtSize(shrunk.blob.size)} after resizing — export it smaller.`);
        continue;
      }
      if (shrunk.blob.size < file.size) {
        resizedCount += 1;
        savedBytes += file.size - shrunk.blob.size;
      }
      prepared.push(shrunk.blob.size < file.size ? shrunk : { blob: file, name: file.name });
    }

    // Chunks go one after another, never in parallel. Each request appends to
    // the single Redis key holding the whole library, and two of those in
    // flight together would lose one batch's entries with no error anywhere.
    let uploadedCount = 0;
    try {
      for (const group of chunkForUpload(prepared)) {
        const formData = new FormData();
        for (const f of group) formData.append("file", f.blob, f.name);
        formData.append("assetType", assetType);

        try {
          const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (!res.ok) {
            problems.push((data as { error?: string }).error ?? `Upload failed (${res.status})`);
          } else {
            uploadedCount += (data.uploaded as unknown[] | undefined)?.length ?? 0;
            for (const f of (data.failed as { name: string; error: string }[] | undefined) ?? []) {
              problems.push(`${f.name}: ${f.error}`);
            }
          }
        } catch {
          problems.push(`Network error while uploading ${group.length} file${group.length > 1 ? "s" : ""}.`);
        }
        setProgress((p) => (p ? { done: Math.min(p.total, p.done + group.length), total: p.total } : p));
      }

      await loadAssets();

      const notes: string[] = [];
      if (uploadedCount > 0) notes.push(`${uploadedCount} image${uploadedCount > 1 ? "s" : ""} added and described.`);
      if (resizedCount > 0) notes.push(`${resizedCount} resized before upload, saving ${fmtSize(savedBytes)}.`);
      setUploadNote(notes.length > 0 ? notes.join(" ") : null);
      // Every failure is listed rather than counted: in a drop of forty, "3
      // failed" tells you nothing about which three to try again.
      setUploadError(problems.length > 0 ? problems.join("\n") : null);
    } finally {
      setUploading(false);
      setProgress(null);
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

  function resizeForUpload(file: File, maxWidth = 1200): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || templateFiles.length === 0) return;
    setCreatingTemplate(true);
    setTemplateError(null);
    try {
      // Resize images client-side before upload to stay under Vercel's 4.5MB body limit
      const resized = await Promise.all(templateFiles.map((f) => resizeForUpload(f)));

      const form = new FormData();
      form.append("name", templateName.trim());
      if (templateDesc.trim()) form.append("description", templateDesc.trim());
      if (templateStyleNotes.trim()) form.append("styleNotes", templateStyleNotes.trim());
      form.append("contentDensity", templateDensity);
      resized.forEach((blob, i) => {
        form.append("images", blob, `slide-${i}.jpg`);
        form.append(`slideName_${i}`, `Slide ${i + 1}`);
      });
      // Step 1: upload images + save template (fast)
      const res = await fetch("/api/carousel-templates", { method: "POST", body: form });
      let data: unknown;
      try { data = await res.json(); } catch { data = {}; }
      if (!res.ok) {
        setTemplateError((data as { error?: string }).error ?? `Upload failed (${res.status})`);
        return;
      }
      const saved = data as CarouselTemplate;
      setTemplates((prev) => [saved, ...prev]);

      // Step 2: extract brand palette via Claude Sonnet (slow — separate request)
      try {
        const analyzeRes = await fetch(`/api/carousel-templates/${saved.id}`, { method: "PATCH" });
        if (analyzeRes.ok) {
          const analyzed = await analyzeRes.json() as CarouselTemplate;
          setTemplates((prev) => prev.map((t) => t.id === analyzed.id ? analyzed : t));
        }
      } catch {
        // non-fatal — template saved, palette extraction failed silently
      }

      setShowTemplateForm(false);
      setTemplateName("");
      setTemplateDesc("");
      setTemplateStyleNotes("");
      setTemplateDensity("medium");
      setTemplateFiles([]);
    } catch (err) {
      setTemplateError(`Upload failed — ${err instanceof Error ? err.message : "please try again"}`);
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
          Upload as — pick as many files as you like
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
          {UPLOADABLE_TYPES.map((t) => (
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
                {uploading && pendingType === t.value
                  ? progress && progress.total > 1
                    ? `Uploading ${progress.done}/${progress.total}…`
                    : "Uploading..."
                  : `+ ${t.label}`}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {uploadError && (
        <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#9b1c1c", whiteSpace: "pre-line", lineHeight: 1.5 }}>
          {uploadError}
        </div>
      )}

      {uploadNote && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--muted)" }}>
          {uploadNote}
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
        // Grouped by category rather than one flat wall of images. With
        // Lifestyle and Gen Z as separate shelves the library is browsable by
        // the thing you are actually looking for; a mixed grid made you read
        // every badge. Empty categories render nothing at all.
        ASSET_SECTIONS.map((section) => {
          const group = assets.filter((a) => section.match(a.assetType));
          if (group.length === 0) return null;
          return (
            <div key={section.key} style={{ marginBottom: 34 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: section.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {section.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--subtle)" }}>{group.length}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
          {group.map((a) => (
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
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: a.description ? 6 : 10 }}>
                  {formatDate(a.uploadedAt)}
                </div>
                {/* What the model reads when it picks an image for an email
                    block. Shown so the library is legible to you too: a photo
                    the chooser keeps ignoring usually has a caption that
                    describes something other than what you see. */}
                {a.description && (
                  <div
                    title={a.description}
                    style={{
                      fontSize: 11, color: "var(--subtle)", lineHeight: 1.45, marginBottom: 10,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}
                  >
                    {a.description}
                  </div>
                )}
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
            </div>
          );
        })
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
              background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {showTemplateForm ? "Cancel" : "New Template"}
          </button>
        </div>

        {/* Template creation form */}
        {showTemplateForm && (
          <form onSubmit={handleCreateTemplate} style={{ border: creatingTemplate ? "2px solid #fff" : "1.5px solid var(--border)", borderRadius: 10, padding: 20, marginBottom: 24, background: creatingTemplate ? "#000" : "var(--surface)" }}>
            {creatingTemplate && <RetroLoader tick={loaderTick} />}
            <div style={{ display: creatingTemplate ? "none" : "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
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
            <div style={{ display: creatingTemplate ? "none" : "block", marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description (optional)</label>
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Brief description of this template style"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: creatingTemplate ? "none" : "block", marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Style Notes (optional)</label>
              <input
                type="text"
                value={templateStyleNotes}
                onChange={(e) => setTemplateStyleNotes(e.target.value)}
                placeholder="e.g. Bold headers, minimal body text, strong CTA"
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 7, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: creatingTemplate ? "none" : "block", marginBottom: 16 }}>
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
            {!creatingTemplate && templateError && (
              <div style={{ background: "#fff3f3", border: "1px solid #f5c6c6", borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#9b1c1c" }}>
                {templateError}
              </div>
            )}
            {!creatingTemplate && (
              <button
                type="submit"
                disabled={!templateName.trim() || templateFiles.length === 0}
                style={{
                  padding: "10px 24px", fontSize: 14, fontWeight: 700,
                  background: "var(--accent)", color: "#fff",
                  border: "none", borderRadius: 7, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Create Template
              </button>
            )}
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
