"use client";
import { useRef, useState } from "react";

export type ImageStyle = "realistic" | "illustration" | "anime" | "vector";
export type PanelRole = "hero" | "value" | "summary";

export type EmailPanelData = {
  id: string;
  role: PanelRole;
  subject: string;
  subSubject: string;
  body: string;
  cta: string;
  imagePrompt: string;
  imageUrl: string | null;
  imageStyle: ImageStyle;
};

const ROLE_LABELS: Record<PanelRole, { label: string; desc: string }> = {
  hero: { label: "Panel 1 — Hero", desc: "Subject + CTA" },
  value: { label: "Panel 2 — Value", desc: "Product / Information" },
  summary: { label: "Panel 3 — Summary", desc: "Close + CTA" },
};

const IMAGE_STYLE_CHIPS: { key: ImageStyle; label: string }[] = [
  { key: "realistic", label: "Real" },
  { key: "illustration", label: "Illus" },
  { key: "vector", label: "Vec" },
  { key: "anime", label: "Anime" },
];

// ─── Canvas PNG utilities ─────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number,
): number {
  if (!text.trim()) return y;
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && n > 0) {
      if (maxLines && linesDrawn >= maxLines - 1) {
        ctx.fillText(line.trimEnd() + "...", x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trimEnd(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) {
    ctx.fillText(line.trimEnd(), x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  let imgSrc = src;
  let blobUrl: string | null = null;

  if (!src.startsWith("data:")) {
    // Fetch remote URL as blob to bypass CORS restrictions on canvas
    const res = await fetch(src);
    const blob = await res.blob();
    blobUrl = URL.createObjectURL(blob);
    imgSrc = blobUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      resolve(img);
    };
    img.onerror = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      reject(new Error("Image load failed"));
    };
    img.src = imgSrc;
  });
}

export async function downloadPanelAsPng(panel: EmailPanelData) {
  const W = 1200, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background image (cover-fit) or dark placeholder
  if (panel.imageUrl) {
    try {
      const img = await loadImage(panel.imageUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (W - sw) / 2;
      const sy = (H - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh);
    } catch {
      ctx.fillStyle = "#1A1816";
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = "#1A1816";
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Gradient overlay — deeper for value (more body text)
  const overlayStart = panel.role === "value" ? H * 0.22 : H * 0.30;
  const grad = ctx.createLinearGradient(0, overlayStart, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 3. Text layout — anchor from overlay start
  const PAD = 64;
  const maxW = W - PAD * 2;
  let y = overlayStart + 72;

  // Subject — large bold headline
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 62px system-ui, -apple-system, Helvetica, Arial, sans-serif`;
  ctx.textBaseline = "alphabetic";
  y = wrapText(ctx, panel.subject, PAD, y, maxW, 80, 3);

  // Sub-subject
  if (panel.subSubject) {
    y += 14;
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = `28px system-ui, -apple-system, Helvetica, Arial, sans-serif`;
    y = wrapText(ctx, panel.subSubject, PAD, y, maxW, 42, 3);
  }

  // Body (value prop panel only)
  if (panel.role === "value" && panel.body) {
    y += 22;
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = `22px system-ui, -apple-system, Helvetica, Arial, sans-serif`;
    y = wrapText(ctx, panel.body, PAD, y, maxW, 34, 4);
  }

  // CTA button (hero + summary)
  if ((panel.role === "hero" || panel.role === "summary") && panel.cta) {
    y += 32;
    ctx.font = `bold 26px system-ui, -apple-system, Helvetica, Arial, sans-serif`;
    const textW = ctx.measureText(panel.cta).width;
    const btnPadX = 52;
    const btnH = 68;
    const btnW = textW + btnPadX * 2;
    const btnR = 10;

    ctx.fillStyle = "#C8A96E";
    drawRoundedRect(ctx, PAD, y, btnW, btnH, btnR);
    ctx.fill();

    ctx.fillStyle = "#0D0C0A";
    ctx.textBaseline = "middle";
    ctx.fillText(panel.cta, PAD + btnPadX, y + btnH / 2);
    ctx.textBaseline = "alphabetic";
  }

  // 4. Download
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lunia-${panel.role}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
  panel: EmailPanelData;
  onPanelChange: (updated: EmailPanelData) => void;
  onGenerateImage: () => void;
  imageLoading: boolean;
  imageError: string | null;
};

export function EmailPanelCard({
  panel,
  onPanelChange,
  onGenerateImage,
  imageLoading,
  imageError,
}: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { label, desc } = ROLE_LABELS[panel.role];
  const hasImage = !!panel.imageUrl;

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      onPanelChange({ ...panel, imageUrl: dataUrl });
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadPanelAsPng(panel);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* Role label */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text)",
          }}>
            {label}
          </span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            · {desc}
          </span>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          title="Download as PNG"
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 6,
            background: "var(--surface-r)", border: "1px solid var(--border)",
            cursor: downloading ? "default" : "pointer",
            fontFamily: "var(--font-mono)", fontSize: 9,
            color: downloading ? "var(--subtle)" : "var(--muted)",
            letterSpacing: "0.06em", textTransform: "uppercase",
            opacity: downloading ? 0.6 : 1,
            transition: "all 0.12s",
          }}
        >
          {downloading ? (
            "Exporting..."
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.5 1v7M2.5 5.5l3 3 3-3M1 9.5h9" />
              </svg>
              PNG
            </>
          )}
        </button>
      </div>

      {/* Image area */}
      <div style={{ position: "relative", height: 280 }}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={panel.imageUrl!}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Text overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, transparent 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.86) 100%)",
              display: "flex", flexDirection: "column", justifyContent: "flex-end",
              padding: "20px 20px",
            }}>
              <div style={{
                fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 700,
                color: "#fff", lineHeight: 1.25, marginBottom: 6,
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}>
                {panel.subject || <span style={{ opacity: 0.4 }}>Subject headline...</span>}
              </div>
              <div style={{
                fontFamily: "var(--font-ui)", fontSize: 13,
                color: "rgba(255,255,255,0.82)", lineHeight: 1.5, marginBottom: 8,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}>
                {panel.subSubject || <span style={{ opacity: 0.4 }}>Sub-subject line...</span>}
              </div>
              {panel.role === "value" && panel.body && (
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 12,
                  color: "rgba(255,255,255,0.65)", lineHeight: 1.55,
                  display: "-webkit-box", WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {panel.body}
                </div>
              )}
              {(panel.role === "hero" || panel.role === "summary") && panel.cta && (
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    display: "inline-block",
                    padding: "8px 20px", borderRadius: 7,
                    background: "var(--accent)",
                    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
                    color: "var(--bg)",
                  }}>
                    {panel.cta}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* No image placeholder */
          <div style={{
            position: "absolute", inset: 0,
            background: "var(--surface-r)",
            border: "2px dashed var(--border)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 6, lineHeight: 1.3 }}>
                {panel.subject || <span style={{ color: "var(--subtle)" }}>Subject headline</span>}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)", lineHeight: 1.5, maxWidth: 400, padding: "0 24px" }}>
                {panel.subSubject || <span style={{ color: "var(--subtle)", fontSize: 11 }}>sub-subject line</span>}
              </div>
              {panel.role === "value" && panel.body && (
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)", lineHeight: 1.5, maxWidth: 400, padding: "6px 24px 0" }}>
                  {panel.body}
                </div>
              )}
              {(panel.role === "hero" || panel.role === "summary") && panel.cta && (
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    display: "inline-block", padding: "6px 16px", borderRadius: 6,
                    background: "var(--accent-dim)", border: "1px solid var(--accent-mid)",
                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--accent)",
                  }}>
                    {panel.cta}
                  </span>
                </div>
              )}
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.08em" }}>
              no image · generate or upload below
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Style chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 4 }}>
            Style
          </span>
          {IMAGE_STYLE_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => onPanelChange({ ...panel, imageStyle: chip.key })}
              style={{
                padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                fontFamily: "var(--font-mono)", fontSize: 10,
                background: panel.imageStyle === chip.key ? "var(--accent-dim)" : "var(--surface-r)",
                border: panel.imageStyle === chip.key ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                color: panel.imageStyle === chip.key ? "var(--accent)" : "var(--subtle)",
                transition: "all 0.12s",
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Prompt row */}
        <div>
          <button
            onClick={() => setPromptOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span style={{ transform: promptOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>›</span>
            Image Prompt
          </button>
          {promptOpen && (
            <div style={{ marginTop: 6 }}>
              <textarea
                value={panel.imagePrompt}
                onChange={e => onPanelChange({ ...panel, imagePrompt: e.target.value })}
                rows={3}
                placeholder="Image prompt (edit before generating)..."
                style={{
                  width: "100%", resize: "vertical",
                  padding: "8px 10px", borderRadius: 6,
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
                  lineHeight: 1.6, boxSizing: "border-box", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          )}
        </div>

        {/* Edit copy row */}
        <div>
          <button
            onClick={() => setEditOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span style={{ transform: editOpen ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" }}>›</span>
            Edit Copy
          </button>
          {editOpen && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Subject */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Subject</div>
                <input
                  type="text"
                  value={panel.subject}
                  onChange={e => onPanelChange({ ...panel, subject: e.target.value })}
                  placeholder="Main headline..."
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                    background: "var(--surface-r)", border: "1px solid var(--border)",
                    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                    color: "var(--text)", outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              {/* Sub-subject */}
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Sub-subject</div>
                <input
                  type="text"
                  value={panel.subSubject}
                  onChange={e => onPanelChange({ ...panel, subSubject: e.target.value })}
                  placeholder="Sub-headline line..."
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                    background: "var(--surface-r)", border: "1px solid var(--border)",
                    fontFamily: "var(--font-ui)", fontSize: 13,
                    color: "var(--text)", outline: "none",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              {/* Body (value panel only) */}
              {panel.role === "value" && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Body</div>
                  <textarea
                    value={panel.body}
                    onChange={e => onPanelChange({ ...panel, body: e.target.value })}
                    rows={3}
                    style={{
                      width: "100%", resize: "vertical", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                      background: "var(--surface-r)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
                      lineHeight: 1.6, outline: "none",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              )}
              {/* CTA (hero + summary) */}
              {(panel.role === "hero" || panel.role === "summary") && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>CTA Button</div>
                  <input
                    type="text"
                    value={panel.cta}
                    onChange={e => onPanelChange({ ...panel, cta: e.target.value })}
                    placeholder="Shop now, Learn more..."
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                      background: "var(--surface-r)", border: "1px solid var(--border)",
                      fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                      color: "var(--accent)", outline: "none",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 2 }}>
          <button
            onClick={onGenerateImage}
            disabled={imageLoading || !panel.imagePrompt.trim()}
            style={{
              padding: "6px 16px", borderRadius: 6,
              cursor: imageLoading || !panel.imagePrompt.trim() ? "not-allowed" : "pointer",
              background: imageLoading || !panel.imagePrompt.trim() ? "var(--surface-h)" : "var(--surface-r)",
              border: "1px solid var(--border-s, var(--border))",
              fontFamily: "var(--font-ui)", fontSize: 12,
              color: imageLoading || !panel.imagePrompt.trim() ? "var(--subtle)" : "var(--muted)",
              transition: "all 0.12s",
            }}
          >
            {imageLoading ? "Generating..." : hasImage ? "↺ Regenerate" : "Generate image →"}
          </button>

          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all 0.12s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V3M3 5.5l3-3 3 3M1 10.5h10" />
            </svg>
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleUpload}
          />

          {imageError && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--error)" }}>
              {imageError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
