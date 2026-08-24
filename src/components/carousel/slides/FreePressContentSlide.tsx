"use client";

// Free Press content slide — the text-led body of the preset.
//
// ─── What this slide deliberately does NOT have ──────────────────────────────
// No headline. No graphic. No background image. No icon row. No slide number.
// The whole point of the layout is that one block of copy is the only thing on
// the artboard, so every control the other content slides expose would work
// against it. Those props are still ACCEPTED (see the bottom of Props) so this
// component stays drop-in compatible with the ContentSlide call sites, which
// pass ~20 props positionally-by-name across three render surfaces. They are
// accepted and ignored, not accepted and half-honoured.
//
// The slide has exactly four elements:
//   1. the Lunia mark, top left
//   2. swipe arrows, top right
//   3. the copy, optically centred
//   4. the footer: an italic source line, then the navy indicator
//
// ─── The footer is two lines, and they are not the same thing ────────────────
// The Free Press's own decks put the author's name in red and have nowhere to
// put a citation. Lunia's carousels are fact-checked, so the citation is real
// data and gets its own line: Playfair italic at half-opacity, sitting ABOVE
// the indicator. Quiet enough never to compete with the copy, present enough
// to be read.
//
// The citation line renders ONLY when there is a citation. An empty citation
// is a legitimate and expected value — the generator and the fix drafter both
// return "" rather than inventing a source — so this slide must render that
// case as an absence, not as a gap where a source should have been.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import FitBox from "@/components/carousel/shared/FitBox";
import { BrandStyle } from "@/lib/types";
import { SLIDE, FP_SERIF, FP_SANS, FP_COLORS, FP_TYPE } from "@/lib/brand-tokens";
import type { SlideElement } from "@/lib/slide-elements";
import { pickableStyle, editableProps, editingStyle } from "@/lib/slide-elements";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";

const SLIDE_H = SLIDE.height;

type Props = {
  /** Accepted for call-site compatibility. NOT rendered — see the header. */
  headline: string;
  body: string;
  citation: string;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  logoScale?: number;
  arrowScale?: number;
  citationFontSize?: number;
  reels?: boolean;
  bodyScale?: number;
  showSlideArrows?: boolean;
  /** Editor only — undefined on the export path, which then renders exactly
   *  the markup it always did. Mirrors EditorialContentSlide. */
  onSelectElement?: (element: SlideElement) => void;
  selectedElement?: SlideElement | null;
  editingElement?: SlideElement | null;
  onBeginEditElement?: (element: SlideElement) => void;
  onCommitElement?: (element: SlideElement, value: string) => void;
  onCancelEditElement?: () => void;

  // Accepted and ignored. The layout has no place for any of them, and
  // silently dropping them here is what keeps the call sites uniform.
  graphic?: string;
  bgImageUrl?: string;
  bgImageShimmer?: boolean;
  bgImageOverlayOpacity?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  headlineScale?: number;
  iconScale?: number;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  stylePreset?: string;
};

/**
 * Split the body into paragraph blocks.
 *
 * The Free Press's decks put real air between two thoughts rather than running
 * them together, and that gap is load-bearing: at 66px a single unbroken block
 * reads as a wall. A blank line in the copy is the author's paragraph break and
 * is honoured; a single newline is treated as soft wrapping and is not, because
 * the generator emits those incidentally.
 */
export function splitBodyBlocks(body: string): string[] {
  return (body ?? "")
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, " ").trim())
    .filter((b) => b.length > 0);
}

