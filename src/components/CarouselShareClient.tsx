"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import CommentCTASlide from "@/components/carousel/slides/CommentCTASlide";
import DidYouKnowSlide from "@/components/carousel/slides/DidYouKnowSlide";
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
    // Reject with a real Error so callers don't get a raw DOM Event ({isTrusted:true}).
    reader.onerror = () => reject(new Error(`FileReader failed reading blob from ${url} (${blob.size} bytes, ${blob.type})`));
    reader.readAsDataURL(blob);
  });
}

// Convert anything thrown (Error, DOM Event, plain object, string) into a useful single-line message.
// Critical for mobile Safari where toPng / image decode failures often reject with a raw Event whose
// JSON.stringify reduces to "{isTrusted:true}".
function describeRejection(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || "unknown error";
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { type?: string; target?: { src?: string; tagName?: string }; message?: string };
    if (typeof e.message === "string" && e.message) return e.message;
    if (typeof e.type === "string" && e.type) {
      const src = e.target?.src ? ` (${e.target.src.split("/").pop()?.slice(0, 60) ?? ""})` : "";
      const tag = e.target?.tagName ? `<${e.target.tagName.toLowerCase()}> ` : "";
      return `${tag}${e.type}${src}`;
    }
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}" && json !== '{"isTrusted":true}') return json;
    } catch { /* ignore */ }
    return "non-Error rejection (likely image decode or canvas failure)";
  }
  return "unknown error";
}

