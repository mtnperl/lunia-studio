// Did you know, the Highlighter redesign (2026-09-09).
//
// Paper, a serif italic question, Inter light body. Each paragraph has one
// marked phrase, the number or the claim, which sits in a box: navy with
// ivory type (treatment "navy-box", V6 in the proposal) or Signal Yellow
// (treatment "yellow-box", V8). Every other highlighted phrase takes a
// hand-drawn navy pen underline. Small tracked chrome top and bottom, a
// counter, a progress rule. No logo, no chevrons.
//
// The content contract did not change: tokens carry `highlight`, and the
// generator now also sets `mark` on one token per paragraph. Saved decks
// without `mark` box the first highlighted token that carries a digit.

import type { CSSProperties } from "react";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { PaperTexture } from "@/components/carousel/shared/EssayChrome";
import { DYK_CHROME_LABEL, DYK_COLORS, DYK_LAYOUT, DYK_SERIF, DYK_TYPE, PAPER_DEFAULTS, BRAND_FONT_FAMILY, type PaperSettings } from "@/lib/brand-tokens";
import type { DidYouKnowSlideContent, DidYouKnowToken, DidYouKnowTreatment } from "@/lib/types";

type Props = {
  slide: DidYouKnowSlideContent;
  /** 1 for the fact, 2 for the takeaway. Drives the counter and the rule. */
  index?: 1 | 2;
  treatment?: DidYouKnowTreatment;
  paper?: Partial<PaperSettings>;
  scale?: number;
  fontScale?: number;
  id?: string;
};

const TOTAL = 2;

/** A wavy 7px stroke under the word, drawn as an SVG background so it
 *  overshoots the word by 2% on each side and survives line wraps. */
const PEN_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 14' preserveAspectRatio='none'><path d='M3 9 C 40 4, 80 12, 120 7 S 180 11, 197 6' fill='none' stroke='${encodeURIComponent(DYK_COLORS.pen)}' stroke-width='7' stroke-linecap='round'/></svg>")`;

const penStyle: CSSProperties = {
  backgroundImage: PEN_SVG,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "-2% 100%",
  backgroundSize: "104% 14px",
  paddingBottom: 6,
};

function boxStyle(treatment: DidYouKnowTreatment): CSSProperties {
  const navy = treatment === "navy-box";
  return {
    background: navy ? DYK_COLORS.ink : DYK_COLORS.yellow,
    color: navy ? DYK_COLORS.paper : DYK_COLORS.ink,
    padding: "0 0.14em",
    fontWeight: 500,
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
  };
}

/** Which token in a paragraph takes the box. The generator marks one; older
 *  content has none, so the first highlighted token with a digit stands in,
 *  then the first highlighted token. */
export function markedIndex(tokens: DidYouKnowToken[]): number {
  const explicit = tokens.findIndex((t) => t.highlight && t.mark);
  if (explicit >= 0) return explicit;
  const numeric = tokens.findIndex((t) => t.highlight && /\d/.test(t.text));
  if (numeric >= 0) return numeric;
  return tokens.findIndex((t) => t.highlight);
}

function renderTokens(tokens: DidYouKnowToken[], treatment: DidYouKnowTreatment) {
  const marked = markedIndex(tokens);
  return tokens.map((t, i) => {
    if (!t.highlight) return <span key={i}>{t.text}</span>;
    // Tokens carry their own surrounding spaces; keep those outside the mark
    // so a box or a pen never paints over a gap.
    const lead = t.text.match(/^\s*/)?.[0] ?? "";
    const trail = t.text.match(/\s*$/)?.[0] ?? "";
    const core = t.text.slice(lead.length, t.text.length - trail.length);
    const style = i === marked ? boxStyle(treatment) : penStyle;
    return (
      <span key={i}>
        {lead}
        <span style={style}>{core}</span>
        {trail}
      </span>
    );
  });
}

/** The frozen headers arrive as "DID YOU KNOW?" and "BY". The slide sets
 *  them in sentence case, as the brand asks of every header. */
