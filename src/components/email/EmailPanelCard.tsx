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
  overlayEnabled: boolean; // dark gradient shade behind text
  textBold: boolean;       // font-weight 700 vs 400
};

const PANEL_FONT = "Helvetica, Arial, sans-serif";
const BRAND = {
  cream:   "#F7F4EF",
  navy:    "#102635",
  navyMid: "#2c3f51",
  yellow:  "#ffd800",
  teal:    "#bffbf8",
};

const ROLE_META: Record<PanelRole, { label: string; desc: string }> = {
  hero:    { label: "Panel 1", desc: "Hero" },
  value:   { label: "Panel 2", desc: "Value" },
  summary: { label: "Panel 3", desc: "Summary" },
};

const IMAGE_STYLE_CHIPS: { key: ImageStyle; label: string }[] = [
  { key: "realistic",    label: "Real"  },
  { key: "illustration", label: "Illus" },
  { key: "vector",       label: "Vec"   },
  { key: "anime",        label: "Anime" },
];

// Strip em dashes everywhere
const sanitize = (s: string) => s.replace(/—/g, " - ").replace(/\s{2,}/g, " ").trim();

// ─── Canvas PNG utilities ─────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines?: number,
  align: "left" | "center" = "left",
): number {
  if (!text.trim()) return y;
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let linesDrawn = 0;
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      if (maxLines && linesDrawn >= maxLines - 1) {
        lines.push(line.trimEnd() + "...");
        line = "";
        break;
      }
      lines.push(line.trimEnd());
      line = words[n] + " ";
      linesDrawn++;
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());

  for (const l of lines) {
    if (align === "center") {
      ctx.fillText(l, x, currentY);
    } else {
      ctx.fillText(l, x, currentY);
    }
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

async function loadImageAsBlob(src: string): Promise<HTMLImageElement> {
  let imgSrc = src;
  let blobUrl: string | null = null;

  if (!src.startsWith("data:")) {
    const res = await fetch(src);
    const blob = await res.blob();
    blobUrl = URL.createObjectURL(blob);
    imgSrc = blobUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); resolve(img); };
    img.onerror = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); reject(); };
    img.src = imgSrc;
  });
}

/** Sample average brightness in a canvas region */
function sampleBrightness(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): number {
  const data = ctx.getImageData(
    Math.max(0, Math.round(x)), Math.max(0, Math.round(y)),
    Math.min(w, ctx.canvas.width - Math.round(x)),
    Math.min(h, ctx.canvas.height - Math.round(y)),
  ).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4);
}

