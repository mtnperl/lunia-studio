// Shared pieces of the Billboard preset: the four corner labels, the outlined
// watermark, the thin-over-heavy headline pair, the progress rule and the
// cover itself. Colour and sizes live in brand-tokens (BILLBOARD_*).
//
// Only ink and paper. The deck's pillar is lit in full navy, the other three
// corners sit at 55%, and the watermark is a stroke with no fill.

import type { CSSProperties } from "react";
import { PaperTexture } from "@/components/carousel/shared/EssayChrome";
import {
  BILLBOARD_COLORS as C, BILLBOARD_FONTS as F, BILLBOARD_TYPE as T, BILLBOARD_LAYOUT as L, BILLBOARD_PILLARS, BILLBOARD_LINE_MAX,
  PAPER_DEFAULTS, SLIDE, type PaperSettings,
} from "@/lib/brand-tokens";
import type { BillboardPillar } from "@/lib/types";

export const DEFAULT_PILLAR: BillboardPillar = "Sleep";

export function billboardPaper(paper?: Partial<PaperSettings>): PaperSettings {
  return { grain: paper?.grain ?? PAPER_DEFAULTS.billboard.grain, vignette: paper?.vignette ?? PAPER_DEFAULTS.billboard.vignette };
}

/** Where the heavy line starts. A chosen phrase wins when it is still in
 *  the text; otherwise the last two words of a four-word-plus headline, or
 *  the last word. The thin line is everything before it. */
export function splitHeavy(text: string, chosen?: string): { thin: string; heavy: string } {
  const t = text.trim();
  if (chosen === "") return { thin: t, heavy: "" };
  if (chosen) {
    const at = t.toLowerCase().indexOf(chosen.toLowerCase());
    if (at >= 0) return { thin: t.slice(0, at).trim(), heavy: t.slice(at).trim() };
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2) return { thin: "", heavy: t };
  const n = words.length >= 4 ? 2 : 1;
  return { thin: words.slice(0, -n).join(" "), heavy: words.slice(-n).join(" ") };
}

const cornerStyle: CSSProperties = {
  position: "absolute",
  fontFamily: F.thin,
  fontWeight: 500,
  fontSize: T.corner,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  lineHeight: 1,
};

/** The four corners. `override` swaps a corner's text (the counter, the
 *  handle) while the lit pillar keeps its place. */
export function Corners({ pillar, override, slideH }: { pillar: BillboardPillar; override?: Partial<Record<0 | 1 | 2 | 3, string>>; slideH: number }) {
  const pos: CSSProperties[] = [
    { top: L.cornerY, left: L.padX },
    { top: L.cornerY, right: L.padX },
    { top: slideH - L.cornerY - T.corner, left: L.padX },
    { top: slideH - L.cornerY - T.corner, right: L.padX },
  ];
  return (
    <>
      {BILLBOARD_PILLARS.map((p, i) => {
        const text = override?.[i as 0 | 1 | 2 | 3] ?? p;
        const lit = text === p && p === pillar;
        return (
          <div key={p} style={{ ...cornerStyle, ...pos[i], color: lit ? C.ink : C.inkMuted }}>{text}</div>
        );
      })}
    </>
  );
}

/** Corners for the body slides: the deck's pillar lit top-left, the counter
 *  top-right, the handle bottom-left. The lit pillar is never hidden behind
 *  the counter, whichever pillar the deck has. */
export function ContentCorners({ pillar, counter, slideH }: { pillar: BillboardPillar; counter: string; slideH: number }) {
  const bottomY = slideH - L.cornerY - T.corner;
  return (
    <>
      <div style={{ ...cornerStyle, top: L.cornerY, left: L.padX, color: C.ink }}>{pillar}</div>
      <div style={{ ...cornerStyle, top: L.cornerY, right: L.padX, color: C.inkMuted, fontVariantNumeric: "tabular-nums" }}>{counter}</div>
      <div style={{ ...cornerStyle, top: bottomY, left: L.padX, color: C.inkMuted }}>lunialife.com</div>
    </>
  );
}

/** "LUNIA", stroke only. `top` is the band's top edge at the 1350 frame. */
export function Watermark({ top, opacity = 1, size = T.watermark }: { top: number; opacity?: number; size?: number }) {
  return (
    <div aria-hidden style={{
      position: "absolute", left: 0, right: 0, top,
      textAlign: "center", fontFamily: F.watermark, fontSize: size, lineHeight: 1, letterSpacing: "0.06em",
      color: "transparent", WebkitTextStroke: `4px ${C.watermark}`, opacity, pointerEvents: "none",
      userSelect: "none",
    }}>LUNIA</div>
  );
}

/** Average advance per uppercase character, in ems, for each face at its
 *  tracking. Inter light with 0.14em tracking runs wide; Archivo Narrow
 *  bold runs narrow. Used to size a line to the column before it is drawn,
 *  so neither line wraps and a long line steps down instead. */
const ADVANCE_EM = { thin: 0.80, heavy: 0.54 } as const;
const COLUMN_W = SLIDE.width - 2 * L.padX;

