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
    // LEGIBILITY FLOOR — a long headline at 1.3× squeezes the graphic zone to
    // ~40px. FitBox used to scale the callout to ~0.10 (text at ~1.4px), which
    // this suite passed because nothing painted out of bounds. The graphic must
    // now be DROPPED, leaving clean space above the citation.
    name: "editorial-squeezed-graphic-dropped",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Each stage repairs something different",
      body: "N3 deep sleep triggers growth hormone release and glymphatic waste clearance. REM consolidates emotional memory and rewires neural circuits. Fragmenting either stage strips the body of a specific repair job.",
      citation: "Xie L, et al. Sleep drives metabolite clearance from the adult brain. Science. 2013;342(6156):373-377.",
      headlineScale: 1.3,
      graphic: g({ component: "callout", data: {
        text: "N3 deep sleep triggers growth hormone release and glymphatic waste clearance.",
        source: "Xie et al., Science 2013",
      } }),
    },
  },
  {
    // ROSTER CUT — a retired component on a previously-saved carousel renders
    // as nothing and the zone collapses, rather than painting the clip-art
    // vocabulary. Retired specs must keep PARSING (no crash), just not render.
    name: "editorial-retired-component-empty",
    props: {
      stylePreset: "editorial-scientific",
      headline: "Melatonin is a timing signal, not a sedative",
      body: "It tells the body when night has begun. Dosing it like a sleeping pill overshoots the signal your own pineal gland is already sending.",
      citation: "Zhdanova IV, et al. J Clin Endocrinol Metab. 2001;86(10):4727-4730.",
      graphic: g({ component: "processFlow", data: {
        steps: ["Darkness", "Pineal release", "Timing signal", "Sleep onset"],
      } }),
    },
  },
  {
    // Locks in the editorial restyle of conceptFlow (hairline cards, uppercase
    // Inter labels, chevron connectors, featured first node).
    // NOTE: conceptFlow was RETIRED in the roster cut, so this now renders as
    // no graphic. Kept as the regression guard that retired specs degrade to
    // empty instead of crashing or falling back to clip art.
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

  // ─── Free Press preset ────────────────────────────────────────────────────
  // The body slide is one block of copy and nothing else, so the failure modes
  // are narrow and specific: copy colliding with the footer, and the citation
  // line leaving a hole when it is empty. Both are locked here.
  {
    name: "freepress-two-paragraph-with-citation",
    props: {
      stylePreset: "free-press",
      // Deliberately non-empty: the preset must NOT render it. If a headline
      // ever appears in this baseline, the layout contract has broken.
      headline: "THIS HEADLINE MUST NOT RENDER",
      body: "Core body temperature drops about one degree Celsius before sleep onset, and that fall is one of the strongest cues the brain uses to start the night.\n\nA bedroom held near 18 degrees supports that drop instead of fighting it.",
      citation: "Harding EC, Franks NP, Wisden W. Front Neurosci. 2019;13:336",
    },
  },
  {
    // An empty citation is a legitimate value. The footer must close up rather
    // than leave a gap where a source would have been.
    name: "freepress-no-citation",
    props: {
      stylePreset: "free-press",
      headline: "",
      body: "Most people blame the wake-up on stress. The more ordinary explanation is that the second half of the night is lighter sleep by design.",
      citation: "",
    },
  },
  {
    // ~120 words, well past the 45-75 the prompt asks for. Caught a real bug:
    // the copy zone and the footer had no gap, so the last line sat flush
    // against the citation and the two read as one run-on block.
    name: "freepress-overlong-body",
    props: {
      stylePreset: "free-press",
      headline: "",
      body: "Sleep onset is governed by a thermoregulatory cascade that begins well before you feel tired, and the distal skin vessels in your hands and feet dilate to dump heat from the core outward. That heat loss is what drives the roughly one degree Celsius fall in core temperature associated with falling asleep faster.\n\nA bedroom held near 18 degrees supports that drop instead of fighting it, which is why a room that feels slightly too cool when you get into bed is usually the right room, and why heavy bedding can undo the whole mechanism you were trying to help.",
      citation: "Harding EC, Franks NP, Wisden W. The Temperature Dependence of Sleep. Front Neurosci. 2019;13:336",
    },
  },
  {
    // The preset asks the generator for an empty headline and the whole beat in
    // `body`. This is the inverted case. It used to render as blank paper with
    // a citation under it, so the fallback that draws the headline instead is
    // pinned here.
    name: "freepress-body-empty-headline-fallback",
    props: {
      stylePreset: "free-press",
      headline: "Deep sleep is where the rebuilding is scheduled. Growth hormone pulses hardest during slow wave sleep, and one week at five hours lowered daytime testosterone.",
      body: "",
      citation: "Leproult R, Van Cauter E. JAMA. 2011;305(21):2173-2174.",
    },
  },
];
