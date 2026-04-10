"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import { SavedCarousel, BrandStyle } from "@/lib/types";

type Props = { carousel: SavedCarousel };

const SLIDE_LABELS = ["Hook", "Slide 2", "Slide 3", "Slide 4", "CTA"];
const PREVIEW_SCALE = 0.5;

// Fetch a URL and return it as a base64 data URL
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

export default function CarouselShareClient({ carousel }: Props) {
  const {
    content, selectedHook, topic, hookTone,
    brandStyle, hookImageUrl, slideImages,
    logoScale = 1, arrowScale = 1, darkBackground = false, showLuniaLifeWatermark = false,
  } = carousel;

  const hook = content.hooks[selectedHook];
  const imgs = slideImages ?? [null, null, null, null, null];
  const bs: BrandStyle | undefined = brandStyle;

  const [reelsMode, setReelsMode] = useState(carousel.reelsMode ?? false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  // Pre-fetch the hook background as a data URL at mount so it's ready when user
  // clicks download. Canvas compositing needs it because html-to-image cannot render
  // <img> elements in SVG foreignObject — they always come out blank.
  const hookBgDataUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const raw = imgs[0] ?? hookImageUrl ?? null;
    if (!raw) return;
    const proxied = raw.startsWith("/") ? raw : `/api/carousel/image-proxy?url=${encodeURIComponent(raw)}`;
    fetchAsDataUrl(proxied)
      .then(u => { hookBgDataUrlRef.current = u; })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function proxyUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("/")) return url;
    return `/api/carousel/image-proxy?url=${encodeURIComponent(url)}`;
  }

  // Get the hook background as a data URL — use cached value or fetch on demand.
  async function getHookBgDataUrl(): Promise<string | null> {
    if (hookBgDataUrlRef.current) return hookBgDataUrlRef.current;
    const raw = imgs[0] ?? hookImageUrl ?? null;
    if (!raw) return null;
    try {
      const proxied = raw.startsWith("/") ? raw : `/api/carousel/image-proxy?url=${encodeURIComponent(raw)}`;
      const url = await fetchAsDataUrl(proxied);
      hookBgDataUrlRef.current = url;
      return url;
    } catch {
      return null;
    }
  }

  // Canvas compositing for the hook slide.
  // 1. Hide <img> + make inner wrapper transparent → toPng captures foreground only
  // 2. Draw background image onto canvas (cover-fit)
  // 3. Draw foreground overlay on top → correct final PNG
  async function compositeHookSlide(el: HTMLElement, bgDataUrl: string, filename: string, exportH: number): Promise<File> {
    const imgEl = el.querySelector("img") as HTMLImageElement | null;
    // el > SlideWrapper outer div > SlideWrapper inner div (has background style + content)
    const innerWrapper = el.firstElementChild?.firstElementChild as HTMLElement | null;

    const savedImgDisplay = imgEl?.style.display ?? "";
    const savedWrapperBg = innerWrapper?.style.background ?? "";

    if (imgEl) imgEl.style.display = "none";
    if (innerWrapper) innerWrapper.style.background = "transparent";

    let fgDataUrl: string;
    try {
      fgDataUrl = await toPng(el, {
        width: 1080, height: exportH, pixelRatio: 2,
        cacheBust: false, backgroundColor: "transparent",
      });
    } finally {
      if (imgEl) imgEl.style.display = savedImgDisplay;
      if (innerWrapper) innerWrapper.style.background = savedWrapperBg;
    }

    const W = 1080 * 2, H = exportH * 2; // pixelRatio: 2
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Layer 1: background photo (cover-fit, centred)
    await new Promise<void>(resolve => {
      const bg = new Image();
      bg.onload = () => {
        const scale = Math.max(W / bg.width, H / bg.height);
        const w = bg.width * scale, h = bg.height * scale;
        ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h);
        resolve();
      };
      bg.onerror = () => resolve();
      bg.src = bgDataUrl;
    });

    // Layer 2: foreground (gradient overlay + text + decorations — captured via toPng)
    await new Promise<void>(resolve => {
      const fg = new Image();
      fg.onload = () => { ctx.drawImage(fg, 0, 0, W, H); resolve(); };
      fg.onerror = () => resolve();
      fg.src = fgDataUrl;
    });

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png")
    );
    return new File([blob], filename, { type: "image/png" });
  }

  async function buildSlideFile(index: number): Promise<File> {
    const el = exportRefs.current[index];
    if (!el) throw new Error("Export element not found");

    const exportH = reelsMode ? 1920 : 1350;
    const label = SLIDE_LABELS[index].toLowerCase().replace(" ", "-");
    const filename = reelsMode
      ? `lunia-reel-${index + 1}-${label}.png`
      : `lunia-slide-${index + 1}-${label}.png`;

    // Wait for any <img> to finish loading
    await Promise.all(Array.from(el.querySelectorAll("img")).map(img =>
      img.complete ? Promise.resolve()
        : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); })
    ));

    // Hook slide: canvas compositing required (html-to-image drops <img> contents)
    if (index === 0 && (imgs[0] ?? hookImageUrl)) {
      const bgDataUrl = await getHookBgDataUrl();
      if (bgDataUrl) {
        return compositeHookSlide(el, bgDataUrl, filename, exportH);
      }
    }

    // All other slides + hook with no image: standard html-to-image
    const dataUrl = await toPng(el, { width: 1080, height: exportH, pixelRatio: 2, cacheBust: false });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: "image/png" });
  }

  // Platform-aware file delivery.
  // iOS only: Web Share API → native share sheet → user taps "Save Image" → Photos.
  // Desktop + everything else: direct blob URL download → Downloads folder, no dialogs.
  async function saveFile(file: File) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS && typeof navigator.share === "function") {
      // Try share API — no canShare() gate (unreliable on some iOS versions)
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        // Share failed — fall through to direct download
      }
    }

    // Direct download: blob URL → browser saves to Downloads folder
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const file = await buildSlideFile(index);
      await saveFile(file);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setExportError("Export failed — try again");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    setDownloadingAll(true);
    setExportError(null);
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS && typeof navigator.share === "function") {
        // Build all 5 then share together — iOS shows "Save Image" for the batch
        const files: File[] = [];
        for (let i = 0; i < 5; i++) files.push(await buildSlideFile(i));
        try {
          await navigator.share({ files, title: "Lunia carousel slides" });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          // Multi-file share not supported — share one by one
          for (const f of files) await saveFile(f);
        }
      } else {
        // Desktop: 5 sequential direct downloads to Downloads folder
        for (let i = 0; i < 5; i++) {
          const file = await buildSlideFile(i);
          await saveFile(file);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setExportError("Export failed — try again");
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  const previewNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
  ];

  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? proxyUrl(hookImageUrl) ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
  ];

  const exportH = reelsMode ? 1920 : 1350;
  const slideW = Math.round(1080 * PREVIEW_SCALE);

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Format toggle */}
            <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
              {([false, true] as const).map((isReels) => (
                <button
                  key={String(isReels)}
                  onClick={() => setReelsMode(isReels)}
                  style={{
                    padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    border: "none", cursor: "pointer",
                    background: reelsMode === isReels ? "var(--accent)" : "transparent",
                    color: reelsMode === isReels ? "var(--bg)" : "var(--muted)",
                    transition: "all 0.15s",
                  }}
                >
                  {isReels ? "9:16" : "4:5"}
                </button>
              ))}
            </div>
            <button
              onClick={downloadAll}
              disabled={downloadingAll}
              style={{
                background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 7,
                padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: downloadingAll ? "not-allowed" : "pointer", opacity: downloadingAll ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {downloadingAll ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Exporting…
                </>
              ) : `↓ Download all (5 PNGs)`}
            </button>
          </div>
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
                disabled={downloading === i || downloadingAll}
                style={{
                  marginTop: 8, width: "100%", background: "var(--surface)", color: "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 6, padding: "7px 0",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  cursor: (downloading === i || downloadingAll) ? "not-allowed" : "pointer",
                  opacity: (downloading === i || downloadingAll) ? 0.5 : 1,
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
          <div key={i} ref={el => { exportRefs.current[i] = el; }} style={{ width: 1080, height: exportH }}>
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
