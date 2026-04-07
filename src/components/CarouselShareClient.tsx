"use client";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { SavedCarousel, BrandStyle } from "@/lib/types";

type Props = { carousel: SavedCarousel };

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.5;

export default function CarouselShareClient({ carousel }: Props) {
  const {
    content, selectedHook, topic, hookTone,
    brandStyle, hookImageUrl, slideImages,
    showDecoration = true, logoScale = 1, arrowScale = 1, darkBackground = false,
    showLuniaLifeWatermark = false,
  } = carousel;

  const hook = content.hooks[selectedHook];
  const imgs = slideImages ?? [null, null, null, null, null];
  const bs: BrandStyle | undefined = brandStyle;

  const [downloading, setDownloading] = useState<number | null>(null);
  const [preparingAll, setPreparingAll] = useState(false);
  const [preparedFiles, setPreparedFiles] = useState<File[] | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  function proxyUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("/")) return url;
    return `/api/carousel/image-proxy?url=${encodeURIComponent(url)}`;
  }

  // Fetch a URL through the image proxy and return a base64 data URL.
  async function toDataUrl(src: string): Promise<string> {
    const fetchUrl = src.startsWith("/")
      ? src
      : `/api/carousel/image-proxy?url=${encodeURIComponent(src)}`;
    const resp = await fetch(fetchUrl);
    const blob = await resp.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Build a PNG File for one slide — no download/share side-effects.
  // Before calling toPng, inline any external CSS background-image URLs as
  // base64 data URLs directly on the DOM node. html-to-image silently drops
  // external fetches on mobile Safari (CORS + canvas restrictions), so we
  // must embed images ourselves. Styles are restored in finally.
  async function buildSlideFile(index: number): Promise<File> {
    const el = exportRefs.current[index];
    if (!el) throw new Error(`Slide ${index + 1} element not found`);

    const patched: Array<{ el: HTMLElement; original: string }> = [];
    const allEls = [el, ...Array.from(el.querySelectorAll<HTMLElement>("*"))];
    await Promise.all(
      allEls.map(async (node) => {
        const bg = node.style.backgroundImage;
        if (!bg) return;
        const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
        if (!m || m[1].startsWith("data:")) return;
        try {
          const dataUrl = await toDataUrl(m[1]);
          patched.push({ el: node, original: bg });
          node.style.backgroundImage = `url(${dataUrl})`;
        } catch { /* best effort */ }
      })
    );

    let file: File;
    try {
      const dataUrl = await toPng(el, { width: 1080, height: 1350, pixelRatio: 2, cacheBust: false });
      const filename = `lunia-slide-${index + 1}-${SLIDE_LABELS[index].toLowerCase().replace(/ /g, "-")}.png`;
      const blobRes = await fetch(dataUrl);
      const blob = await blobRes.blob();
      file = new File([blob], filename, { type: "image/png" });
    } finally {
      patched.forEach(({ el: node, original }) => { node.style.backgroundImage = original; });
    }
    return file;
  }

  // Single slide — try share (mobile), fallback to anchor download (desktop)
  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const file = await buildSlideFile(index);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: file.name });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setExportError("Export failed — try again");
    } finally {
      setDownloading(null);
    }
  }

  // Phase 1: generate all 5 PNGs (async — no gesture constraint)
  async function prepareAll() {
    setPreparingAll(true);
    setPreparedFiles(null);
    setExportError(null);
    try {
      const files: File[] = [];
      for (let i = 0; i < 5; i++) {
        files.push(await buildSlideFile(i));
      }
      setPreparedFiles(files);
    } catch {
      setExportError("Export failed — try again");
    } finally {
      setPreparingAll(false);
    }
  }

  // Phase 2: share / download — called in a fresh user gesture after files are ready
  async function shareAll() {
    if (!preparedFiles) return;
    setExportError(null);
    try {
      if (navigator.canShare?.({ files: preparedFiles })) {
        await navigator.share({ files: preparedFiles, title: "Lunia carousel — 5 slides" });
      } else {
        for (const file of preparedFiles) {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          await new Promise(r => setTimeout(r, 120));
        }
      }
    } catch {
      setExportError("Share failed — try again");
    }
  }

  const previewNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      showDecoration={showDecoration} logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
  ];

  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      showDecoration={showDecoration} logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} />,
  ];

  const slideW = Math.round(1080 * PREVIEW_SCALE);

  const downloadAllBtn = preparingAll ? (
    <button
      disabled
      style={{
        background: "var(--surface-h)", color: "var(--muted)", border: "none", borderRadius: 7,
        padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        cursor: "not-allowed", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
      Preparing 5 slides…
    </button>
  ) : preparedFiles ? (
    <button
      onClick={shareAll}
      style={{
        background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 7,
        padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      Share {preparedFiles.length} slides →
    </button>
  ) : (
    <button
      onClick={prepareAll}
      style={{
        background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 7,
        padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
    >
      ↓ Download all (5 PNGs)
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, background: "#000", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>L</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>Lunia Studio</span>
          </div>
          {downloadAllBtn}
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{topic}</h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            {hookTone} · saved {new Date(carousel.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {exportError && (
          <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)" }}>
            ⚠ {exportError}
          </div>
        )}

        {/* Slides */}
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {previewNodes.map((node, i) => (
            <div key={i} style={{ flexShrink: 0, width: slideW }}>
              <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
                {SLIDE_LABELS[i]}
              </div>
              <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
                {node}
              </div>
              <button
                onClick={() => downloadSlide(i)}
                disabled={downloading === i || preparingAll}
                style={{
                  marginTop: 8, width: "100%", background: "var(--surface)", color: "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 6, padding: "7px 0",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  cursor: (downloading === i || preparingAll) ? "not-allowed" : "pointer",
                  opacity: (downloading === i || preparingAll) ? 0.5 : 1,
                }}
              >
                {downloading === i ? "…" : "↓ PNG"}
              </button>
            </div>
          ))}
        </div>

        {/* Citations */}
        {content.slides.some(s => s.citation) && (
          <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10 }}>
              Citations
            </div>
            {content.slides.map((slide, i) =>
              slide.citation ? (
                <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                  [{i + 1}] {slide.citation}
                </div>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Hidden full-size slides for accurate PNG export */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        {exportNodes.map((node, i) => (
          <div key={i} ref={el => { exportRefs.current[i] = el; }} style={{ width: 1080, height: 1350 }}>
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
