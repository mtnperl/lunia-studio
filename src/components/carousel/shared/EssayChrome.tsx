"use client";

// Shared furniture for the Essay preset.
//
// What makes a deck read as made by a person rather than generated is a set
// of traces: a surface with grain, a serial number and a date, a signature,
// and one word somebody chose to box. These pieces draw those traces so the
// hook, content and takeaway slides carry the same ones.

import type { CSSProperties, ReactNode } from "react";
import { ESSAY_COLORS, ESSAY_DISPLAY, ESSAY_PAPER_TEXTURE, ESSAY_SCRIPT, ESSAY_TEXT, ESSAY_TYPE, type EssayAccent } from "@/lib/brand-tokens";

export const ESSAY_PAD = { x: 84, y: 72 } as const;

/** The accent trio for a deck. */
export function essayAccent(accent: EssayAccent | undefined) {
  return ESSAY_COLORS.accent[accent === "red" ? "red" : "yellow"];
}

/** Paper grain over the ground, multiplied so it darkens the ivory into
 *  fibre rather than greying it, and a faint vignette on top so the sheet
 *  reads as scanned rather than flat. Both carry data-export-paper: the PNG
 *  export composites slides with images on a canvas, and a multiply layer
 *  captured over a transparent backdrop comes out as grey grain, so the
 *  compositor hides these during capture and redraws them itself
 *  (PreviewStep.compositeWithImages). */
