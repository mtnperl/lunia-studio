// Carousel slide fixtures for the visual-regression harness.
//
// Coverage goal: the input variables that historically caused out-of-bounds
// renders — headline length, body length, graphic type, and preset. Each case
// is a full render-slide prop payload. Add a case here whenever a new overflow
// bug is found so the baseline locks the fix in.
import type { GraphicSpec } from "@/lib/types";

export type SlideFixture = {
  name: string;
  props: Record<string, unknown>;
};

const g = (spec: GraphicSpec) => JSON.stringify(spec);
// iconLayout is parsed by the slides directly, not through the GraphicSpec Zod
// union, so it needs a loosely-typed serializer.
const gRaw = (spec: Record<string, unknown>) => JSON.stringify(spec);

export const CAROUSEL_FIXTURES: SlideFixture[] = [
  {
    name: "editorial-short-stat",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Melatonin receptors live in your mitochondria",
      body: "Sleep is only half of what this hormone does.",
      citation: "Reiter et al., Journal of Pineal Research, 2023",
      graphic: g({ component: "stat", data: { stat: "2x", label: "more antioxidant activity in mitochondria than in blood plasma" } }),
    },
  },
  {
    name: "editorial-long-headline-long-body-bars",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Why cold showers before bed can quietly backfire and keep your nervous system wired for hours",
      body: "The spike you cannot see is the problem. A cold plunge before bed triggers a sharp noradrenaline release, elevates core temperature on the rebound, and delays the natural evening dip your body relies on to fall asleep. For some people this shows up as lying awake, alert, and frustrated long after the lights go out.",
      citation: "Buijze et al., PLoS ONE 2016; Tipton et al., Experimental Physiology 2017",
      graphic: g({ component: "bars", data: { items: [
        { label: "Core temp rebound", value: "+0.5C" },
        { label: "Noradrenaline", value: "+530%" },
        { label: "Sleep onset delay", value: "+38min" },
      ] } }),
    },
  },
  {
    name: "default-medium-donut",
    props: {
      stylePreset: "default",
      headline: "Most magnesium never reaches your bloodstream",
      body: "Oxide forms are cheap but poorly absorbed. Bisglycinate is chelated for uptake, which is why the form on the label matters more than the milligrams.",
      citation: "Walker et al., Magnesium Research, 2019",
      graphic: g({ component: "donut", data: { value: "43%", label: "of oral magnesium oxide is actually absorbed", sublabel: "vs 80% for bisglycinate" } }),
    },
  },
  {
    name: "default-long-body-no-graphic",
    props: {
      stylePreset: "default",
      headline: "The wind-down window",
      body: "Your body starts preparing for sleep about two hours before you feel tired. Core temperature begins to fall, melatonin rises, and cortisol should be near its daily low. Bright light, late meals, and intense exercise all push against this shift, which is why the hour before bed does more for your sleep than anything you do once you are lying down. Protect it deliberately.",
      citation: "Czeisler & Gooley, Cold Spring Harbor Symposia, 2007",
    },
  },
  {
    name: "editorial-timeline-many-events",
    props: {
      stylePreset: "editorial-scientific",
      headline: "One night of magnesium, hour by hour",
      body: "What actually happens after you take it.",
      citation: "Internal cohort, Lunia Life, 2025",
      graphic: g({ component: "timeline", data: { events: [
        { time: "T+30m", label: "Theanine crosses the blood-brain barrier" },
        { time: "T+1h", label: "Alpha-wave activity rises" },
        { time: "T+2h", label: "Core temperature begins its dip" },
        { time: "T+4h", label: "First deep-sleep cycle lengthens" },
        { time: "T+6h", label: "Overnight cortisol stays suppressed" },
        { time: "T+8h", label: "Wake with lower resting heart rate" },
      ] } }),
    },
  },
  {
    name: "default-reels-stat",
    props: {
      stylePreset: "default",
      reels: true,
      headline: "Apigenin binds the same receptor as benzodiazepines",
      body: "It is the compound in chamomile that makes the tea feel calming. Gentler, non-habit-forming, and clinically dosed at 50mg.",
      citation: "Salgueiro et al., Phytomedicine, 2016",
      graphic: g({ component: "stat", data: { stat: "50mg", label: "clinical apigenin dose per serving" } }),
    },
  },
  {
    // Locks in the editorial restyle of conceptFlow (hairline cards, uppercase
    // Inter labels, chevron connectors, featured first node).
    name: "editorial-conceptflow-restyled",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Your cellular clock runs on NAD+",
      body: "NAD+ powers the enzymes that keep your circadian rhythm on time. As it falls, this feedback loop weakens and sleep wake timing drifts.",
      citation: "Yoshino J, et al. Cell Metabolism. 2018;27(3):513-528.",
      graphic: g({ component: "conceptFlow", data: { nodes: [
        { label: "NAD+", sublabel: "cellular fuel" },
        { label: "SIRT1", sublabel: "clock regulator" },
        { label: "BMAL1/CLOCK", sublabel: "sleep-wake timing" },
      ] } }),
    },
  },
  {
    // Locks in the icon-size control at XL (1.6×) — regression guard for the
    // iconScale plumbing through the editorial IconBlock.
    name: "editorial-iconlayout-xl",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Three signals that you slept deeply",
      body: "Your body leaves clues. These three are the ones worth tracking.",
      citation: "Lunia Life, 2025",
      iconScale: 1.6,
      graphic: gRaw({ component: "iconLayout", data: {
        icons: [{ id: "moon" }, { id: "bed" }, { id: "stars" }],
        showLabels: true,
        iconRowPosition: "hug-body",
      } }),
    },
  },
];