function fitLine(text: string, base: number, face: keyof typeof ADVANCE_EM, maxWidth: number, floor: number): number {
  const n = Math.max(1, text.length);
  const fits = Math.floor(maxWidth / (n * ADVANCE_EM[face]));
  return Math.max(floor, Math.min(base, fits));
}

/** Thin tracked line over a heavy condensed line. Each line is sized to
 *  the column from its character count, so the pair never wraps: a long
 *  thin line gets smaller, a long heavy line gets smaller, and the caps in
 *  BILLBOARD_LINE_MAX are what the generator is told to aim for. */
export function HeadlinePair({ text, heavy, thinSize, heavySize, align = "center", color = C.ink, maxWidth = COLUMN_W, style }: {
  text: string; heavy?: string; thinSize: number; heavySize: number; align?: "center" | "left"; color?: string; maxWidth?: number; style?: CSSProperties;
}) {
  const { thin, heavy: hv } = splitHeavy(text, heavy);
  const thinPx = fitLine(thin, thinSize, "thin", maxWidth, Math.round(thinSize * 0.5));
  const heavyPx = fitLine(hv, heavySize, "heavy", maxWidth, Math.round(heavySize * 0.55));
  return (
    <div style={{ textAlign: align, color, textTransform: "uppercase", maxWidth, ...style }}>
      {thin && (
        <div style={{ fontFamily: F.thin, fontWeight: 300, fontSize: thinPx, letterSpacing: "0.14em", lineHeight: 1, whiteSpace: "nowrap" }}>{thin}</div>
      )}
      {hv && (
        <div style={{ fontFamily: F.heavy, fontWeight: 700, fontSize: heavyPx, letterSpacing: "0.01em", lineHeight: 0.98, marginTop: thin ? -4 : 0, whiteSpace: "nowrap" }}>{hv}</div>
      )}
    </div>
  );
}
void BILLBOARD_LINE_MAX;

/** Two-tone rule at the foot: ink for the slides read, hairline for the rest. */
export function ProgressRule({ index, total, bottom = 130 }: { index: number; total: number; bottom?: number }) {
  const pct = total > 0 ? Math.min(1, Math.max(0, index / total)) : 0;
  return (
    <div style={{ position: "absolute", left: L.padX, right: L.padX, bottom, height: 2, background: C.inkHairline }}>
      <div style={{ width: `${pct * 100}%`, height: "100%", background: C.ink }} />
    </div>
  );
}

/** The cover. The headline pair sits above a full-bleed photo band, the
 *  subline pair below it, the watermark peeks out behind both. A missing
 *  or failed photo leaves a navy band, so the cover never shows a hole. */
export function BillboardHookCover({ headline, subline, sourceNote, heavy, pillar = DEFAULT_PILLAR, paper, imageUrl, shimmer, slideH, reels, showSourceNote = true }: {
  headline: string; subline?: string; sourceNote?: string; heavy?: string; pillar?: BillboardPillar; paper?: Partial<PaperSettings>;
  imageUrl?: string; shimmer?: boolean; slideH: number; reels?: boolean; showSourceNote?: boolean;
}) {
  const p = billboardPaper(paper);
  const bandH = reels ? L.band.reelsHeight : L.band.height;
  // Centre the band in the frame; at 1350 that is the mocked 480.
  const bandTop = Math.round((slideH - bandH) / 2 + (reels ? 0 : 65));
  const topZoneH = bandTop;
  const bottomZoneTop = bandTop + bandH;
  const bottomZoneH = slideH - bottomZoneTop;
  return (
    <>
      <PaperTexture opacity={p.grain} vignette={p.vignette} />
      <Watermark top={Math.round(bandTop - T.watermark * 0.92)} />
      <Watermark top={Math.round(bottomZoneTop + bottomZoneH * 0.02)} />

      <div style={{ position: "absolute", left: L.padX, right: L.padX, top: 0, height: topZoneH, display: "flex", alignItems: "center", justifyContent: "center", paddingTop: L.cornerY + T.corner + 20 }}>
        <HeadlinePair text={headline} heavy={heavy} thinSize={T.coverThin} heavySize={T.coverHeavy} />
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: bandTop, height: bandH, background: C.band, overflow: "hidden" }}>
        {imageUrl && (
          <img
            src={imageUrl}
            crossOrigin="anonymous"
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block", filter: "saturate(0.9)" }}
          />
        )}
        {shimmer && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(247,244,239,0) 0%, rgba(247,244,239,0.18) 50%, rgba(247,244,239,0) 100%)" }} />
        )}
        {showSourceNote && sourceNote && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, padding: `18px ${L.padX - 44}px`,
            fontFamily: F.thin, fontWeight: 400, fontSize: T.caption, color: C.paper,
            background: "linear-gradient(transparent, rgba(1,37,63,0.78))",
          }}>{sourceNote}</div>
        )}
      </div>

      <div style={{ position: "absolute", left: L.padX, right: L.padX, top: bottomZoneTop, height: bottomZoneH, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: L.cornerY + T.corner + 20 }}>
        {subline && <HeadlinePair text={subline} thinSize={T.coverThin} heavySize={T.coverHeavy} />}
      </div>

      <Corners pillar={pillar} slideH={slideH} />
    </>
  );
}

export const BILLBOARD_SLIDE_H = SLIDE.height;
