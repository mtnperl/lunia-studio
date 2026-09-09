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

import { toPng } from "html-to-image";

export type LoadDataUrl = (src: string) => Promise<string>;

type ImgInfo = { dataUrl: string; x: number; y: number; w: number; h: number; objectFit: string; objectPosition: string; blend: string; opacity: number };
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

/**
 * Export `el` (a rendered slide at 1080 x exportH) to a PNG File, drawing
 * its <img> elements onto a 2x canvas and the rest of the slide on top.
 * `loadDataUrl` resolves an <img src> to a data URL (the caller proxies
 * cross-origin URLs and caches).
 */
export async function compositeSlideWithImages(
  el: HTMLElement,
  imgEls: HTMLImageElement[],
  opts: { filename: string; exportH: number; loadDataUrl: LoadDataUrl },
): Promise<File> {
  const { filename, exportH, loadDataUrl } = opts;
  const elRect = el.getBoundingClientRect();

  const infos: ImgInfo[] = [];
  for (const img of imgEls) {
    const src = img.getAttribute("src");
    if (!src) continue;
    let dataUrl: string;
    try { dataUrl = await loadDataUrl(src); } catch { continue; }
    const r = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    infos.push({
      dataUrl,
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

  const PR = 2;
  const W = 1080 * PR, H = exportH * PR;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  if (ground) {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
  }

  for (const layer of paperLayers) {
    if (layer.kind === "texture" && layer.src) {
      let dataUrl: string | null = null;
      try { dataUrl = await loadDataUrl(layer.src); } catch { dataUrl = null; }
      const im = dataUrl ? await loadImage(dataUrl) : null;
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

  // Each image at its on-page position, DOM order = z-order.
  for (const info of infos) {
    const im = await loadImage(info.dataUrl);
    if (!im) continue;
    const dx = info.x * PR, dy = info.y * PR, dw = info.w * PR, dh = info.h * PR;
    ctx.save();
    if (info.blend && info.blend !== "normal") ctx.globalCompositeOperation = info.blend as GlobalCompositeOperation;
    ctx.globalAlpha = info.opacity;
    if (info.objectFit === "cover") {
      const scale = Math.max(dw / im.width, dh / im.height);
      const sw = dw / scale, sh = dh / scale;
      // Honour object-position: "top" keeps the top edge; anything else centres.
      const topAnchored = /\btop\b|0%$/.test(info.objectPosition);
      const sx = (im.width - sw) / 2;
      const sy = topAnchored ? 0 : (im.height - sh) / 2;
      ctx.drawImage(im, sx, sy, sw, sh, dx, dy, dw, dh);
    } else if (info.objectFit === "contain") {
      const scale = Math.min(dw / im.width, dh / im.height);
      const dwc = im.width * scale, dhc = im.height * scale;
      // Honour object-position "bottom": the essay engraving sits on its baseline.
      const bottomAnchored = /\bbottom\b|100%$/.test(info.objectPosition);
      const oy = bottomAnchored ? dh - dhc : (dh - dhc) / 2;
      ctx.drawImage(im, dx + (dw - dwc) / 2, dy + oy, dwc, dhc);
    } else {
      ctx.drawImage(im, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  const fg = await loadImage(fgDataUrl);
  if (fg) ctx.drawImage(fg, 0, 0, W, H);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png"),
  );
  return new File([blob], filename, { type: "image/png" });
}
