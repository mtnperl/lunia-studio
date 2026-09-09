"use client";

// Client half of the headless slide-render page. Renders the REAL carousel
// content slide (default or editorial preset) at 1:1 scale, then runs a
// deterministic settle-and-fit loop:
//
//   1. Wait for web fonts (display=block, so nothing paints with fallback
//      metrics) and for every <img> to decode.
//   2. Measure: any element whose border box escapes the slide bounds, or any
//      overflow-hidden element clipping its content, counts as a violation.
//   3. If violations exist, step the headline/body scale down 7% and re-measure
//      (floor 0.55×). FitBox handles graphics; this loop handles text.
//   4. Publish window.__SLIDE_FIT and set window.__SLIDE_READY = true.
//
// The Puppeteer route (api/carousel-v2/render-slide) waits on __SLIDE_READY
// before screenshotting — so unlike the old Remotion renderStill path, the
// capture can never race font loading or FitBox's second-pass scale-down.
import { useEffect, useRef, useState } from "react";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import EditorialContentSlide from "@/components/carousel/slides/EditorialContentSlide";
import FreePressContentSlide from "@/components/carousel/slides/FreePressContentSlide";
import ViralContentSlide from "@/components/carousel/slides/ViralContentSlide";
import EssayContentSlide from "@/components/carousel/slides/EssayContentSlide";
import EssayTakeawaySlide from "@/components/carousel/slides/EssayTakeawaySlide";
import HookSlide from "@/components/carousel/slides/HookSlide";
import DidYouKnowSlide from "@/components/carousel/slides/DidYouKnowSlide";
import BillboardContentSlide from "@/components/carousel/slides/BillboardContentSlide";
import BillboardTakeawaySlide from "@/components/carousel/slides/BillboardTakeawaySlide";
import { FP_COLORS, ESSAY_COLORS, DYK_COLORS, BILLBOARD_COLORS, type EssayAccent } from "@/lib/brand-tokens";
import { SLIDE } from "@/lib/brand-tokens";
import type { BillboardPillar, BrandStyle, CarouselStylePreset, DidYouKnowSlideContent, DidYouKnowTreatment } from "@/lib/types";
import { isEditorialPreset } from "@/lib/carousel-style-presets";

export type RenderSlideProps = {
  headline: string;
  body: string;
  citation: string;
  graphic?: string;
  graphicImageUrl?: string;
  bgImageUrl?: string;
  brandStyle?: BrandStyle;
  slideBgColor?: string;
  darkBackground?: boolean;
  citationFontSize?: number;
  reels?: boolean;
  headlineScale?: number;
  bodyScale?: number;
  logoScale?: number;
  arrowScale?: number;
  stylePreset?: CarouselStylePreset;
  /** Which slide to draw. Content by default; "hook" and "takeaway" render
   *  the deck's first and last slides so the visual suite covers them too.
   *  "did_you_know" draws one slide of the frozen two-slide format from
   *  `dyk`, so that format is in the suite as well. */
  kind?: "content" | "hook" | "takeaway" | "did_you_know";
  dyk?: DidYouKnowSlideContent;
  dykIndex?: 1 | 2;
  didYouKnowTreatment?: DidYouKnowTreatment;
  paperGrain?: number;
  paperVignette?: number;
  subline?: string;
  sourceNote?: string;
  backgroundImageUrl?: string;
  points?: string[];
  interaction?: { type: "save" | "send" | "comment"; label: string };
  followLine?: string;
  emphasis?: string;
  /** Essay: the boxed word of the headline. Absent: auto. "": none. */
  headlineEmphasis?: string;
  essayAccent?: EssayAccent;
  essayNumber?: string;
  essayDate?: string;
  /** Billboard: the lit corner. Paper comes from paperGrain / paperVignette. */
  pillar?: BillboardPillar;
  slideIndex?: number;
  slideTotal?: number;
  showSlideArrows?: boolean;
  showSlideNumbers?: boolean;
  showCitationBars?: boolean;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
};

type FitReport = {
  settled: boolean;
  fitScale: number;
  iterations: number;
  overflows: { tag: string; text: string; by: number }[];
  clipped: number;
};

declare global {
  interface Window {
    __SLIDE_READY?: boolean;
    __SLIDE_FIT?: FitReport;
  }
}

const FIT_STEP = 0.93;
const FIT_FLOOR = 0.55;
const TOLERANCE = 1.5; // px — subpixel rounding is not a violation

function nextFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Everything painting outside the slide box or clipped by an overflow-hidden
 *  ancestor. SlideWrapper's own two wrapper divs are exempt (they ARE the
 *  bounds), as is FitBox's measuring inner (it translates via transform). */
