// Shared pieces of the pen-and-paper formats, Chartbook and Primer: the
// paper, a serif title with a navy pen underline, the yellow marker swipe,
// the numeral face, the source line, the handle and the arrow.

import type { CSSProperties, ReactNode } from "react";
import { PaperTexture } from "@/components/carousel/shared/EssayChrome";
import { PEN_COLORS as C, PEN_SERIF, PEN_SANS, PEN_TYPE as T, PEN_LAYOUT as L, PAPER_DEFAULTS, type PaperSettings } from "@/lib/brand-tokens";

export function penPaper(format: "chartbook" | "primer", paper?: Partial<PaperSettings>): PaperSettings {
  const d = PAPER_DEFAULTS[format];
  return { grain: paper?.grain ?? d.grain, vignette: paper?.vignette ?? d.vignette, pen: paper?.pen };
}

/** A 7px stroke under the word with a slight hand-drawn waver (about a
 *  pixel and a half either way, not the wave it started with), drawn as an
 *  SVG background so it overshoots the word by 2% on each side and survives
 *  line wraps. `color` is any CSS colour; the default is the navy pen. */
export function penSvg(color: string = C.pen): string {
  return `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'><path d='M3 8 C 40 6.5, 80 9.5, 120 7.5 S 180 9, 197 7' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='7' stroke-linecap='round'/></svg>")`;
}

export function penStyleFor(color?: string): CSSProperties {
  return {
    backgroundImage: penSvg(color),
    backgroundRepeat: "no-repeat",
    backgroundPosition: "-2% 100%",
    backgroundSize: "104% 14px",
    paddingBottom: 6,
  };
}

export const penStyle: CSSProperties = penStyleFor();

/** The marker swipe: denser at both ends, cloned across line breaks. */
export const swipeStyle: CSSProperties = {
  backgroundImage: "linear-gradient(100deg, rgba(255,216,0,0) 1%, rgba(255,216,0,0.95) 3%, rgba(255,216,0,0.62) 7%, rgba(255,216,0,0.55) 92%, rgba(255,216,0,0.95) 97%, rgba(255,216,0,0) 99%)",
  padding: "0 0.12em",
  margin: "0 -0.04em",
  WebkitBoxDecorationBreak: "clone",
  boxDecorationBreak: "clone",
};

/** `text` with each of `words` (exact substrings, first occurrence) wrapped
 *  in `mark`. Words that are not in the text are ignored. */
export function MarkWords({ text, words, mark = "pen", pen }: { text: string; words?: readonly string[]; mark?: "pen" | "swipe"; pen?: string }) {
  const style = mark === "pen" ? penStyleFor(pen) : swipeStyle;
  const hits = (words ?? [])
    .map((w) => ({ w, at: w ? text.indexOf(w) : -1 }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at);
  if (hits.length === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let pos = 0;
  hits.forEach((h, i) => {
    if (h.at < pos) return; // overlapping, skip
    out.push(text.slice(pos, h.at));
    out.push(<span key={i} style={style}>{h.w}</span>);
    pos = h.at + h.w.length;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}

export function PenGround({ paper, children }: { paper: PaperSettings; children: ReactNode }) {
  return (
    <>
      <PaperTexture opacity={paper.grain} vignette={paper.vignette} />
      {children}
    </>
  );
}

/** Serif title with a pen under the chosen words (default: the last word). */
export function PenTitle({ text, underline, size = T.title, align = "center", style, pen }: { text: string; underline?: readonly string[]; size?: number; align?: "center" | "left"; style?: CSSProperties; pen?: string }) {
  const words = underline && underline.length > 0 ? underline : [text.trim().split(/\s+/).slice(-1)[0] ?? ""];
  return (
    <div style={{ fontFamily: PEN_SERIF, fontWeight: 500, fontSize: size, lineHeight: 1.05, color: C.ink, textAlign: align, ...style }}>
      <MarkWords text={text} words={words} mark="pen" pen={pen} />
    </div>
  );
}

export function Kicker({ text, italic = false, size = T.kicker, style }: { text: string; italic?: boolean; size?: number; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: PEN_SANS, fontStyle: italic ? "italic" : "normal", fontWeight: 400, fontSize: size, color: C.inkMuted, textAlign: "center", lineHeight: 1.3, ...style }}>{text}</div>
  );
}

/** Numerals in Inter tabular, never the serif. */
export const numStyle: CSSProperties = { fontFamily: PEN_SANS, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: C.ink };

export function SourceLine({ text }: { text: string }) {
  return (
    <div style={{ position: "absolute", left: L.padX, right: L.padX, bottom: L.chromeBottom + 56, textAlign: "center", fontFamily: PEN_SANS, fontStyle: "italic", fontWeight: 300, fontSize: T.source, color: C.inkMuted, lineHeight: 1.3, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{text}</div>
  );
}

/** The chrome: handle bottom-left, arrow bottom-right on the cover. */
export function PenChrome({ arrow = false }: { arrow?: boolean }) {
  return (
    <>
      <div style={{ position: "absolute", left: L.padX, bottom: L.chromeBottom, fontFamily: PEN_SANS, fontWeight: 500, fontSize: T.chrome, letterSpacing: "0.2em", textTransform: "uppercase", color: C.inkMuted, lineHeight: 1 }}>lunialife.com</div>
      {arrow && (
        <div aria-hidden style={{ position: "absolute", right: L.padX, bottom: L.chromeBottom - 12, fontFamily: PEN_SANS, fontWeight: 300, fontSize: T.arrow, color: C.ink, lineHeight: 1 }}>&rarr;</div>
      )}
    </>
  );
}

/** Title block at the top of the second slide: serif title, unit kicker. */
export function TitleBlock({ title, underline, kicker, kickerItalic = false, pen }: { title: string; underline?: readonly string[]; kicker?: string; kickerItalic?: boolean; pen?: string }) {
  return (
    <div style={{ position: "absolute", left: L.padX, right: L.padX, top: L.titleTop, textAlign: "center" }}>
      <PenTitle text={title} underline={underline} pen={pen} />
      {kicker && <Kicker text={kicker} italic={kickerItalic} style={{ marginTop: 22 }} />}
    </div>
  );
}
