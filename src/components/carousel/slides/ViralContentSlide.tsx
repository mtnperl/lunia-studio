"use client";
// Viral preset content slide. Built for retention, not for reading: one
// figure or one hero line, two to four short stacked lines, a highlighted
// phrase, and the open-loop line marked in Signal Yellow at the bottom so
// the reason to swipe is seen before it is read. Ivory or navy per slot
// (VIRAL_SLOTS.tone) so a deck has rhythm instead of ten identical cards.
// Logo stays on the hook and the CTA only; the citation is one small line.
import { useCallback, useState } from "react";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import FitBox from "@/components/carousel/shared/FitBox";
import type { BrandStyle, CarouselStylePreset } from "@/lib/types";
import { parseGraphicSpec } from "@/lib/carousel-utils";
import { renderGraphicSpec } from "@/components/carousel/graphics/graphicComponentMap";
import { SLIDE, BRAND_FONT_FAMILY } from "@/lib/brand-tokens";
import { VIRAL_COLORS, viralSlotFor } from "@/lib/carousel-style-presets";
import { viralTypeScale } from "@/lib/viral-type";
import type { SlideElement } from "@/lib/slide-elements";
import { pickableStyle, editableProps, editingStyle } from "@/lib/slide-elements";

const SLIDE_H = SLIDE.height;
const PAD = SLIDE.editorialPad;
const FONT = BRAND_FONT_FAMILY;

type Props = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string;
  /** One sourced figure drawn as the visual, e.g. "40%". */
  figure?: string;
  /** Exact substring of body to highlight. Skipped when it no longer matches. */
  emphasis?: string;
  /** 0-based index among the content slides, and how many there are. */
  slideIndex?: number;
  slideTotal?: number;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  reels?: boolean;
  frameH?: number;
  headlineScale?: number;
  bodyScale?: number;
  /** Accepted for call-site parity; the viral ladder sets its own citation size. */
  citationFontSize?: number;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  onSelectElement?: (element: SlideElement) => void;
  selectedElement?: SlideElement | null;
  editingElement?: SlideElement | null;
  onBeginEditElement?: (element: SlideElement) => void;
  onCommitElement?: (element: SlideElement, value: string) => void;
  onCancelEditElement?: () => void;
  // Accepted for call-site parity with the other content slides; unused.
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  bgImageUrl?: string;
  bgImageShimmer?: boolean;
  bgImageOverlayOpacity?: number;
  iconScale?: number;
  stylePreset?: CarouselStylePreset;
};

/** Body copy as lines. Newlines win; a single paragraph splits on sentences. */
export function viralLines(body: string): string[] {
  const raw = body.includes("\n") ? body.split(/\n+/) : body.split(/(?<=[.!?])\s+/);
  return raw.map((l) => l.trim()).filter(Boolean);
}

function withEmphasis(line: string, emphasis: string | undefined, style: React.CSSProperties): React.ReactNode {
  if (!emphasis) return line;
  const at = line.indexOf(emphasis);
  if (at < 0) return line;
  return (
    <>
      {line.slice(0, at)}
      <span style={style}>{emphasis}</span>
      {line.slice(at + emphasis.length)}
    </>
  );
}

