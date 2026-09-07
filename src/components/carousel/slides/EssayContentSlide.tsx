"use client";

// Essay content slide.
//
// Paper with grain, serial chrome top and bottom, a heavy condensed headline
// over a short accent rule, the body in Inter with one phrase in the accent,
// the citation as a quiet italic line, and a progress rule. No background
// image: the hook carries the one illustration a deck gets.
//
// Two readability shapes beyond the paragraph, both in the same ink and
// accent so the look stays type on paper:
//   - A LIST. Body lines that start with "- " render as numbered rows on
//     hairlines, the same rows the takeaway slide uses, under an optional
//     lead sentence. For a set: the stages of a night, the steps, the two
//     arms of a study.
//   - A FIGURE. One data graphic per deck (a bar comparison, a split, a
//     stacked bar, a hero number) drawn in ink and accent under the body.
//     It is scaled to fit and dropped rather than shrunk past legibility.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import FitBox from "@/components/carousel/shared/FitBox";
import { BrandStyle, CarouselStylePreset } from "@/lib/types";
import { SLIDE, ESSAY_COLORS, ESSAY_TEXT, ESSAY_TYPE, ESSAY_DISPLAY, type EssayAccent } from "@/lib/brand-tokens";
import type { SlideElement } from "@/lib/slide-elements";
import { pickableStyle, editableProps, editingStyle } from "@/lib/slide-elements";
import { parseGraphicSpec } from "@/lib/carousel-utils";
import { renderGraphicSpec } from "@/components/carousel/graphics/graphicComponentMap";
import { splitEssayBody } from "@/lib/essay-body";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { ESSAY_PAD, PaperTexture, ChromeRow, Counter, ProgressRule, EmphasisText, essayAccent, essayNumberFrom, essayDate } from "@/components/carousel/shared/EssayChrome";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const FIT_STEP = 0.96;
const FIT_FLOOR = 0.55;
type Props = {
  headline: string;
  body: string;
  citation: string;
  emphasis?: string;
  slideIndex?: number;
  slideTotal?: number;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  arrowScale?: number;
  citationFontSize?: number;
  reels?: boolean;
  frameH?: number;
  headlineScale?: number;
  bodyScale?: number;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  /** Essay-only. */
  essayAccent?: EssayAccent;
  essayNumber?: string;
  essayDate?: string;
  handle?: string;
  /** GraphicSpec JSON. Drawn in ink and accent under the body. */
  graphic?: string;
  onSelectElement?: (element: SlideElement) => void;
  selectedElement?: SlideElement | null;
  editingElement?: SlideElement | null;
  onBeginEditElement?: (element: SlideElement) => void;
  onCommitElement?: (element: SlideElement, value: string) => void;
  onCancelEditElement?: () => void;

  // Accepted for call-site compatibility, not drawn.
  figure?: string;
  slideTone?: "ivory" | "navy";
  graphicImageUrl?: string;
  bgImageUrl?: string;
  bgImageShimmer?: boolean;
  bgImageOverlayOpacity?: number;
  darkBackground?: boolean;
  slideBgColor?: string;
  logoScale?: number;
  iconScale?: number;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  stylePreset?: CarouselStylePreset | string;
};

