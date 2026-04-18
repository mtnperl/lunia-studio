"use client";
// Step 4 — Preview + PNG export + clipboard caption + save to library.

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import AdCanvas from "@/components/ad/AdCanvas";
import type { AdConcept, AdImageHistoryEntry, BrandAsset } from "@/lib/types";

type Aspect = "1:1" | "4:5";

type Props = {
  concept: AdConcept;
  imageUrl: string;
  imagePrompt: string;
  imageHistory: AdImageHistoryEntry[];
  aspect: Aspect;
  angle: AdConcept["angle"];
  visualFormat: string;
  productAssetId?: string;
  logoAssetId?: string;
  onAspectChange: (a: Aspect) => void;
  onBack: () => void;
  onRestart: () => void;
};

function proxyUrl(url: string): string {
  if (url.startsWith("/") || url.includes("vercel-storage.com")) return url;
  return `/api/ad/image-proxy?url=${encodeURIComponent(url)}`;
}

// Fetch a URL and return it as a base64 data URL — matches carousel share pattern.
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

// Canvas compositing: html-to-image drops <img> contents inside SVG foreignObject.
// Same trick as the carousel hook slide: hide the image, capture the foreground,
// draw the background image underneath on a canvas.
async function compositeAd(
  el: HTMLElement,
  bgDataUrl: string,
  filename: string,
  width: number,
  height: number,
): Promise<File> {
  const imgEl = el.querySelector("img") as HTMLImageElement | null;
  const savedImgDisplay = imgEl?.style.display ?? "";

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
    if (imgEl) imgEl.style.display = savedImgDisplay;
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
      const scale = Math.max(W / bg.width, H / bg.height);
      const w = bg.width * scale;
      const h = bg.height * scale;
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

export default function AdPreviewStep({
  concept,
  imageUrl,
  imagePrompt,
  imageHistory,
  aspect,
  angle,
  visualFormat,
  productAssetId,
  logoAssetId,
  onAspectChange,
  onBack,
  onRestart,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  // Resolve logo URL from its asset ID so AdCanvas can stamp it.
  useEffect(() => {
    let cancelled = false;
    if (!logoAssetId) {
      setLogoUrl(null);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/brand-assets?kind=logo`);
        const data = (await res.json()) as { assets?: BrandAsset[] };
        if (cancelled) return;
        const match = (data.assets ?? []).find((a) => a.id === logoAssetId);
        setLogoUrl(match?.url ?? null);
      } catch {
        if (!cancelled) setLogoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logoAssetId]);

  const W = 1080;
  const H = aspect === "1:1" ? 1080 : 1350;

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const el = exportRef.current;
      if (!el) throw new Error("Export element not found");

      // Wait for <img> inside the canvas to finish loading
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

      const bgDataUrl = await fetchAsDataUrl(proxyUrl(imageUrl));
      const filename = `lunia-ad-${angle}-${aspect.replace(":", "x")}.png`;
      const file = await compositeAd(el, bgDataUrl, filename, W, H);

      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error(err);
      setError("Export failed — try again");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyCaption() {
    const block = [concept.headline, "", concept.primaryText].join("\n");
    try {
      await navigator.clipboard.writeText(block);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard copy failed");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle,
          visualFormat,
          concept,
          imagePrompt,
          imageUrl,
          imageHistory,
          aspectRatio: aspect,
          productAssetId,
          logoAssetId,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSavedId(data.id);
    } catch {
      setError("Network error — check connection and try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{concept.headline}</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {angle} · {visualFormat} · {aspect}
          </div>
        </div>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          {(["1:1", "4:5"] as const).map((a) => (
            <button
              key={a}
              onClick={() => onAspectChange(a)}
              style={{
                padding: "6px 14px",
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
      </div>

      {error && (
        <div
          style={{
            background: "rgba(184,92,92,0.08)",
            border: "1px solid rgba(184,92,92,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--error)",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Preview (scaled) */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            background: "var(--surface)",
          }}
        >
          <AdCanvas
            imageUrl={imageUrl}
            concept={concept}
            aspect={aspect}
            scale={aspect === "1:1" ? 440 / 1080 : 440 / 1080}
            isFalImage
            logoUrl={logoUrl}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 7,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: downloading ? "not-allowed" : "pointer",
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? "Exporting…" : `↓ Download PNG (${aspect})`}
        </button>
        <button
          onClick={handleCopyCaption}
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy headline + primary"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: saving || savedId ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {savedId ? "✓ Saved" : saving ? "Saving…" : "Save to library"}
        </button>
      </div>

      {savedId && (
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
          Share URL: <a href={`/ads/${savedId}`} style={{ color: "var(--accent)" }}>/ads/{savedId}</a>
        </div>
      )}

      {/* Copy block preview */}
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
          }}
        >
          Copy for Meta Ads Manager
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Headline
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{concept.headline}</div>

        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Primary text
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{concept.primaryText}</div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          ← Edit visual
        </button>
        <button
          onClick={onRestart}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          Start new ad
        </button>
      </div>

      {/* Hidden full-size export node */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={exportRef} style={{ width: W, height: H }}>
          <AdCanvas imageUrl={imageUrl} concept={concept} aspect={aspect} scale={1} isFalImage logoUrl={logoUrl} />
        </div>
      </div>
    </div>
  );
}