export default function ViralContentSlide({
  headline, body, citation, graphic, figure, emphasis,
  slideIndex = 0, slideTotal = 3,
  scale = 1, id, brandStyle, reels = false, frameH,
  headlineScale = 1, bodyScale = 1,
  showSlideArrows = true, showSlideNumbers = true, showCitationBars = true,
  showLuniaLifeWatermark = false, prominentWatermark = false,
  onSelectElement, selectedElement = null, editingElement = null,
  onBeginEditElement, onCommitElement, onCancelEditElement,
  arrowScale = 1,
}: Props) {
  const pick = (element: SlideElement) =>
    onSelectElement
      ? {
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); onSelectElement(element); },
          style: { ...pickableStyle(element, selectedElement, true), ...editingStyle(editingElement === element) },
          ...(onBeginEditElement && onCommitElement && onCancelEditElement
            ? editableProps(element, editingElement === element, {
                onBeginEdit: onBeginEditElement, onCommit: onCommitElement, onCancel: onCancelEditElement,
                multiline: element === "body",
              })
            : {}),
        }
      : { style: {} as React.CSSProperties };

  const slot = viralSlotFor(slideIndex, slideTotal);
  const navy = slot.tone === "navy";
  const bg = navy ? VIRAL_COLORS.navy : VIRAL_COLORS.ivory;
  const ink = navy ? VIRAL_COLORS.ivory : VIRAL_COLORS.navy;
  const muted = navy ? "rgba(247,244,239,0.62)" : VIRAL_COLORS.slate;
  const yellow = VIRAL_COLORS.yellow;
  // The highlight: yellow type on navy, a yellow marker band on ivory. Both
  // pairings clear 4.5:1 (11.3 and 11.2).
  const emphasisStyle: React.CSSProperties = navy
    ? { color: yellow, fontWeight: 600 }
    : { background: yellow, color: VIRAL_COLORS.deepNavy, fontWeight: 600, padding: "0 0.12em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" };

  const slideH = frameH ?? (reels ? SLIDE_H.reels : SLIDE_H.carousel);
  const py = reels ? 200 : PAD.y;

  const lines = viralLines(body);
  const loop = lines.length > 1 ? lines[lines.length - 1] : "";
  const support = lines.length > 1 ? lines.slice(0, -1) : lines;
  const editingBody = editingElement === "body";

  // One ladder, computed from what is actually on the slide, so exactly one
  // element leads and every rank below it is a clear step down.
  const type = viralTypeScale({
    figure, headline, supportLines: support, frameH: slideH,
    baseH: SLIDE_H.carousel, headlineScale, bodyScale,
  });

  // Infographic on the slots that allow one, drawn in the slide's own ink.
  const spec = parseGraphicSpec(graphic);
  const [dropped, setDropped] = useState(false);
  const onDrop = useCallback(() => setDropped(true), []);
  const graphicStyle: BrandStyle = {
    background: bg, hookBackground: bg, headline: ink, hookHeadline: ink, body: ink,
    accent: navy ? yellow : (brandStyle?.accent ?? VIRAL_COLORS.navy), secondary: muted,
  };
  const citationReserve = showCitationBars && citation ? Math.round(type.citationSize * 1.4) + 24 : 0;

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg }}>
      {/* Kicker: slide position, so the reader knows how much is left. */}
      {showSlideNumbers && (
        <div style={{ position: "absolute", top: py, left: PAD.x, fontFamily: FONT, fontWeight: 600, fontSize: 22, letterSpacing: "0.16em", color: muted }}>
          {String(slideIndex + 2).padStart(2, "0")} / {String(slideTotal + 2).padStart(2, "0")}
        </div>
      )}

      {/* Three zones, not one long stack. The lead block sits in the optical
          centre of the column instead of clustering at the top and leaving a
          dead band above the footer, which is what made every slide read the
          same regardless of how much copy it carried. */}
      <div style={{
        position: "absolute", top: py + 72, left: PAD.x, right: PAD.x, bottom: py + citationReserve,
        display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24, overflow: "hidden",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: type.blockGap, marginTop: "auto", marginBottom: "auto", minHeight: 0 }}>
          {type.figureLeads && figure && (
            <div style={{ fontFamily: FONT, fontWeight: 300, fontSize: type.figureSize, lineHeight: 0.92, letterSpacing: "-0.04em", color: navy ? yellow : ink }}>
              {figure}
            </div>
          )}
          <h1 {...pick("headline")} style={{
            margin: 0, fontFamily: FONT,
            // A headline that leads is the loudest thing on the slide; under a
            // figure it is a deck line, so it drops a weight as well as a size.
            fontWeight: type.figureLeads ? 500 : 600,
            fontSize: type.headlineSize, lineHeight: 1.04, letterSpacing: "-0.025em", color: ink,
            ...pick("headline").style,
          }}>
            {headline}
          </h1>

          <div {...pick("body")} style={{ display: "flex", flexDirection: "column", gap: type.lineGap, marginTop: 4, ...pick("body").style }}>
            {(editingBody ? lines : support).map((line, i) => (
              <div key={i} style={{ fontFamily: FONT, fontWeight: 400, fontSize: type.lineSize, lineHeight: 1.24, color: ink, opacity: navy ? 0.92 : 1 }}>
                {editingBody ? line : withEmphasis(line, emphasis, emphasisStyle)}
              </div>
            ))}
          </div>

          {spec && !dropped && (
            <div {...pick("graphic")} style={{ flex: "0 1 auto", minHeight: 0, maxHeight: SLIDE.graphicMaxHeight.carousel, display: "flex", width: "100%", justifyContent: "flex-start", marginTop: 8, ...pick("graphic").style }}>
              <div style={{ width: "100%", maxWidth: 760, height: "100%" }}>
                <FitBox align="center" onDrop={onDrop}>{renderGraphicSpec(spec, graphicStyle)}</FitBox>
              </div>
            </div>
          )}
        </div>

        {/* Footer: the reason to swipe, under a short yellow rule. */}
        {loop && !editingBody && (
          <div style={{ flex: "0 0 auto", paddingTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ width: 56, height: 4, background: yellow }} />
            <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: type.loopSize, lineHeight: 1.25, color: navy ? yellow : ink }}>
              {loop}
            </div>
          </div>
        )}
      </div>

      {showCitationBars && citation && (
        <div {...pick("citation")} style={{
          position: "absolute", left: PAD.x, right: PAD.x, bottom: py - 8,
          fontFamily: FONT, fontWeight: 400, fontSize: type.citationSize, lineHeight: 1.4, color: muted,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          ...pick("citation").style,
        }}>
          {citation}
        </div>
      )}

      {showSlideArrows && <ArrowIcons color={muted} sizeScale={arrowScale} />}

      {showLuniaLifeWatermark && (
        <div style={{
          position: "absolute", bottom: prominentWatermark ? 28 : 22, left: 0, right: 0, textAlign: "center",
          fontFamily: FONT, fontWeight: 500, fontSize: prominentWatermark ? 18 : 14, letterSpacing: "0.3em", textTransform: "uppercase",
          color: ink, opacity: prominentWatermark ? 0.45 : 0.18, pointerEvents: "none", userSelect: "none",
        }}>LUNIA LIFE</div>
      )}
    </SlideWrapper>
  );
}