export function PaperTexture({ opacity = 0.9 }: { opacity?: number }) {
  return (
    <>
      <div
        aria-hidden
        data-export-paper="texture"
        data-export-src={ESSAY_PAPER_TEXTURE}
        data-export-tile="512"
        data-export-opacity={opacity}
        style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${ESSAY_PAPER_TEXTURE})`,
          backgroundRepeat: "repeat",
          backgroundSize: "512px 512px",
          mixBlendMode: "multiply",
          opacity,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        data-export-paper="vignette"
        style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 40%, rgba(16,38,53,0) 55%, rgba(16,38,53,0.07) 100%)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

const chromeStyle: CSSProperties = {
  fontFamily: ESSAY_TEXT,
  fontWeight: 500,
  fontSize: ESSAY_TYPE.chrome,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: ESSAY_COLORS.inkMuted,
  whiteSpace: "nowrap",
};

/** One row of serial chrome: a left and a right label. */
export function ChromeRow({ left, right, top, bottom, accentWord }: { left: ReactNode; right?: ReactNode; top?: number; bottom?: number; accentWord?: string }) {
  return (
    <div style={{ position: "absolute", left: ESSAY_PAD.x, right: ESSAY_PAD.x, top, bottom, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <div style={chromeStyle}>{left}</div>
      {right !== undefined && (
        <div style={chromeStyle}>
          {right}
          {accentWord ? <span style={{ color: accentWord }}> </span> : null}
        </div>
      )}
    </div>
  );
}

/** "04/10": the current slide over the total, the total in the accent. */
export function Counter({ index, total, accent }: { index: number; total: number; accent: string }) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span>
      {pad(index)}<span style={{ color: accent }}>/</span>{pad(total)}
    </span>
  );
}

/** A thin rule at the very bottom whose length is the reader's position in
 *  the deck. */
export function ProgressRule({ index, total, accent }: { index: number; total: number; accent: string }) {
  const pct = Math.max(0.06, Math.min(1, total > 0 ? index / total : 0));
  return (
    <div style={{ position: "absolute", left: ESSAY_PAD.x, right: ESSAY_PAD.x, bottom: 28, height: 3, background: ESSAY_COLORS.inkHairline }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: accent }} />
    </div>
  );
}

/** The signature. Script, ink, no logo: the mark of an author. */
export function Byline({ text = "by Lunia", size = ESSAY_TYPE.byline, color = ESSAY_COLORS.ink, style }: { text?: string; size?: number; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: ESSAY_SCRIPT, fontWeight: 600, fontSize: size, lineHeight: 1, color, transform: "rotate(-2deg)", transformOrigin: "left bottom", ...style }}>
      {text}
    </div>
  );
}

/** The headline with one word boxed. `emphasis` must be an exact substring
 *  of `text` (the generator and the route guarantee that); anything else
 *  renders the text plain. Box breaks are cloned so a two-word phrase that
 *  wraps keeps its fill on both lines. */
export function BoxedHeadline({ text, emphasis, fill, onFill, style }: { text: string; emphasis?: string; fill: string; onFill: string; style?: CSSProperties }) {
  const base: CSSProperties = { fontFamily: ESSAY_DISPLAY, fontWeight: 400, textTransform: "uppercase", lineHeight: 0.98, letterSpacing: "0.005em", ...style };
  const at = emphasis ? text.toLowerCase().indexOf(emphasis.toLowerCase()) : -1;
  if (!emphasis || at < 0) return <div style={base}>{text}</div>;
  const before = text.slice(0, at), word = text.slice(at, at + emphasis.length), after = text.slice(at + emphasis.length);
  return (
    <div style={base}>
      {before}
      {/* inline-block with line-height 1 so the box is one em tall and cannot
          paint over the descent of the line above; the headline's 0.98 line
          pitch is tighter than Anton's content area. */}
      <span style={{ display: "inline-block", lineHeight: 1, background: fill, color: onFill, padding: "0 0.12em", verticalAlign: "baseline" }}>{word}</span>
      {after}
    </div>
  );
}

/** Body text with one phrase in the accent colour. */
export function EmphasisText({ text, emphasis, color }: { text: string; emphasis?: string; color: string }) {
  const at = emphasis ? text.indexOf(emphasis) : -1;
  if (!emphasis || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span style={{ color, fontWeight: 500 }}>{emphasis}</span>
      {text.slice(at + emphasis.length)}
    </>
  );
}

/** A stable three-digit essay number from any seed (the carousel id or the
 *  topic) until numbering is persisted. */
export function essayNumberFrom(seed: string | undefined): string {
  let h = 7;
  for (const ch of seed ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String((h % 900) + 100);
}

/** DD.MM.YY, the way a print colophon dates itself. */
export function essayDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

/** The essay cover: the hook on paper. Serial chrome top, the boxed
 *  headline over the subline, the illustration (when there is one) printed
 *  onto the paper with multiply so a white-ground engraving needs no cutout,
 *  and the signature bottom-left. The headline sits above the illustration
 *  in the stacking order so the picture breaks through the words. */
export function EssayHookCover({ headline, subline, sourceNote, emphasis, accent: accentId, imageUrl, shimmer, slideH, reels, essayNumber, date, handle = "@lunia_life", showSourceNote = true }: {
  headline: string; subline?: string; sourceNote?: string; emphasis?: string; accent?: EssayAccent; imageUrl?: string; shimmer?: boolean;
  slideH: number; reels?: boolean; essayNumber: string; date: string; handle?: string; showSourceNote?: boolean;
}) {
  const accent = essayAccent(accentId);
  const compact = slideH < 1350 ? slideH / 1350 : 1;
  const chars = headline.trim().length;
  const size = Math.round((chars <= 18 ? ESSAY_TYPE.coverHeadline : chars <= 32 ? 124 : chars <= 44 ? 108 : 94) * compact * (reels ? 1.06 : 1));
  const top = Math.round((reels ? 300 : 210) * compact);
  return (
    <>
      <PaperTexture />
      <ChromeRow top={Math.round(ESSAY_PAD.y * compact)} left={<>N&deg; <span style={{ color: accent.text }}>01</span> &mdash; ESSAY {essayNumber}</>} right={date} />
      {imageUrl ? (
        <img
          src={imageUrl}
          crossOrigin="anonymous"
          alt=""
          style={{ position: "absolute", left: 0, right: 0, bottom: Math.round(150 * compact), margin: "0 auto", width: "78%", height: `${Math.round(slideH * 0.5)}px`, objectFit: "contain", objectPosition: "center bottom", mixBlendMode: "multiply", opacity: 0.94, display: "block" }}
        />
      ) : shimmer ? (
        <div style={{ position: "absolute", left: "11%", right: "11%", bottom: Math.round(150 * compact), height: Math.round(slideH * 0.42), background: "linear-gradient(90deg, rgba(16,38,53,0.03) 0%, rgba(16,38,53,0.08) 50%, rgba(16,38,53,0.03) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.6s ease-in-out infinite" }} />
      ) : null}
      <div style={{ position: "absolute", left: ESSAY_PAD.x, right: ESSAY_PAD.x, top, display: "flex", flexDirection: "column", gap: Math.round(34 * compact) }}>
        <BoxedHeadline text={headline} emphasis={emphasis} fill={accent.fill} onFill={accent.onFill} style={{ fontSize: size, color: ESSAY_COLORS.ink, maxWidth: "94%" }} />
        {subline && (
          <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: Math.round(ESSAY_TYPE.coverSubline * compact), lineHeight: 1.35, color: ESSAY_COLORS.ink, maxWidth: "88%" }}>
            {subline}
          </div>
        )}
        {showSourceNote && sourceNote && (
          <div style={{ ...chromeStyle, whiteSpace: "normal", letterSpacing: "0.16em", fontSize: Math.round(20 * compact) }}>{sourceNote}</div>
        )}
      </div>
      <Byline style={{ position: "absolute", left: ESSAY_PAD.x, bottom: Math.round(92 * compact) }} size={Math.round(ESSAY_TYPE.byline * compact)} />
      <div style={{ ...chromeStyle, position: "absolute", right: ESSAY_PAD.x, bottom: Math.round(96 * compact) }}>{handle.toUpperCase()}</div>
      <ProgressRule index={1} total={10} accent={accent.fill} />
    </>
  );
}