export default function FreePressContentSlide({
  body,
  citation,
  scale = 1,
  id,
  brandStyle,
  logoScale = 1,
  arrowScale = 1,
  citationFontSize,
  reels = false,
  bodyScale = 1,
  showSlideArrows = true,
  onSelectElement,
  selectedElement,
  editingElement,
  onBeginEditElement,
  onCommitElement,
  onCancelEditElement,
}: Props) {
  const slideH = reels ? SLIDE_H.reels : SLIDE_H.carousel;
  const paper = brandStyle?.background ?? FP_COLORS.paper;
  const ink = brandStyle?.body ?? FP_COLORS.ink;
  const indicator = brandStyle?.accent ?? FP_COLORS.indicator;

  const blocks = splitBodyBlocks(body);
  const bodySize = Math.round(FP_TYPE.body * bodyScale * (reels ? 1.08 : 1));
  const sourceSize = citationFontSize ?? FP_TYPE.source;
  const hasCitation = !!(citation && citation.trim());

  // Same zone-props helper as EditorialContentSlide: select on click, edit on
  // double-click, and collapse to nothing on the export path where none of the
  // editor callbacks are passed.
  const zone = (element: SlideElement) =>
    onSelectElement
      ? {
          onClick: (e: ReactMouseEvent) => { e.stopPropagation(); onSelectElement(element); },
          style: { ...pickableStyle(element, selectedElement, true), ...editingStyle(editingElement === element) },
          ...(onBeginEditElement && onCommitElement && onCancelEditElement
            ? editableProps(element, editingElement === element, {
                onBeginEdit: onBeginEditElement,
                onCommit: onCommitElement,
                onCancel: onCancelEditElement,
                multiline: element === "body",
              })
            : {}),
        }
      : { style: {} as CSSProperties };

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: paper }}>
      <LuniaLogo variant="dark" sizeScale={logoScale} placement="top-left" />
      {showSlideArrows && (
        <ArrowIcons color={brandStyle?.secondary ?? FP_COLORS.inkMuted} sizeScale={arrowScale} />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: `${reels ? 190 : 150}px ${SLIDE.pad.x + 4}px ${reels ? 150 : 110}px`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          // The copy zone and the footer must never touch. Without this gap a
          // long body fills its box exactly and the last line sits flush
          // against the citation, which reads as one run-on block rather than
          // copy plus a source. FitBox shrinks the copy to absorb the gap.
          gap: reels ? 76 : 56,
        }}
      >
        {/* The copy. FitBox scales it down rather than letting a long body
            overflow the artboard, which is the one failure this layout cannot
            absorb: there is nothing else on the slide to crop into. */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
          <FitBox align="center" maxScale={1}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: Math.round(bodySize * 0.82),
              width: "100%",
            }}
          >
            {blocks.map((block, i) => {
              // Only the first block is the editable zone: the body is ONE
              // field, and hanging a second contentEditable off the same string
              // would let two edits race to write it.
              const z = i === 0 ? zone("body") : { style: {} as CSSProperties };
              const { style: zStyle, ...zRest } = z;
              return (
                <div
                  key={i}
                  {...zRest}
                  style={{
                    fontFamily: FP_SANS,
                    fontWeight: 700,
                    fontSize: bodySize,
                    lineHeight: 1.13,
                    letterSpacing: "-0.005em",
                    color: ink,
                    textAlign: "center",
                    ...zStyle,
                  }}
                >
                  {block}
                </div>
              );
            })}
          </div>
          </FitBox>
        </div>

        {/* Footer. Source first when there is one, indicator always. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            flexShrink: 0,
          }}
        >
          {hasCitation &&
            (() => {
              const { style: zStyle, ...zRest } = zone("citation");
              return (
                <div
                  {...zRest}
                  style={{
                    fontFamily: FP_SERIF,
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: sourceSize,
                    lineHeight: 1.35,
                    color: FP_COLORS.inkMuted,
                    textAlign: "center",
                    maxWidth: "88%",
                    ...zStyle,
                  }}
                >
                  {citation}
                </div>
              );
            })()}
          <div
            style={{
              fontFamily: FP_SANS,
              fontWeight: 700,
              fontSize: FP_TYPE.indicator,
              letterSpacing: "0.17em",
              textTransform: "uppercase",
              color: indicator,
            }}
          >
            Lunia Life
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
}