function measureViolations(root: HTMLElement, w: number, h: number): Pick<FitReport, "overflows" | "clipped"> {
  const rootRect = root.getBoundingClientRect();
  const overflows: FitReport["overflows"] = [];
  let clipped = 0;
  const els = root.querySelectorAll<HTMLElement>("*");
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const by = Math.max(
      rootRect.left - r.left,
      r.right - (rootRect.left + w),
      rootRect.top - r.top,
      r.bottom - (rootRect.top + h),
    );
    if (by > TOLERANCE) {
      overflows.push({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent ?? "").trim().slice(0, 60),
        by: Math.round(by * 10) / 10,
      });
    }
    // Clip detection must be transform-aware: FitBox shrinks its child with a
    // CSS transform, so scrollHeight (pre-transform layout) legitimately
    // exceeds clientHeight even though nothing is visually cut. Compare the
    // POST-transform bounding rects of direct descendants against the clipping
    // box's own rect instead — a child painted past the box edge is truly cut.
    const style = getComputedStyle(el);
    if (style.overflow === "hidden" || style.overflowY === "hidden" || style.overflowX === "hidden") {
      const box = el.getBoundingClientRect();
      for (const child of Array.from(el.children)) {
        const c = child.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) continue;
        const cut = Math.max(
          box.left - c.left,
          c.right - box.right,
          box.top - c.top,
          c.bottom - box.bottom,
        );
        if (cut > TOLERANCE) {
          clipped += 1;
          break;
        }
      }
    }
  }
  return { overflows, clipped };
}

export default function RenderSlideClient(props: RenderSlideProps) {
  const [fitScale, setFitScale] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const iterations = useRef(0);
  const slideH = props.reels ? SLIDE.height.reels : SLIDE.height.carousel;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await document.fonts.ready;
      const root = rootRef.current;
      if (!root || cancelled) return;
      // Decode every image (bg photos, AI graphics) before measuring.
      await Promise.allSettled(
        Array.from(root.querySelectorAll("img")).map((img) =>
          img.complete ? Promise.resolve() : img.decode().catch(() => {}),
        ),
      );
      // Two frames: one for FitBox's ResizeObserver pass, one for its re-render.
      await nextFrame();
      await nextFrame();
      if (cancelled) return;

      const { overflows, clipped } = measureViolations(root, SLIDE.width, slideH);
      const bad = overflows.length > 0 || clipped > 0;
      if (bad && fitScale * FIT_STEP >= FIT_FLOOR) {
        iterations.current += 1;
        setFitScale((s) => s * FIT_STEP); // re-runs this effect
        return;
      }
      window.__SLIDE_FIT = {
        settled: !bad,
        fitScale,
        iterations: iterations.current,
        overflows,
        clipped,
      };
      window.__SLIDE_READY = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [fitScale, slideH]);

  const paperProp = props.paperGrain !== undefined || props.paperVignette !== undefined ? { grain: props.paperGrain, vignette: props.paperVignette } : undefined;
  const scaled = {
    ...props,
    headlineScale: (props.headlineScale ?? 1) * fitScale,
    bodyScale: (props.bodyScale ?? 1) * fitScale,
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: SLIDE.width,
        height: slideH,
        overflow: "hidden",
        background:
          props.slideBgColor ??
          (props.kind === "did_you_know" ? DYK_COLORS.paper : props.stylePreset === "free-press" ? FP_COLORS.paper : props.stylePreset === "essay" ? ESSAY_COLORS.paper : props.stylePreset === "billboard" ? BILLBOARD_COLORS.paper : "#01253f"),
      }}
    >
      {props.kind === "did_you_know" && props.dyk ? (
        <DidYouKnowSlide
          slide={props.dyk}
          index={props.dykIndex ?? 1}
          treatment={props.didYouKnowTreatment}
          paper={props.paperGrain !== undefined || props.paperVignette !== undefined ? { grain: props.paperGrain, vignette: props.paperVignette } : undefined}
          scale={1}
        />
      ) : props.kind === "hook" ? (
        <HookSlide {...scaled} subline={props.subline ?? ""} paper={paperProp} scale={1} />
      ) : props.kind === "takeaway" && props.stylePreset === "billboard" ? (
        <BillboardTakeawaySlide {...scaled} paper={paperProp} points={props.points ?? []} interaction={props.interaction ?? { type: "save", label: "" }} scale={1} />
      ) : props.stylePreset === "billboard" ? (
        <BillboardContentSlide {...scaled} paper={paperProp} scale={1} />
      ) : props.kind === "takeaway" && props.stylePreset === "essay" ? (
        <EssayTakeawaySlide {...scaled} points={props.points ?? []} interaction={props.interaction ?? { type: "save", label: "" }} scale={1} />
      ) : props.stylePreset === "essay" ? (
        <EssayContentSlide {...scaled} scale={1} />
      ) : props.stylePreset === "free-press" ? (
        <FreePressContentSlide {...scaled} scale={1} />
      ) : props.stylePreset === "viral" ? (
        <ViralContentSlide {...scaled} scale={1} />
      ) : isEditorialPreset(props.stylePreset) ? (
        <EditorialContentSlide {...scaled} scale={1} />
      ) : (
        <ContentSlide {...scaled} scale={1} />
      )}
    </div>
  );
}
