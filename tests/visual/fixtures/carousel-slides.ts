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
    // The preset's TARGET length, ~34 words. Pins the headline-sized type this
    // look depends on: The Free Press's own 37-word slide sets on a 92px line
    // pitch, and this must land in the same place. If a change makes this
    // baseline's type smaller, the preset has quietly become a paragraph again.
    name: "freepress-target-length",
    props: {
      stylePreset: "free-press",
      headline: "",
      body: "Blood pressure is supposed to fall 10 to 20 percent while you sleep. Losing that overnight dip is associated with higher long-term risk.\n\nHabitual mouth breathing works against it, keeping pressure elevated all night.",
      citation: "Ohkubo T, et al. J Hypertens. 2002;20(11):2183-2189.",
    },
  },
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
  {
    name: "essay-short-emphasis",
    props: {
      stylePreset: "essay",
      essayAccent: "yellow",
      essayNumber: "093",
      essayDate: "06.09.26",
      slideIndex: 0,
      slideTotal: 3,
      headline: "The clock says 3:11",
      body: "You wake, and your brain starts doing math. Six hours until the alarm, then five. The counting is the thing keeping you up.",
      emphasis: "The counting is the thing",
      citation: "Harvey AG. Behav Res Ther. 2002;40(8):869-893",
    },
  },
  {
    name: "essay-long-body-red",
    props: {
      stylePreset: "essay",
      essayAccent: "red",
      essayNumber: "093",
      essayDate: "06.09.26",
      slideIndex: 2,
      slideTotal: 3,
      headline: "Get up at twenty minutes",
      body: "Trying harder to fall back asleep is effort, and effort is arousal. After twenty minutes awake, get up, sit somewhere dim, and go back only when your eyes are heavy. The bed stays the place where sleep happens, not the place where you fight for it. Most people do the opposite for years and call it discipline.",
      emphasis: "effort is arousal",
      citation: "Bootzin RR. Stimulus control treatment for insomnia. Proc Am Psychol Assoc. 1972;7:395-396",
    },
  },
  {
    name: "essay-hook-boxed-word",
    props: {
      kind: "hook",
      stylePreset: "essay",
      essayAccent: "yellow",
      essayNumber: "093",
      essayDate: "06.09.26",
      headline: "CONTENT I SEE NOBODY CREATING",
      emphasis: "NOBODY",
      subline: "and why the second slide decides who stays",
      sourceNote: "Based on Stanford sleep research, 2021",
      body: "",
      citation: "",
    },
  },
  {
    name: "essay-takeaway-red",
    props: {
      kind: "takeaway",
      stylePreset: "essay",
      essayAccent: "red",
      essayNumber: "093",
      essayDate: "06.09.26",
      slideTotal: 3,
      headline: "GET UP AT 3:11",
      points: ["You were fighting the bed for an hour", "Effort is arousal, so it kept you up", "Twenty minutes awake, get up, sit somewhere dim"],
      interaction: { type: "save", label: "Save this for the next 3:11 wake-up" },
      followLine: "Follow @lunia_life for science-based sleep strategies.",
      body: "",
      citation: "",
    },
  },
  // Did you know (Highlighter redesign). Slide 1 in the navy-box treatment
  // with an explicit mark; slide 2 in yellow-box with NO mark, so the
  // fallback (first highlighted token with a digit) is what gets locked in.
  // Both at the lint's long end (340 chars) so the body's step-down shows.
  {
    name: "dyk-slide1-navy-box",
    props: {
      kind: "did_you_know",
      dykIndex: 1,
      didYouKnowTreatment: "navy-box",
      dyk: {
        header: "DID YOU KNOW?",
        body1: [
          { text: "Women entering ", highlight: false },
          { text: "perimenopause", highlight: true },
          { text: " lose an average of ", highlight: false },
          { text: "30 minutes", highlight: true, mark: true },
          { text: " of deep sleep per night, mostly in the ", highlight: false },
          { text: "first half", highlight: true },
          { text: " of the night.", highlight: false },
        ],
        body2: [
          { text: "That is the window when ", highlight: false },
          { text: "growth hormone", highlight: true },
          { text: " peaks, so the loss shows up as ", highlight: false },
          { text: "slower recovery", highlight: true, mark: true },
          { text: " and a ", highlight: false },
          { text: "foggier morning", highlight: true },
          { text: " than the clock alone would suggest.", highlight: false },
        ],
      },
      headline: "",
      body: "",
      citation: "",
    },
  },
  {
    name: "dyk-slide2-yellow-box-legacy-marks",
    props: {
      kind: "did_you_know",
      dykIndex: 2,
      didYouKnowTreatment: "yellow-box",
      paperGrain: 0.9,
      paperVignette: 0.07,
      dyk: {
        header: "BY",
        body1: [
          { text: "Moving your ", highlight: false },
          { text: "last meal", highlight: true },
          { text: " to at least ", highlight: false },
          { text: "three hours", highlight: true },
          { text: " before bed, core temperature can drop on schedule and the ", highlight: false },
          { text: "first cycle", highlight: true },
          { text: " runs deeper.", highlight: false },
        ],
        body2: [
          { text: "Studies associate an ", highlight: false },
          { text: "earlier dinner", highlight: true },
          { text: " with ", highlight: false },
          { text: "more slow-wave sleep", highlight: true },
          { text: " in the first cycle, the part perimenopause takes first, and a ", highlight: false },
          { text: "steadier morning", highlight: true },
          { text: " after it.", highlight: false },
        ],
      },
      headline: "",
      body: "",
      citation: "",
    },
  },
  // Billboard preset. The cover with no photo (the navy band fallback) and a
  // heavy line at the 14-character cap; a content slide at the long end of
  // the body range with a citation; the takeaway with three points.
  {
    name: "billboard-hook-no-photo",
    props: {
      kind: "hook",
      stylePreset: "billboard",
      pillar: "Sleep",
      headline: "THE FIRST 90 MINUTES",
      emphasis: "90 MINUTES",
      subline: "DECIDE THE WHOLE NIGHT",
      sourceNote: "Based on Stanford sleep research, 2021",
      body: "",
      citation: "",
    },
  },
  {
    name: "billboard-content-long-body",
    props: {
      stylePreset: "billboard",
      pillar: "Nutrition",
      slideIndex: 1,
      slideTotal: 3,
      headline: "WHY THE FIRST CYCLE",
      body: "Slow-wave sleep is front-loaded. Roughly half of the night's deep sleep arrives in the first ninety minutes, before the first REM period.\n\nLose that window to a late meal or a warm room and the rest of the night cannot pay it back, however long you stay in bed.",
      citation: "Carskadon and Dement, Principles and Practice of Sleep Medicine, 2017",
    },
  },
  {
    name: "billboard-takeaway",
    props: {
      kind: "takeaway",
      stylePreset: "billboard",
      pillar: "Recovery",
      slideTotal: 3,
      headline: "PROTECT THE FIRST CYCLE",
      points: ["Last meal three hours before bed", "Room at eighteen degrees, not twenty-four", "Same wake time, even after a short night"],
      interaction: { type: "save", label: "Save this for tonight" },
      followLine: "Follow @lunia_life for science-based sleep strategies.",
      body: "",
      citation: "",
    },
  },
];