export default function CarouselShareClient({ carousel }: Props) {
  if (carousel.format === "did_you_know" && carousel.didYouKnowContent) {
    return <DidYouKnowShareView carousel={carousel} />;
  }

  const {
    content, selectedHook, topic, hookTone,
    brandStyle, hookImageUrl, slideImages,
    logoScale = 1, arrowScale = 1, darkBackground = false, showLuniaLifeWatermark = false,
    citationFontSize = 36,
    headlineScale = 1, bodyScale = 1,
  } = carousel;

  const hook = content.hooks[selectedHook];
  const imgs = slideImages ?? [null, null, null, null, null];
  const bs: BrandStyle | undefined = brandStyle;

  const [reelsMode, setReelsMode] = useState(carousel.reelsMode ?? false);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  // Per-slide blob URLs (null until preload completes for that slot).
  // Rendering these as real <a href> links gives iOS Safari a tappable target
  // that survives any user-activation expiry, which is the core mobile bug.
  const [slideBlobs, setSlideBlobs] = useState<Array<{ url: string; name: string } | null>>([null, null, null, null, null]);
  const [preloadDone, setPreloadDone] = useState(0); // count of slides preloaded (0..5)
  const [preloadError, setPreloadError] = useState<string | null>(null);

  const isEngagement = carousel.format === "engagement";
  const exportRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);

  // Pre-built PNG cache keyed by `${reelsMode}|${index}`. Filled in background on mount
  // so that when the user taps Download on mobile, navigator.share() fires instantly —
  // preserving the iOS Safari transient-activation token (expires ~5s after tap).
  // Without this, toPng + canvas work eats the activation window and share silently fails.
  const preloadedFilesRef = useRef<Map<string, File>>(new Map());

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

    // Hook slide: canvas compositing required (html-to-image drops <img> contents).
    // On mobile Safari this path can reject with a raw Event when image decode fails;
    // fall back to direct toPng so the user still gets a slide (without the photo bg).
    if (index === 0 && (imgs[0] ?? hookImageUrl)) {
      const bgDataUrl = await getHookBgDataUrl();
      if (bgDataUrl) {
        try {
          return await compositeHookSlide(el, bgDataUrl, filename, exportH);
        } catch (compErr) {
          console.warn("[share] hook composite failed, falling back to plain toPng", describeRejection(compErr));
          // fall through
        }
      }
    }

    // All other slides + hook fallback: standard html-to-image
    const dataUrl = await toPng(el, { width: 1080, height: exportH, pixelRatio: 2, cacheBust: false });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: "image/png" });
  }

  // Platform-aware file delivery.
  // Any device that supports navigator.canShare({ files }) (iOS Safari, Android Chrome):
  //   Web Share API → native share sheet → "Save Image" / Downloads.
  // Desktop + browsers that don't support file sharing: blob URL download.
  // iOS Safari last-resort: open the blob URL so the user can long-press → Save to Photos
  //   (programmatic <a download> is ignored on iOS for blob URLs).
  async function saveFile(file: File) {
    const canShareFiles =
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
        // Share failed (e.g. in-app browser restriction) — fall through
      }
    }

    const url = URL.createObjectURL(file);
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // <a download> is a no-op on iOS Safari for blob URLs. Open in a new tab so
      // the user can long-press → Save to Photos.
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    // Desktop + Android: standard blob-URL download
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setPdfError(null);
    try {
      const res = await fetch("/api/carousel/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          ctaHeadline: content.cta.headline,
          followLine: content.cta.followLine,
          commentKeyword: content.commentKeyword,
          hookHeadline: hook.headline,
          hookSubline: hook.subline,
          slides: content.slides.map(s => ({
            headline: s.headline,
            body: s.body,
            citation: s.citation,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lunia-guide-${(topic ?? "guide").toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Use pre-built file if available, otherwise build on demand.
  async function getSlideFile(index: number): Promise<File> {
    const key = `${reelsMode}|${index}`;
    const cached = preloadedFilesRef.current.get(key);
    if (cached) return cached;
    const file = await buildSlideFile(index);
    preloadedFilesRef.current.set(key, file);
    return file;
  }

  // Wrap a promise with a timeout so mobile Safari hangs on toPng / canvas
  // surface as a visible error instead of eternal spinner.
  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
      p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  async function downloadSlide(index: number) {
    setDownloading(index);
    setExportError(null);
    try {
      const file = await withTimeout(getSlideFile(index), 25_000, `Slide ${index + 1} render`);
      await saveFile(file);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Export failed";
      setExportError(`Export failed: ${msg}`);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAll() {
    setDownloadingAll(true);
    setExportError(null);
    try {
      const files: File[] = [];
      for (let i = 0; i < 5; i++) files.push(await getSlideFile(i));

      const canShareFiles =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files });

      if (canShareFiles) {
        try {
          await navigator.share({ files, title: "Lunia carousel slides" });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          for (const f of files) await saveFile(f);
        }
      } else {
        for (const f of files) await saveFile(f);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "Export failed";
        setExportError(`Export failed: ${msg}`);
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  // Preload all 5 slide PNGs on mount (and whenever format toggles). Sets real blob URLs
  // on state so that the download controls can render as <a href> links — tapping a real
  // link on iOS Safari always works, bypassing the Web Share API activation quirks.
  useEffect(() => {
    preloadedFilesRef.current = new Map();
    setSlideBlobs([null, null, null, null, null]);
    setPreloadDone(0);
    setPreloadError(null);

    const createdUrls: string[] = [];
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 150));
      for (let i = 0; i < 5; i++) {
        if (cancelled) return;
        try {
          const file = await withTimeout(buildSlideFile(i), 25_000, `Slide ${i + 1} render`);
          if (cancelled) return;
          preloadedFilesRef.current.set(`${reelsMode}|${i}`, file);
          const url = URL.createObjectURL(file);
          createdUrls.push(url);
          setSlideBlobs((prev) => {
            const next = [...prev];
            next[i] = { url, name: file.name };
            return next;
          });
          setPreloadDone((n) => n + 1);
        } catch (err) {
          if (cancelled) return;
          const label = SLIDE_LABELS[i] ?? `slide ${i + 1}`;
          const msg = `${label}: ${describeRejection(err)}`;
          if (typeof console !== "undefined") console.error("[share] preload failed", i, err);
          setPreloadError(msg);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      for (const u of createdUrls) URL.revokeObjectURL(u);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelsMode]);

  const previewNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={PREVIEW_SCALE} brandStyle={bs}
      backgroundImageUrl={imgs[0] ?? hookImageUrl ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    isEngagement && content.commentKeyword
      ? <CommentCTASlide key={4} headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />
      : <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={PREVIEW_SCALE} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
  ];

  const exportNodes = [
    <HookSlide key={0} headline={hook.headline} subline={hook.subline} topic={topic} scale={1} brandStyle={bs}
      backgroundImageUrl={proxyUrl(imgs[0]) ?? proxyUrl(hookImageUrl) ?? undefined}
      isFalImage={!!imgs[0]}
      logoScale={logoScale} arrowScale={arrowScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
    <ContentSlide key={1} headline={content.slides[0].headline} body={content.slides[0].body} citation={content.slides[0].citation} graphic={content.slides[0].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={2} headline={content.slides[1].headline} body={content.slides[1].body} citation={content.slides[1].citation} graphic={content.slides[1].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    <ContentSlide key={3} headline={content.slides[2].headline} body={content.slides[2].body} citation={content.slides[2].citation} graphic={content.slides[2].graphic} scale={1} brandStyle={bs} logoScale={logoScale} arrowScale={arrowScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} citationFontSize={citationFontSize} reels={reelsMode} headlineScale={headlineScale} bodyScale={bodyScale} />,
    isEngagement && content.commentKeyword
      ? <CommentCTASlide key={4} headline={content.cta.headline} commentKeyword={content.commentKeyword} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />
      : <CTASlide key={4} headline={content.cta.headline} followLine={content.cta.followLine} scale={1} brandStyle={bs} logoScale={logoScale} darkBackground={darkBackground} showLuniaLifeWatermark={showLuniaLifeWatermark} reels={reelsMode} />,
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
            {isEngagement && (
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                style={{
                  background: "var(--surface)", color: "var(--text)",
                  border: "1px solid var(--border)", borderRadius: 7,
                  padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  cursor: generatingPdf ? "not-allowed" : "pointer", opacity: generatingPdf ? 0.7 : 1,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {generatingPdf ? (
                  <>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                    Generating PDF…
                  </>
                ) : "↓ PDF guide"}
              </button>
            )}
            <button
              onClick={downloadAll}
              disabled={downloadingAll || preloadDone < 5}
              style={{
                background: "var(--accent)", color: "var(--bg)", border: "none", borderRadius: 7,
                padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                cursor: (downloadingAll || preloadDone < 5) ? "not-allowed" : "pointer",
                opacity: (downloadingAll || preloadDone < 5) ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {downloadingAll ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Exporting…
                </>
              ) : preloadDone < 5 ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  Preparing… ({preloadDone}/5)
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
        {preloadError && preloadDone < 5 && (
          <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)" }}>
            ⚠ Preload: {preloadError}
          </div>
        )}
        {preloadDone > 0 && preloadDone < 5 && !preloadError && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "var(--muted)" }}>
            Preparing slides for download… ({preloadDone}/5)
          </div>
        )}
        {preloadDone === 5 && (
          <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "8px 14px", marginBottom: 20, fontSize: 12, color: "#15803d" }}>
            ✓ Ready to download. On iPhone: tap ↓ PNG → image opens → long-press → Save to Photos.
          </div>
        )}
        {pdfError && (
          <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "var(--error)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>PDF error: {pdfError}</span>
            <button onClick={() => setPdfError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--error)", padding: "0 4px", fontFamily: "inherit" }}>×</button>
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
              {slideBlobs[i] ? (
                <a
                  href={slideBlobs[i]!.url}
                  download={slideBlobs[i]!.name}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => {
                    // Try Web Share API first (gets the native share sheet on iOS/Android).
                    // If unavailable, let the <a> navigation fire — iOS opens the PNG
                    // inline so the user can long-press → Save to Photos.
                    const file = preloadedFilesRef.current.get(`${reelsMode}|${i}`);
                    if (
                      file &&
                      typeof navigator.share === "function" &&
                      typeof navigator.canShare === "function" &&
                      navigator.canShare({ files: [file] })
                    ) {
                      e.preventDefault();
                      navigator.share({ files: [file], title: file.name }).catch(() => {
                        // Share rejected — fall back to opening the blob URL
                        window.open(slideBlobs[i]!.url, "_blank");
                      });
                    }
                  }}
                  style={{
                    display: "block", textAlign: "center",
                    marginTop: 8, width: "100%", background: "var(--surface)", color: "var(--text)",
                    border: "1px solid var(--border)", borderRadius: 6, padding: "7px 0",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    textDecoration: "none",
                  }}
                >
                  ↓ PNG
                </a>
              ) : (
                <button
                  onClick={() => downloadSlide(i)}
                  disabled={downloading === i || downloadingAll}
                  style={{
                    marginTop: 8, width: "100%", background: "var(--surface)", color: "var(--muted)",
                    border: "1px solid var(--border)", borderRadius: 6, padding: "7px 0",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                    cursor: "wait", opacity: 0.6,
                  }}
                >
                  {preloadError ? "⚠ Retry" : "Preparing…"}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Caption */}
        {content.caption && (
          <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Caption</span>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(content.caption).then(() => {
                    setCaptionCopied(true);
                    setTimeout(() => setCaptionCopied(false), 2000);
                  }).catch(() => {})
                }
                style={{ fontSize: 11, fontWeight: 600, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "3px 10px", cursor: "pointer", color: "var(--text)", fontFamily: "inherit" }}
              >
                {captionCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
              {content.caption}
            </p>
          </div>
        )}

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


// ── Did You Know share view ───────────────────────────────────────────────────
function DidYouKnowShareView({ carousel }: { carousel: SavedCarousel }) {
  const dyk = carousel.didYouKnowContent!;
  const exportSlide1Ref = useRef<HTMLDivElement>(null);
  const exportSlide2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  async function buildFile(node: HTMLElement | null, filename: string): Promise<File | null> {
    if (!node) return null;
    const dataUrl = await toPng(node, {
      width: 1080, height: 1350, pixelRatio: 1, cacheBust: true,
    });
    const blob = await (await fetch(dataUrl)).blob();
    return new File([blob], filename, { type: "image/png" });
  }

  async function saveFile(file: File) {
    const canShareFiles =
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw err;
      }
    }

    const url = URL.createObjectURL(file);
    const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function downloadAll() {
    setError(null); setDownloading(true);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const safe = carousel.topic.replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();
      const f1 = await buildFile(exportSlide1Ref.current, `dyk-${safe}-1.png`);
      const f2 = await buildFile(exportSlide2Ref.current, `dyk-${safe}-2.png`);
      const files = [f1, f2].filter((f): f is File => f !== null);
      if (files.length === 0) { setError("Nothing to download."); return; }

      const canShareFiles =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files });

      if (canShareFiles) {
        try {
          await navigator.share({ files, title: "Lunia · Did You Know" });
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      for (const f of files) await saveFile(f);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error(e); setError("Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  function copyCaption() {
    navigator.clipboard.writeText(dyk.caption).then(() => {
      setCaptionCopied(true); setTimeout(() => setCaptionCopied(false), 1600);
    });
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{carousel.topic}</h1>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          Did You Know · saved {new Date(carousel.savedAt).toLocaleDateString()}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <DidYouKnowSlide slide={dyk.slide1} scale={0.5} />
        <DidYouKnowSlide slide={dyk.slide2} scale={0.5} />
      </div>

      {/* Hidden full-size slides for accurate PNG export */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={exportSlide1Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={dyk.slide1} scale={1} />
        </div>
        <div ref={exportSlide2Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={dyk.slide2} scale={1} />
        </div>
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Caption</div>
          <button onClick={copyCaption} style={{ fontSize: 12, fontWeight: 600, color: captionCopied ? "var(--success)" : "var(--accent)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {captionCopied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{dyk.caption}</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={downloadAll} disabled={downloading} style={{
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
          padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: downloading ? "wait" : "pointer", fontFamily: "inherit",
        }}>
          {downloading ? "Downloading..." : "Download both slides"}
        </button>
        {error && <div style={{ fontSize: 13, color: "var(--error)" }}>{error}</div>}
      </div>
    </div>
  );
}
