"use client";

// Public share page for the Chartbook and Primer formats. Two slides,
// pre-built PNGs so the download tap is instant on a phone, the caption.
// The same compositor as every other share view redraws the paper.

import { useEffect, useRef, useState } from "react";
import { compositeSlideWithImages } from "@/lib/slide-export";
import { deviceSharesFiles, saveFiles } from "@/lib/save-files";
import { PAPER_DEFAULTS } from "@/lib/brand-tokens";
import { renderTwoSlides, type TwoSlideFormat, type TwoSlideVariant } from "@/components/carousel/steps/TwoSlidePreviewStep";
import type { SavedCarousel } from "@/lib/types";

const PREVIEW_SCALE = 0.5;

async function fetchAsDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export default function TwoSlideShareView({ carousel, format }: { carousel: SavedCarousel; format: TwoSlideFormat }) {
  const variant = (format === "chartbook" ? carousel.chartbookContent : carousel.primerContent) as TwoSlideVariant;
  const paper = { grain: carousel.paperGrain ?? PAPER_DEFAULTS[format].grain, vignette: carousel.paperVignette ?? PAPER_DEFAULTS[format].vignette };
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const filesRef = useRef<File[]>([null as unknown as File, null as unknown as File]);
  const [shareCapable, setShareCapable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => { setShareCapable(deviceSharesFiles()); }, []);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const cache = useRef<Map<string, string>>(new Map());

  async function loadDataUrl(src: string): Promise<string> {
    if (src.startsWith("data:")) return src;
    const cached = cache.current.get(src);
    if (cached) return cached;
    const target = src.startsWith("/") ? src : `/api/carousel/image-proxy?url=${encodeURIComponent(src)}`;
    const dataUrl = await fetchAsDataUrl(target);
    cache.current.set(src, dataUrl);
    return dataUrl;
  }

  useEffect(() => {
    let cancelled = false;
    const safe = carousel.topic.replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();
    const refs = [ref1, ref2];
    const names = [`${format}-${safe}-1.png`, `${format}-${safe}-2.png`];
    const run = async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 150));
      for (let i = 0; i < 2; i++) {
        if (cancelled) return;
        try {
          const node = refs[i].current;
          if (!node) return;
          const file = await compositeSlideWithImages(node, [], { filename: names[i], exportH: 1350, loadDataUrl });
          if (cancelled) return;
          filesRef.current[i] = file;
          setDone((n) => n + 1);
        } catch (err) {
          if (cancelled) return;
          console.error(`[${format}-share] preload failed`, i, err);
          setError(err instanceof Error ? err.message : "Export failed");
        }
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveAll() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveFiles(filesRef.current.filter(Boolean), `Lunia ${format === "chartbook" ? "Chartbook" : "Primer"}: ${carousel.topic}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const [preview1, preview2] = renderTwoSlides(format, variant, paper, PREVIEW_SCALE);
  const [export1, export2] = renderTwoSlides(format, variant, paper, 1);
  const label = format === "chartbook" ? "Chartbook" : "Primer";

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 60px", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 18px", lineHeight: 1.3 }}>{carousel.topic}</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {preview1}
        {preview2}
      </div>

      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={ref1} style={{ width: 1080, height: 1350 }}>{export1}</div>
        <div ref={ref2} style={{ width: 1080, height: 1350 }}>{export2}</div>
      </div>

      <div style={{ fontSize: 13, color: done === 2 ? "#15803d" : "#6b7280", marginBottom: 12 }}>
        {error ? `Export failed: ${error}` : done === 2 ? (shareCapable ? "✓ Ready. One tap opens the share sheet with both slides; Save Image sends them to Photos together." : "✓ Ready.") : `Preparing PNGs… ${done}/2`}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
        <button onClick={handleSaveAll} disabled={done < 2 || saving} style={{
          padding: "12px 20px", borderRadius: 8, fontWeight: 700, fontSize: 14, border: "none", cursor: done < 2 || saving ? "wait" : "pointer", fontFamily: "inherit",
          background: done === 2 ? "#102635" : "#e5e7eb", color: done === 2 ? "#fff" : "#9ca3af",
        }}>{saving ? "Opening..." : shareCapable ? "Save both to Photos" : "Download both"}</button>
        {saveError && <div style={{ fontSize: 13, color: "#b91c1c", width: "100%" }}>{saveError}</div>}
      </div>

      <div style={{ background: "#f6f6f4", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b7280" }}>Caption</div>
          <button onClick={() => navigator.clipboard.writeText(variant.caption).then(() => { setCaptionCopied(true); setTimeout(() => setCaptionCopied(false), 1600); })} style={{ fontSize: 12, fontWeight: 600, color: captionCopied ? "#15803d" : "#1e7a8a", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {captionCopied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#111827" }}>{variant.caption}</div>
      </div>
    </div>
  );
}
