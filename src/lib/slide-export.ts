// Canvas compositing for slide PNG export, shared by the editor
// (PreviewStep) and the public share page (CarouselShareClient). Both used
// to carry their own copy, and both had the same fault: the slide's ground
// was cleared before the text layer was captured and never painted back,
// so a cover whose image does not fill the frame (the essay engraving on
// paper) exported with a transparent ground, white in one viewer and black
// in another. Multiply layers (the paper grain, the engraving itself)
// captured over nothing came out as grey noise or an opaque white card.
//
// html-to-image drops <img> contents on mobile Safari, which is why images
// are drawn by hand here at all. The order on the canvas is the order on
// the page: ground, paper layers, images, then the captured text layer.
//
// Two things were wrong with how the images were drawn, and together they
// exported a cover as a plain coloured square: the ground and the wash with
// no photograph between them.
//
//   1. Every image was re-fetched through the proxy at export time, even
//      though the <img> was already decoded on the page. A slow phone, a
//      cold cache or one bad proxy response lost the photograph that the
//      user could see in the preview. The live element is the source now,
//      and the fetch is the fallback rather than the other way round.
//   2. Both failure paths were a bare `continue`, so an image that could
//      not be loaded or decoded was dropped without a word and the export
//      "succeeded". Anything undrawn now throws MissingSlideImagesError,
//      because a cover without its photograph is not a cover.
//
// Painting happens BEFORE the foreground capture, while the live <img>
// elements are still intact: the capture blanks their src and restores it,
// and a just-restored src is not guaranteed to be decoded again in time.

import { toPng } from "html-to-image";
import { fontEmbedCSSFor } from "@/lib/font-embed";

export type LoadDataUrl = (src: string) => Promise<string>;

/**
 * One value standing for everything a rebuilt PNG depends on, for the
 * effects that cache exported slides ahead of the download.
 *
 * Those effects used to spell their dependency array out by hand, and the
 * pen colour was left off it: choosing a different pen redrew the preview
 * and left the cached PNGs alone, so Download handed back the navy version
 * of a slide the user had just made red. A list written out by hand can be
 * missing an entry and still look complete; a signature over the whole
 * input cannot.
 *
 * Pass every input the renderer reads — content, treatment, paper, scale.
 */
export function slideExportSignature(...inputs: unknown[]): string {
  return JSON.stringify(inputs);
}

/** Thrown when the slide exported without one or more of its images. The
 *  callers do not fall back to a plain toPng on this: toPng is what drops
 *  <img> contents on mobile in the first place, so it would hand the user
 *  the same silent coloured square this error exists to prevent. */
export class MissingSlideImagesError extends Error {
  readonly sources: string[];
  constructor(sources: string[]) {
    // The message reaches the screen through both callers, so it is written
    // for the person holding the phone rather than for a log.
    super(
      sources.length > 1
        ? "Some slide images could not be loaded, so the slides were not saved. Check your connection and download again."
        : "The slide image could not be loaded, so the slide was not saved. Check your connection and download again.",
    );
    this.name = "MissingSlideImagesError";
    this.sources = sources;
  }
}

type ImgInfo = {
  src: string;
  /** The live element, when it is decoded and usable as a draw source. */
  el: HTMLImageElement | null;
  /** Fetched only when the live element cannot be used, or when drawing
   *  from the live element tainted the canvas. */
  dataUrl: string | null;
  x: number; y: number; w: number; h: number;
  objectFit: string; objectPosition: string; blend: string; opacity: number;
};
type PaperLayer = { kind: string; src: string; tile: number; opacity: number; x: number; y: number; w: number; h: number };

const TRANSPARENT = /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\)$/;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

/** A decoded <img> already on the page is the best draw source there is:
 *  no network, no proxy, no decode, and it is the picture the user is
 *  looking at. Anything still loading or broken is not usable. */
export function usableLiveImage(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
}

/** A canvas that drew a cross-origin image without CORS cannot be read back.
 *  That is the one case where the live element is not enough. */
export function isTaintError(err: unknown): boolean {
  return err instanceof DOMException && (err.name === "SecurityError" || err.code === 18);
}

/**
 * Export `el` (a rendered slide at 1080 x exportH) to a PNG File, drawing
 * its <img> elements onto a 2x canvas and the rest of the slide on top.
 * `loadDataUrl` resolves an <img src> to a data URL (the caller proxies
 * cross-origin URLs and caches).
 *
 * Throws MissingSlideImagesError when an image could not be drawn at all.
 */
