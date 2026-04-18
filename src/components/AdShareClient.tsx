"use client";
// AdShareClient — public read-only render of a saved ad.
// Supports aspect toggle, PNG export (canvas composite), caption copy.

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import AdCanvas from "@/components/ad/AdCanvas";
import { AD_ANGLE_LABELS, type SavedAd } from "@/lib/types";

function proxyUrl(url: string): string {
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  return `/api/ad/image-proxy?url=${encodeURIComponent(url)}`;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  const blob = await r.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compositeAd(
  el: HTMLElement,
  bgDataUrl: string,
  filename: string,
  width: number,
  height: number,
): Promise<File> {
  const imgEl = el.querySelector("img") as HTMLImageElement | null;
  const savedDisplay = imgEl?.style.display ?? "";
  if (imgEl) imgEl.style.display = "none";
  let fgDataUrl: string;
  try {
    fgDataUrl = await toPng(el, {
      width,
      height,
      pixelRatio: 2,
      cacheBust: false,
      backgroundColor: "transparent",
    });
  } finally {
    if (imgEl) imgEl.style.display = savedDisplay;
  }
  const W = width * 2;
  const H = height * 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await new Promise<void>((resolve) => {
    const bg = new Image();
    bg.onload = () => {
      const s = Math.max(W / bg.width, H / bg.height);
      const w = bg.width * s;
      const h = bg.height * s;
      ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h);
      resolve();
    };
    bg.onerror = () => resolve();
    bg.src = bgDataUrl;
  });
  await new Promise<void>((resolve) => {
    const fg = new Image();
    fg.onload = () => {
      ctx.drawImage(fg, 0, 0, W, H);
      resolve();
    };
    fg.onerror = () => resolve();
    fg.src = fgDataUrl;
  });
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
  );
  return new File([blob], filename, { type: "image/png" });
}

export default function AdShareClient({ ad }: { ad: SavedAd }) {
  const [aspect, setAspect] = useState<"1:1" | "4:5">(ad.aspectRatio);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const W = 1080;
  const H = aspect === "1:1" ? 1080 : 1350;

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const el = exportRef.current;
      if (!el) throw new Error("Export element not found");
      await Promise.all(
        Array.from(el.querySelectorAll("img")).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              }),
        ),
      );
      const bgDataUrl = await fetchAsDataUrl(proxyUrl(ad.imageUrl));
      const filename = `lunia-ad-${ad.angle}-${aspect.replace(":", "x")}.png`;
      const file = await compositeAd(el, bgDataUrl, filename, W, H);
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("Export failed — try again");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    const block = [ad.concept.headline, "", ad.concept.primaryText].join("\n");
    try {
      await navigator.clipboard.writeText(block);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard copy failed");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 20,
                height: 20,
                background: "#000",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>L</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>Lunia Studio</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {(["1:1", "4:5"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    border: "none",
                    cursor: "pointer",
                    background: aspect === a ? "var(--accent)" : "transparent",
                    color: aspect === a ? "var(--bg)" : "var(--muted)",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
                border: "none",
                borderRadius: 7,
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: downloading ? "not-allowed" : "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? "Exporting…" : "↓ PNG"}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {ad.concept.headline}
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            {AD_ANGLE_LABELS[ad.angle] ?? ad.angle} · saved{" "}
            {new Date(ad.savedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(184,92,92,0.08)",
              border: "1px solid rgba(184,92,92,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "var(--error)",
            }}
          >
            ⚠ {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--surface)",
            }}
          >
            <AdCanvas
              imageUrl={ad.imageUrl}
              concept={ad.concept}
              aspect={aspect}
              scale={aspect === "1:1" ? 520 / 1080 : 520 / 1080}
              isFalImage
            />
          </div>
        </div>

        {/* Copy block */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface)",
            padding: 18,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Meta Ads Manager copy</span>
            <button
              onClick={handleCopy}
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 5,
                padding: "3px 10px",
                cursor: "pointer",
                color: "var(--text)",
                fontFamily: "inherit",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{ad.concept.headline}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ad.concept.primaryText}</div>
        </div>
      </div>

      {/* Hidden full-size export node */}
      <div
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        <div ref={exportRef} style={{ width: W, height: H }}>
          <AdCanvas imageUrl={ad.imageUrl} concept={ad.concept} aspect={aspect} scale={1} isFalImage />
        </div>
      </div>
    </div>
  );
}