export default function EssayContentSlide({
  headline, body, citation, emphasis, slideIndex = 0, slideTotal = 3,
  scale = 1, id, brandStyle, arrowScale = 1, citationFontSize, reels = false, frameH,
  headlineScale = 1, bodyScale = 1, showSlideArrows = true, showSlideNumbers = true, showCitationBars = true,
  essayAccent: accentId, essayNumber, essayDate: dateText, handle = "@lunia_life", graphic,
  onSelectElement, selectedElement, editingElement, onBeginEditElement, onCommitElement, onCancelEditElement,
}: Props) {
  const slideH = frameH ?? (reels ? SLIDE.height.reels : SLIDE.height.carousel);
  const compact = slideH < SLIDE.height.carousel ? slideH / SLIDE.height.carousel : 1;
  const accent = essayAccent(accentId);
  const ink = brandStyle?.body ?? ESSAY_COLORS.ink;
  const deckTotal = slideTotal + 2;
  const position = slideIndex + 2;
  const hasCitation = showCitationBars && !!citation?.trim();

  const headlineSize = Math.round(ESSAY_TYPE.headline * headlineScale * compact * (reels ? 1.08 : 1));
  const naturalBody = ESSAY_TYPE.body * bodyScale * compact * (reels ? 1.08 : 1);
  const fitKey = `${headline}|${body}|${graphic ?? ""}|${naturalBody}|${slideH}`;
  const [fit, setFit] = useState({ key: fitKey, v: 1 });
  const autoFit = fit.key === fitKey ? fit.v : 1;
  const bodySize = Math.round(naturalBody * autoFit);

  // The graphic, in the essay's own palette: ink for text and the quiet
  // bars, the accent for the one thing the graphic points at, paper behind.
  const graphicSpec = useMemo(() => parseGraphicSpec(graphic), [graphic]);
  const [graphicDropped, setGraphicDropped] = useState(false);
  const onGraphicDrop = useCallback(() => setGraphicDropped(true), []);
  const hasGraphic = !!graphicSpec && !graphicDropped;
  const essayPalette: BrandStyle = useMemo(() => ({
    background: ESSAY_COLORS.paper,
    hookBackground: ESSAY_COLORS.paper,
    headline: ink,
    hookHeadline: ink,
    body: ink,
    accent: accent.text,
    secondary: "rgba(16,38,53,0.28)",
  }), [ink, accent.text]);
  const graphicH = Math.round((reels ? 400 : 330) * compact);

  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const box = boxRef.current, inner = innerRef.current;
      if (!box || !inner || cancelled) return;
      if (inner.offsetHeight > box.clientHeight + 1 && autoFit > FIT_FLOOR) setFit({ key: fitKey, v: Math.max(FIT_FLOOR, autoFit * FIT_STEP) });
    };
    if (typeof document !== "undefined" && document.fonts) {
      Promise.all([document.fonts.load(`400 ${headlineSize}px "Anton"`).catch(() => {}), document.fonts.ready]).then(() => { if (!cancelled) measure(); });
    } else measure();
    return () => { cancelled = true; };
  }, [fitKey, autoFit, headlineSize, hasGraphic]);

  const zone = (element: SlideElement) =>
    onSelectElement
      ? {
          onClick: (e: ReactMouseEvent) => { e.stopPropagation(); onSelectElement(element); },
          style: { ...pickableStyle(element, selectedElement, true), ...editingStyle(editingElement === element) },
          ...(onBeginEditElement && onCommitElement && onCancelEditElement
            ? editableProps(element, editingElement === element, { onBeginEdit: onBeginEditElement, onCommit: onCommitElement, onCancel: onCancelEditElement, multiline: element === "body" })
            : {}),
        }
      : { style: {} as CSSProperties };
  const zh = zone("headline"), zb = zone("body"), zc = zone("citation"), zg = zone("graphic");
  const editingBody = editingElement === "body";

  // While the body is being edited it is one textarea, list markers and all.
  const { lead, items } = editingBody ? { lead: body, items: [] as string[] } : splitEssayBody(body);
  const isList = items.length > 0;
  const rowSize = Math.round(bodySize * 0.95);

  const top = Math.round((reels ? 200 : 168) * compact);
  const bottom = Math.round((reels ? 150 : 128) * compact);

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: ESSAY_COLORS.paper, overflow: "hidden" }}>
      <PaperTexture />
      <ChromeRow top={Math.round(ESSAY_PAD.y * compact)} left={handle.toUpperCase()} right={showSlideNumbers ? <Counter index={position} total={deckTotal} accent={accent.text} /> : undefined} />
      {showSlideArrows && <ArrowIcons color={brandStyle?.secondary ?? ESSAY_COLORS.inkMuted} sizeScale={arrowScale} />}

      <div ref={boxRef} style={{ position: "absolute", left: ESSAY_PAD.x, right: ESSAY_PAD.x, top, bottom, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div ref={innerRef} style={{ display: "flex", flexDirection: "column", gap: Math.round(bodySize * 0.9), flexShrink: 0 }}>
          <div>
            <div {...zh} style={{ fontFamily: ESSAY_DISPLAY, fontWeight: 400, fontSize: headlineSize, lineHeight: 0.98, letterSpacing: "0.005em", textTransform: "uppercase", color: ink, ...zh.style }}>
              {headline}
            </div>
            <div style={{ width: 96, height: 5, background: accent.fill, marginTop: Math.round(headlineSize * 0.3) }} />
          </div>

          <div {...zb} style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: bodySize, lineHeight: 1.42, color: ink, whiteSpace: "pre-line", ...zb.style }}>
            {editingBody ? body : (
              <>
                {lead && <div><EmphasisText text={lead} emphasis={emphasis} color={accent.text} /></div>}
                {isList && (
                  <div style={{ display: "flex", flexDirection: "column", gap: Math.round(rowSize * 0.35), marginTop: lead ? Math.round(rowSize * 0.7) : 0 }}>
                    {items.map((it, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: Math.round(rowSize * 0.6), borderTop: `1px solid ${ESSAY_COLORS.inkHairline}`, paddingTop: Math.round(rowSize * 0.4) }}>
                        <div style={{ fontFamily: ESSAY_DISPLAY, fontSize: Math.round(rowSize * 0.9), lineHeight: 1.3, color: accent.text, minWidth: Math.round(rowSize * 1.2) }}>
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: rowSize, lineHeight: 1.3, color: ink }}>
                          <EmphasisText text={it} emphasis={emphasis} color={accent.text} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {hasGraphic && graphicSpec && (
            <div {...zg} style={{ height: graphicH, width: "100%", overflow: "hidden", display: "flex", justifyContent: "center", ...zg.style }}>
              <div style={{ width: "100%", maxWidth: 820, height: "100%" }}>
                <FitBox align="center" maxScale={1.15} onDrop={onGraphicDrop}>
                  {renderGraphicSpec(graphicSpec, essayPalette)}
                </FitBox>
              </div>
            </div>
          )}

          {hasCitation && (
            <div {...zc} style={{ fontFamily: ESSAY_TEXT, fontStyle: "italic", fontWeight: 300, fontSize: citationFontSize ?? ESSAY_TYPE.citation, lineHeight: 1.35, color: ESSAY_COLORS.inkMuted, ...zc.style }}>
              {citation}
            </div>
          )}
        </div>
      </div>

      <ChromeRow bottom={Math.round(58 * compact)} left={<>ESSAY <span style={{ color: accent.text }}>&mdash;</span> {essayNumber ?? essayNumberFrom(headline)}</>} right={dateText ?? essayDate()} />
      <ProgressRule index={position} total={deckTotal} accent={accent.fill} />
    </SlideWrapper>
  );
}