function sentenceCase(s: string): string {
  const t = s.trim();
  if (t !== t.toUpperCase()) return t;
  const lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function Header({ text, treatment, size }: { text: string; treatment: DidYouKnowTreatment; size: number }) {
  const shown = sentenceCase(text);
  const isLead = /^by\b/i.test(shown) || shown.length <= 3;
  const base: CSSProperties = {
    position: "absolute",
    top: DYK_LAYOUT.headerTop,
    left: DYK_LAYOUT.padX,
    right: DYK_LAYOUT.padX,
    textAlign: "center",
    fontFamily: DYK_SERIF,
    fontStyle: "italic",
    fontWeight: 400,
    fontSize: size,
    lineHeight: 1,
    letterSpacing: "-0.01em",
    color: DYK_COLORS.ink,
  };
  if (isLead) {
    // "By ————": the open loop. The rule is the reader's line to finish.
    return (
      <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <span>{shown}</span>
        <span aria-hidden style={{ display: "inline-block", width: 420, height: 4, background: DYK_COLORS.ink, marginTop: Math.round(size * 0.12) }} />
      </div>
    );
  }
  if (treatment === "navy-box") {
    const words = shown.split(" ");
    const last = words.pop() ?? "";
    return (
      <div style={base}>
        {words.join(" ")}{words.length > 0 ? " " : ""}
        <span style={{ ...boxStyle(treatment), fontWeight: 400, fontStyle: "italic", padding: "0 0.1em" }}>{last}</span>
      </div>
    );
  }
  return <div style={base}>{shown}</div>;
}

const chromeStyle: CSSProperties = {
  fontFamily: BRAND_FONT_FAMILY,
  fontWeight: 500,
  fontSize: DYK_TYPE.chrome,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: DYK_COLORS.inkMuted,
  whiteSpace: "nowrap",
};

export default function DidYouKnowSlide({ slide, index = 1, treatment = "navy-box", paper, scale = 1, fontScale = 1, id }: Props) {
  const grain = paper?.grain ?? PAPER_DEFAULTS.highlighter.grain;
  const vignette = paper?.vignette ?? PAPER_DEFAULTS.highlighter.vignette;
  const chars = slide.body1.reduce((n, t) => n + t.text.length, 0) + slide.body2.reduce((n, t) => n + t.text.length, 0);
  // The lint holds a slide to 280-340 characters; the long end steps the
  // body down a notch so ten lines still clear the chrome.
  const bodySize = Math.round(DYK_TYPE.body * fontScale * (chars > 320 ? 0.95 : 1));
  const headerSize = Math.round(DYK_TYPE.header * fontScale);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <SlideWrapper scale={scale} height={1350} id={id} style={{ background: DYK_COLORS.paper }}>
      <PaperTexture opacity={grain} vignette={vignette} />

      <div style={{ position: "absolute", left: DYK_LAYOUT.padX, right: DYK_LAYOUT.padX, top: DYK_LAYOUT.chromeTop, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={chromeStyle}>Lunia Life</div>
        <div style={chromeStyle}>{DYK_CHROME_LABEL}</div>
      </div>

      <Header text={slide.header} treatment={treatment} size={headerSize} />

      <div style={{
        position: "absolute",
        top: DYK_LAYOUT.bodyTop,
        left: DYK_LAYOUT.bodyX,
        right: DYK_LAYOUT.bodyX,
        textAlign: "center",
        fontFamily: BRAND_FONT_FAMILY,
        fontWeight: 300,
        fontSize: bodySize,
        lineHeight: 1.5,
        color: DYK_COLORS.ink,
        wordBreak: "normal",
        hyphens: "none",
      }}>
        <p style={{ margin: 0 }}>{renderTokens(slide.body1, treatment)}</p>
        <p style={{ margin: "36px 0 0 0" }}>{renderTokens(slide.body2, treatment)}</p>
      </div>

      <div style={{ position: "absolute", left: DYK_LAYOUT.padX, right: DYK_LAYOUT.padX, bottom: DYK_LAYOUT.chromeBottom, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={chromeStyle}>lunialife.com</div>
        <div style={chromeStyle}>{pad(index)}<span style={{ color: DYK_COLORS.yellowText }}>/</span>{pad(TOTAL)}</div>
      </div>
      <div style={{ position: "absolute", left: DYK_LAYOUT.padX, right: DYK_LAYOUT.padX, bottom: 28, height: 3, background: DYK_COLORS.inkHairline }}>
        <div style={{ width: `${(index / TOTAL) * 100}%`, height: "100%", background: DYK_COLORS.yellow }} />
      </div>
    </SlideWrapper>
  );
}