export async function downloadPanelAsPng(panel: EmailPanelData) {
  // 600px wide = email standard (full-width single column)
  const W = 600, H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const fw = panel.textBold ? "700" : "400";

  // 1. Background
  if (panel.imageUrl) {
    try {
      const img = await loadImageAsBlob(panel.imageUrl);
      const scale = Math.max(W / img.width, H / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
    } catch {
      ctx.fillStyle = "#1A1816";
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    ctx.fillStyle = "#1A1816";
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Gradient overlay (only when enabled)
  const gradStart = panel.role === "value" ? H * 0.18 : H * 0.28;
  if (panel.overlayEnabled) {
    const grad = ctx.createLinearGradient(0, gradStart, 0, H);
    grad.addColorStop(0, "rgba(16,38,53,0)");
    grad.addColorStop(0.5, "rgba(16,38,53,0.58)");
    grad.addColorStop(1, "rgba(16,38,53,0.90)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const PAD = 32;
  const maxW = W - PAD * 2;

  // Text color: cream on dark/overlay, cream always (image is bg)
  const txtMain = BRAND.cream;
  const txtSub  = `rgba(247,244,239,0.82)`;
  const txtBody = `rgba(247,244,239,0.65)`;

  // 3. Hero: centered layout
  if (panel.role === "hero") {
    ctx.textAlign = "center";
    const cx = W / 2;

    let y = H * 0.30;

    ctx.font = `${fw} 35px ${PANEL_FONT}`;
    ctx.fillStyle = txtMain;
    y = wrapText(ctx, sanitize(panel.subject), cx, y, maxW, 44, 3, "center");

    if (panel.subSubject) {
      y += 8;
      ctx.font = `${fw} 14px ${PANEL_FONT}`;
      ctx.fillStyle = txtSub;
      y = wrapText(ctx, sanitize(panel.subSubject), cx, y, maxW * 0.88, 20, 2, "center");
    }

    if (panel.cta) {
      y += 16;
      ctx.font = `${fw} 14px ${PANEL_FONT}`;
      const tW = ctx.measureText(panel.cta).width;
      const bPadX = 28, bH = 36, bW = tW + bPadX * 2, bR = 6;
      const bx = cx - bW / 2;

      const brightness = sampleBrightness(ctx, bx, y - 6, bW, bH + 6);
      const [btnBg, btnTxt] = brightness < 80
        ? [BRAND.cream,    BRAND.navy]
        : brightness < 150
          ? [BRAND.yellow,  BRAND.navy]
          : [BRAND.navyMid, BRAND.cream];

      ctx.fillStyle = btnBg;
      drawRoundedRect(ctx, bx, y, bW, bH, bR);
      ctx.fill();
      ctx.fillStyle = btnTxt;
      ctx.textBaseline = "middle";
      ctx.fillText(panel.cta, cx, y + bH / 2);
      ctx.textBaseline = "alphabetic";
    }

  } else {
    // Value + Summary: bottom-anchored, left-aligned text
    ctx.textAlign = "left";
    const fontSize = panel.role === "value" ? 27 : 30;
    let y = gradStart + 36;

    ctx.font = `${fw} ${fontSize}px ${PANEL_FONT}`;
    ctx.fillStyle = txtMain;
    y = wrapText(ctx, sanitize(panel.subject), PAD, y, maxW, Math.round(fontSize * 1.3), 3);

    if (panel.subSubject) {
      y += 6;
      ctx.font = `${fw} 13px ${PANEL_FONT}`;
      ctx.fillStyle = txtSub;
      y = wrapText(ctx, sanitize(panel.subSubject), PAD, y, maxW, 19, 2);
    }

    if (panel.role === "value" && panel.body) {
      y += 10;
      ctx.font = `${fw} 11px ${PANEL_FONT}`;
      ctx.fillStyle = txtBody;
      y = wrapText(ctx, sanitize(panel.body), PAD, y, maxW, 17, 4);
    }

    if (panel.role === "summary" && panel.cta) {
      y += 16;
      ctx.font = `${fw} 14px ${PANEL_FONT}`;
      const tW = ctx.measureText(panel.cta).width;
      const bPadX = 28, bH = 36, bW = tW + bPadX * 2, bR = 6;
      const bx = (W - bW) / 2; // centered

      const brightness = sampleBrightness(ctx, bx, y - 6, bW, bH + 6);
      const [btnBg, btnTxt] = brightness < 80
        ? [BRAND.cream,    BRAND.navy]
        : brightness < 150
          ? [BRAND.yellow,  BRAND.navy]
          : [BRAND.navyMid, BRAND.cream];

      ctx.fillStyle = btnBg;
      drawRoundedRect(ctx, bx, y, bW, bH, bR);
      ctx.fill();
      ctx.fillStyle = btnTxt;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(panel.cta, W / 2, y + bH / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

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
  onRegenerateText: () => void;
  imageLoading: boolean;
  imageError: string | null;
  regeneratingText: boolean;
};

export function EmailPanelCard({
  panel,
  onPanelChange,
  onGenerateImage,
  onRegenerateText,
  imageLoading,
  imageError,
  regeneratingText,
}: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { label, desc } = ROLE_META[panel.role];
  const hasImage = !!panel.imageUrl;
  const isHero = panel.role === "hero";

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onPanelChange({ ...panel, imageUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handleClearText() {
    onPanelChange({ ...panel, subject: "", subSubject: "", body: "", cta: "" });
  }

  async function handleDownload() {
    setDownloading(true);
    try { await downloadPanelAsPng(panel); } finally { setDownloading(false); }
  }

  // ── Text overlay (shared across image / no-image states) ──────────────────
  function TextOverlay({ onDark }: { onDark: boolean }) {
    const showOverlay = onDark && panel.overlayEnabled;
    const textColor = onDark ? BRAND.cream : "#1a1816";
    const subColor  = onDark ? `rgba(247,244,239,0.82)` : "rgba(26,24,22,0.65)";
    const bodyColor = onDark ? `rgba(247,244,239,0.65)` : "rgba(26,24,22,0.5)";
    const fw = panel.textBold ? 700 : 400;

    if (isHero) {
      return (
        <div style={{
          position: "absolute", inset: 0,
          background: showOverlay
            ? "linear-gradient(to bottom, rgba(16,38,53,0.25) 0%, rgba(16,38,53,0.78) 100%)"
            : "transparent",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 28px", textAlign: "center",
          gap: 0,
        }}>
          <div style={{
            fontFamily: PANEL_FONT, fontSize: 22, fontWeight: fw,
            color: textColor, lineHeight: 1.25, marginBottom: 8,
          }}>
            {sanitize(panel.subject) || <span style={{ opacity: 0.3 }}>Subject headline...</span>}
          </div>
          <div style={{
            fontFamily: PANEL_FONT, fontSize: 13, fontWeight: fw,
            color: subColor, lineHeight: 1.55, marginBottom: 14, maxWidth: "85%",
          }}>
            {sanitize(panel.subSubject) || <span style={{ opacity: 0.3 }}>Sub-subject line...</span>}
          </div>
          {panel.cta && (
            <div style={{
              display: "inline-block",
              padding: "9px 24px", borderRadius: 7,
              background: BRAND.yellow, color: BRAND.navy,
              fontFamily: PANEL_FONT, fontSize: 13, fontWeight: fw,
            }}>
              {panel.cta}
            </div>
          )}
        </div>
      );
    }

    // Value + Summary: bottom-anchored
    return (
      <div style={{
        position: "absolute", inset: 0,
        background: showOverlay
          ? `linear-gradient(to bottom, transparent 20%, rgba(16,38,53,0.60) 55%, rgba(16,38,53,0.90) 100%)`
          : "transparent",
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        padding: "20px 20px",
      }}>
        <div style={{
          fontFamily: PANEL_FONT, fontSize: panel.role === "value" ? 17 : 19,
          fontWeight: fw, color: textColor, lineHeight: 1.25, marginBottom: 5,
        }}>
          {sanitize(panel.subject) || <span style={{ opacity: 0.3 }}>Subject...</span>}
        </div>
        <div style={{
          fontFamily: PANEL_FONT, fontSize: 12, fontWeight: fw,
          color: subColor, lineHeight: 1.5, marginBottom: panel.role === "value" ? 7 : 10,
        }}>
          {sanitize(panel.subSubject) || <span style={{ opacity: 0.3 }}>Sub-subject...</span>}
        </div>
        {panel.role === "value" && panel.body && (
          <div style={{
            fontFamily: PANEL_FONT, fontSize: 11, fontWeight: fw,
            color: bodyColor, lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {sanitize(panel.body)}
          </div>
        )}
        {panel.role === "summary" && panel.cta && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <div style={{
              padding: "9px 24px", borderRadius: 7,
              background: BRAND.yellow, color: BRAND.navy,
              fontFamily: PANEL_FONT, fontSize: 13, fontWeight: fw,
            }}>
              {panel.cta}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid var(--border)",
      background: "var(--surface)",
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {/* Role label */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text)",
          }}>{label}</span>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9,
            letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)",
          }}>· {desc}</span>
        </div>

        {/* Text controls */}
        <div style={{ display: "flex", gap: 4 }}>
          {/* Overlay toggle */}
          <button
            onClick={() => onPanelChange({ ...panel, overlayEnabled: !panel.overlayEnabled })}
            title={panel.overlayEnabled ? "Remove dark overlay" : "Add dark overlay"}
            style={{
              width: 26, height: 26, borderRadius: 5,
              background: panel.overlayEnabled ? "var(--accent-dim)" : "var(--surface-r)",
              border: panel.overlayEnabled ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: panel.overlayEnabled ? "var(--accent)" : "var(--subtle)",
              transition: "all 0.12s",
            }}
          >
            {/* Eye icon */}
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5C2.5 2 9.5 2 11 5C9.5 8 2.5 8 1 5z"/>
              <circle cx="6" cy="5" r="1.5"/>
              {!panel.overlayEnabled && <line x1="2" y1="1" x2="10" y2="9"/>}
            </svg>
          </button>
          {/* Clear */}
          <button
            onClick={handleClearText}
            title="Clear text"
            style={{
              width: 26, height: 26, borderRadius: 5,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--subtle)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
            </svg>
          </button>
          {/* Edit */}
          <button
            onClick={() => setEditOpen(v => !v)}
            title="Edit copy"
            style={{
              width: 26, height: 26, borderRadius: 5,
              background: editOpen ? "var(--accent-dim)" : "var(--surface-r)",
              border: editOpen ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: editOpen ? "var(--accent)" : "var(--subtle)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 2L8 3.5l-5 5H1.5V7l5-5z"/>
            </svg>
          </button>
          {/* Regenerate text */}
          <button
            onClick={onRegenerateText}
            disabled={regeneratingText}
            title="Regenerate copy"
            style={{
              width: 26, height: 26, borderRadius: 5,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              cursor: regeneratingText ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--subtle)", opacity: regeneratingText ? 0.5 : 1,
              transition: "opacity 0.12s",
            }}
          >
            {regeneratingText
              ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 9 }}>...</span>
              : <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 2A4.5 4.5 0 105.5 10" />
                  <path d="M9.5 2v2.5H7" />
                </svg>
            }
          </button>
        </div>

        {/* Download PNG */}
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
            color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase",
            opacity: downloading ? 0.5 : 1, transition: "all 0.12s",
          }}
        >
          {downloading ? "..." : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 1v6M2.5 5l2.5 3 2.5-3M1 9h8" />
              </svg>
              PNG
            </>
          )}
        </button>
      </div>

      {/* ── Image / Preview area ── */}
      <div style={{ position: "relative", height: 280 }}>
        {hasImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={panel.imageUrl!}
              alt=""
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <TextOverlay onDark />
          </>
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: "var(--surface-r)",
            border: "2px dashed var(--border)",
            display: "flex", alignItems: "center", justifyContent: isHero ? "center" : "flex-end",
            flexDirection: "column",
            padding: isHero ? "24px" : "20px",
          }}>
            <TextOverlay onDark={false} />
            <div style={{
              position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
              letterSpacing: "0.08em", whiteSpace: "nowrap",
            }}>
              no image · generate or upload below
            </div>
          </div>
        )}
      </div>

      {/* ── Edit copy (collapsible) ── */}
      {editOpen && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Bold toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Text weight</span>
            <button
              onClick={() => onPanelChange({ ...panel, textBold: !panel.textBold })}
              title={panel.textBold ? "Switch to regular weight" : "Switch to bold"}
              style={{
                padding: "3px 12px", borderRadius: 5, cursor: "pointer",
                background: panel.textBold ? "var(--accent-dim)" : "var(--surface-r)",
                border: panel.textBold ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                fontFamily: PANEL_FONT, fontSize: 12,
                fontWeight: panel.textBold ? 700 : 400,
                color: panel.textBold ? "var(--accent)" : "var(--subtle)",
                transition: "all 0.12s",
              }}
            >
              B
            </button>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)" }}>
              {panel.textBold ? "Bold" : "Regular"}
            </span>
          </div>

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
                fontFamily: PANEL_FONT, fontSize: 14, fontWeight: 400,
                color: "var(--text)", outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Sub-subject</div>
            <input
              type="text"
              value={panel.subSubject}
              onChange={e => onPanelChange({ ...panel, subSubject: e.target.value })}
              placeholder="Sub-headline..."
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                background: "var(--surface-r)", border: "1px solid var(--border)",
                fontFamily: PANEL_FONT, fontSize: 13, fontWeight: 400,
                color: "var(--text)", outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>
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
                  fontFamily: PANEL_FONT, fontSize: 13, fontWeight: 400,
                  color: "var(--muted)", lineHeight: 1.6, outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          )}
          {(panel.role === "hero" || panel.role === "summary") && (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>CTA Button</div>
              <input
                type="text"
                value={panel.cta}
                onChange={e => onPanelChange({ ...panel, cta: e.target.value })}
                placeholder="Shop now..."
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 6, boxSizing: "border-box",
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  fontFamily: PANEL_FONT, fontSize: 13, fontWeight: 400,
                  color: "var(--text)", outline: "none",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                onBlur={e => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Controls bar ── */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Style chips */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginRight: 2 }}>Style</span>
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
            >{chip.label}</button>
          ))}
        </div>

        {/* Prompt */}
        <div>
          <button
            onClick={() => setPromptOpen(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}
          >
            <span style={{ transform: promptOpen ? "rotate(90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>›</span>
            Image Prompt
          </button>
          {promptOpen && (
            <textarea
              value={panel.imagePrompt}
              onChange={e => onPanelChange({ ...panel, imagePrompt: e.target.value })}
              rows={3}
              placeholder="Describe the scene for image generation..."
              style={{
                marginTop: 6, width: "100%", resize: "vertical",
                padding: "8px 10px", borderRadius: 6,
                background: "var(--surface-r)", border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
                lineHeight: 1.6, boxSizing: "border-box", outline: "none",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--accent)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          )}
        </div>

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onGenerateImage}
            disabled={imageLoading || !panel.imagePrompt.trim()}
            style={{
              padding: "6px 16px", borderRadius: 6,
              cursor: imageLoading || !panel.imagePrompt.trim() ? "not-allowed" : "pointer",
              background: imageLoading || !panel.imagePrompt.trim() ? "var(--surface-h)" : "var(--surface-r)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 12,
              color: imageLoading || !panel.imagePrompt.trim() ? "var(--subtle)" : "var(--muted)",
              transition: "all 0.12s",
            }}
          >
            {imageLoading ? "Generating..." : hasImage ? "Regenerate image" : "Generate image"}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
              display: "flex", alignItems: "center", gap: 5, transition: "all 0.12s",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5.5 8V2M2.5 4.5l3-3 3 3M1 9.5h9" />
            </svg>
            Upload
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />

          {imageError && (
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--error)" }}>{imageError}</span>
          )}
        </div>
      </div>
    </div>
  );
}