export async function compositeSlideWithImages(
  el: HTMLElement,
  imgEls: HTMLImageElement[],
  opts: { filename: string; exportH: number; loadDataUrl: LoadDataUrl },
): Promise<File> {
  const { filename, exportH, loadDataUrl } = opts;
  const elRect = el.getBoundingClientRect();

  // ── Read the slide: geometry, styles, and a draw source per image ────────
  const infos: ImgInfo[] = [];
  for (const img of imgEls) {
    const src = img.getAttribute("src");
    if (!src) continue;
    const live = usableLiveImage(img) ? img : null;
    let dataUrl: string | null = null;
    // Only reach for the network when the page cannot supply the pixels.
    if (!live) {
      try { dataUrl = await loadDataUrl(src); } catch { dataUrl = null; }
    }
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    infos.push({
      src, el: live, dataUrl,
      x: r.x - elRect.x, y: r.y - elRect.y, w: r.width, h: r.height,
      objectFit: cs.objectFit || "fill",
      objectPosition: cs.objectPosition || "50% 50%",
      // The essay engraving is multiplied onto the paper in the page, so
      // its white ground disappears; drawn opaque it is a white card.
      blend: cs.mixBlendMode || "normal",
      opacity: Number(cs.opacity) || 1,
    });
  }

  // el > SlideWrapper outer > SlideWrapper inner (carries the slide's
  // `style={{ background }}`). Read the ground before clearing it.
  const innerWrapper = el.firstElementChild?.firstElementChild as HTMLElement | null;
  const groundRaw = innerWrapper ? getComputedStyle(innerWrapper).backgroundColor : "";
  const ground = groundRaw && groundRaw !== "transparent" && !TRANSPARENT.test(groundRaw) ? groundRaw : null;

  // Paper layers (essay grain, vignette) blend with multiply; captured over
  // a transparent backdrop they come out as grey grain, so they are hidden
  // for the capture and redrawn on the canvas over the ground.
  const paperEls = Array.from(el.querySelectorAll<HTMLElement>("[data-export-paper]"));
  const paperLayers: PaperLayer[] = paperEls.map((pe) => {
    const r = pe.getBoundingClientRect();
    return { kind: pe.dataset.exportPaper ?? "", src: pe.dataset.exportSrc ?? "", tile: Number(pe.dataset.exportTile) || 512, opacity: Number(pe.dataset.exportOpacity) || 1, x: r.x - elRect.x, y: r.y - elRect.y, w: r.width, h: r.height };
  });
  const paperImages = new Map<string, HTMLImageElement | null>();
  for (const layer of paperLayers) {
    if (layer.kind !== "texture" || !layer.src || paperImages.has(layer.src)) continue;
    let dataUrl: string | null = null;
    try { dataUrl = await loadDataUrl(layer.src); } catch { dataUrl = null; }
    paperImages.set(layer.src, dataUrl ? await loadImage(dataUrl) : null);
  }

  const PR = 2;
  const W = 1080 * PR, H = exportH * PR;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  /** Ground, paper, then every image at its on-page position, DOM order as
   *  z-order. Returns the images it could not draw. Runs a second time with
   *  `fromDataUrlOnly` if the first pass tainted the canvas. */
  async function paintBase(fromDataUrlOnly: boolean): Promise<string[]> {
    ctx.clearRect(0, 0, W, H);
    if (ground) {
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, W, H);
    }

    for (const layer of paperLayers) {
      if (layer.kind === "texture" && layer.src) {
        const im = paperImages.get(layer.src);
        if (!im) continue;
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.globalAlpha = layer.opacity;
        const t = layer.tile * PR;
        for (let y = layer.y * PR; y < (layer.y + layer.h) * PR; y += t) {
          for (let x = layer.x * PR; x < (layer.x + layer.w) * PR; x += t) ctx.drawImage(im, x, y, t, t);
        }
        ctx.restore();
      } else if (layer.kind === "vignette") {
        // radial-gradient(ellipse at 50% 40%, transparent 55%, ink at
        // `strength` 100%). PaperTexture writes the strength to
        // data-export-opacity; a layer without it is the Essay original.
        const strength = Number.isFinite(layer.opacity) && layer.opacity < 1 ? layer.opacity : 0.07;
        const lw = layer.w * PR, lh = layer.h * PR;
        ctx.save();
        ctx.translate(layer.x * PR, layer.y * PR);
        ctx.scale(1, lh / lw);
        const cx = lw / 2, cy = 0.4 * lw, r = lw / 2;
        const g = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
        g.addColorStop(0, "rgba(16,38,53,0)");
        g.addColorStop(1, `rgba(16,38,53,${strength})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, lw, lw);
        ctx.restore();
      }
    }

    const undrawn: string[] = [];
    for (const info of infos) {
      // The live element first, unless this is the retry after a taint.
      let im: HTMLImageElement | null = fromDataUrlOnly ? null : info.el;
      if (!im) {
        // Fetch now if the first pass never needed to, or if it failed then
        // and the picture may simply have arrived since.
        if (!info.dataUrl) {
          try { info.dataUrl = await loadDataUrl(info.src); } catch { info.dataUrl = null; }
        }
        im = info.dataUrl ? await loadImage(info.dataUrl) : null;
      }
      if (!im) { undrawn.push(info.src); continue; }
      const iw = im.naturalWidth || im.width;
      const ih = im.naturalHeight || im.height;
      if (!iw || !ih) { undrawn.push(info.src); continue; }
      const dx = info.x * PR, dy = info.y * PR, dw = info.w * PR, dh = info.h * PR;
      ctx.save();
      if (info.blend && info.blend !== "normal") ctx.globalCompositeOperation = info.blend as GlobalCompositeOperation;
      ctx.globalAlpha = info.opacity;
      if (info.objectFit === "cover") {
        const scale = Math.max(dw / iw, dh / ih);
        const sw = dw / scale, sh = dh / scale;
        // Honour object-position: "top" keeps the top edge; anything else centres.
        const topAnchored = /\btop\b|0%$/.test(info.objectPosition);
        const sx = (iw - sw) / 2;
        const sy = topAnchored ? 0 : (ih - sh) / 2;
        ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
      } else if (info.objectFit === "contain") {
        const scale = Math.min(dw / iw, dh / ih);
        const dwc = iw * scale, dhc = ih * scale;
        // Honour object-position "bottom": the essay engraving sits on its baseline.
        const bottomAnchored = /\bbottom\b|100%$/.test(info.objectPosition);
        const oy = bottomAnchored ? dh - dhc : (dh - dhc) / 2;
        ctx.drawImage(im, dx + (dw - dwc) / 2, dy + oy, dwc, dhc);
      } else {
        ctx.drawImage(im, dx, dy, dw, dh);
      }
      ctx.restore();
    }
    return undrawn;
  }

  let undrawn = await paintBase(false);

  // The web fonts, resolved once per page rather than once per export. See
  // lib/font-embed: html-to-image otherwise refetches every font file and
  // grows the document's stylesheet on every call.
  const fontEmbedCSS = await fontEmbedCSSFor(el);

  // ── The foreground: the slide with its images and paper layers hidden ────
  const savedDisplays = imgEls.map((img) => img.style.display);
  const savedSrcs = imgEls.map((img) => img.getAttribute("src") ?? "");
  const savedPaperDisplays = paperEls.map((pe) => pe.style.display);
  const savedWrapperBg = innerWrapper?.style.background ?? "";

  // Erase src AND hide: html-to-image crawls every img src in the cloned
  // DOM and throws a DOM error event if any fails to load.
  imgEls.forEach((img) => { img.style.display = "none"; img.removeAttribute("src"); });
  paperEls.forEach((pe) => { pe.style.display = "none"; });
  if (innerWrapper) innerWrapper.style.background = "transparent";

  let fgDataUrl: string;
  try {
    fgDataUrl = await toPng(el, {
      width: 1080, height: exportH, pixelRatio: 2,
      cacheBust: false, backgroundColor: "transparent",
      fontEmbedCSS,
      filter: (n: Node) => !(n instanceof HTMLImageElement),
    });
  } finally {
    imgEls.forEach((img, i) => {
      img.style.display = savedDisplays[i] ?? "";
      if (savedSrcs[i]) img.setAttribute("src", savedSrcs[i]);
    });
    paperEls.forEach((pe, i) => { pe.style.display = savedPaperDisplays[i] ?? ""; });
    if (innerWrapper) innerWrapper.style.background = savedWrapperBg;
  }

  const fg = await loadImage(fgDataUrl);
  if (fg) ctx.drawImage(fg, 0, 0, W, H);

  const toBlob = () => new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png"),
  );

  let blob: Blob;
  try {
    blob = await toBlob();
  } catch (err) {
    // A live element drawn without CORS taints the canvas and the pixels
    // cannot be read back. Repaint from data URLs, which are same-origin,
    // and put the foreground back on top.
    if (!isTaintError(err) || infos.every((i) => !i.el)) throw err;
    undrawn = await paintBase(true);
    if (fg) ctx.drawImage(fg, 0, 0, W, H);
    blob = await toBlob();
  }

  // A cover exported without its photograph is a coloured square. The caller
  // shows the error rather than handing that to the user as a finished slide.
  if (undrawn.length > 0) throw new MissingSlideImagesError(undrawn);

  return new File([blob], filename, { type: "image/png" });
}
