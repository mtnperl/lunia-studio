"use client";

// Essay content slide.
//
// Paper with grain, serial chrome top and bottom, a heavy condensed headline
// over a short accent rule, the body in Inter with one phrase in the accent,
// the citation as a quiet italic line, and a progress rule. No graphic and no
// background image: the essay look is type on paper, and the hook carries
// the one illustration a deck gets. The graphic props are accepted so the
// call sites stay uniform, and ignored.

import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import { BrandStyle, CarouselStylePreset } from "@/lib/types";
import { SLIDE, ESSAY_COLORS, ESSAY_TEXT, ESSAY_TYPE, type EssayAccent } from "@/lib/brand-tokens";
import type { SlideElement } from "@/lib/slide-elements";
import { pickableStyle, editableProps, editingStyle } from "@/lib/slide-elements";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  onSelectElement?: (element: SlideElement) => void;
  selectedElement?: SlideElement | null;
  editingElement?: SlideElement | null;
  onBeginEditElement?: (element: SlideElement) => void;
  onCommitElement?: (element: SlideElement, value: string) => void;
  onCancelEditElement?: () => void;

  // Accepted for call-site compatibility, not drawn.
  figure?: string;
  slideTone?: "ivory" | "navy";
  graphic?: string;
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
  essayAccent: accentId, essayNumber, essayDate: dateText, handle = "@lunia_life",
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
  const fitKey = `${headline}|${body}|${naturalBody}|${slideH}`;
  const [fit, setFit] = useState({ key: fitKey, v: 1 });
  const autoFit = fit.key === fitKey ? fit.v : 1;
  const bodySize = Math.round(naturalBody * autoFit);

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
  }, [fitKey, autoFit, headlineSize]);

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
  const zh = zone("headline"), zb = zone("body"), zc = zone("citation");
  const editingBody = editingElement === "body";

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
            <div {...zh} style={{ fontFamily: '"Anton", "Impact", "Arial Narrow", sans-serif', fontWeight: 400, fontSize: headlineSize, lineHeight: 0.98, letterSpacing: "0.005em", textTransform: "uppercase", color: ink, ...zh.style }}>
              {headline}
            </div>
            <div style={{ width: 96, height: 5, background: accent.fill, marginTop: Math.round(headlineSize * 0.3) }} />
          </div>
          <div {...zb} style={{ fontFamily: ESSAY_TEXT, fontWeight: 300, fontSize: bodySize, lineHeight: 1.42, color: ink, whiteSpace: "pre-line", ...zb.style }}>
            {editingBody ? body : <EmphasisText text={body} emphasis={emphasis} color={accent.text} />}
          </div>
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
