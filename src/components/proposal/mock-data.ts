/** Mocked documents for the Phase 3 proposal. Content is the real GABA
 *  carousel and the real melatonin email from recon, so the prototype shows
 *  true text lengths. Nothing here touches the backend. */

export type SlideKind = "hook" | "content" | "takeaway";
export type MockSlide = {
  id: string;
  kind: SlideKind;
  eyebrow?: string;
  headline: string;
  body?: string;
  bullets?: string[];
  citation?: string;
  graphic?: "none" | "stat" | "list" | "timeline";
  imageUrl?: string;
  dark?: boolean;
};

export const HOOK_IMAGE = "/lunia-bottle-ref-clean.jpeg";

export const MOCK_CAROUSEL: { title: string; topic: string; tone: string; caption: string; slides: MockSlide[] } = {
  title: "Foods that naturally increase GABA levels",
  topic: "Foods that naturally increase GABA levels",
  tone: "Educational",
  caption:
    "GABA is the brain's main inhibitory neurotransmitter, and most of the GABA you eat never reaches it. The blood-brain barrier turns away almost all of it.\n\nSo why do fermented foods keep appearing in sleep and stress research? Because lactic acid bacteria in kimchi, miso and natto convert glutamate into GABA inside the gut, and that signal is relayed upward along the vagus nerve.\n\nFor more sleep science follow @lunia_life",
  slides: [
    { id: "s1", kind: "hook", eyebrow: "The barrier problem", headline: "Most GABA in food never reaches your brain", body: "Which is why fermented foods work a different way", imageUrl: HOOK_IMAGE },
    { id: "s2", kind: "content", headline: "Food GABA barely reaches your brain", body: "GABA is a large, charged molecule and crosses the blood-brain barrier poorly. Yet GABA-rich fermented foods are still associated with calmer evenings and faster sleep onset.", citation: "Boonstra E et al. Neurotransmitters as food supplements. Front Psychol. 2015;6:1520.", graphic: "stat" },
    { id: "s3", kind: "content", headline: "Your gut bacteria build it instead", body: "Lactobacillus and Bifidobacterium strains convert glutamate into GABA, using vitamin B6 as the required cofactor. That signal is relayed toward the brain along the vagus nerve.", citation: "Bravo JA et al. Proc Natl Acad Sci U S A. 2011;108(38):16050-16055.", graphic: "timeline" },
    { id: "s4", kind: "content", headline: "Eat fermented food at dinner", body: "Add one serving of kimchi, miso, natto or tempeh to your evening meal, alongside a B6 source like salmon or chickpeas.", bullets: ["Miso or kimchi nightly", "Natto or tempeh", "Salmon and chickpeas", "Germinated brown rice"], citation: "Diez-Gutiérrez L et al. J Funct Foods. 2020;64:103669.", graphic: "list" },
    { id: "s5", kind: "takeaway", eyebrow: "The takeaway", headline: "GABA is made, not eaten", bullets: ["Food GABA mostly stops at the blood-brain barrier", "Gut bacteria build GABA from glutamate using vitamin B6", "Fermented food plus a B6 source at dinner"], body: "Save this for your next grocery run. Follow @lunia_life for science-based sleep strategies." },
  ],
};

export type BlockKind = "header" | "hero" | "text" | "stat" | "checklist" | "promo" | "cta" | "footer";
export type MockBlock = {
  id: string;
  kind: BlockKind;
  text?: string;
  heading?: string;
  items?: string[];
  imageUrl?: string;
  align?: "left" | "center";
  size?: "s" | "m" | "l";
};

export const MOCK_EMAIL: { subject: string; subjects: string[]; preheader: string; theme: "navy" | "cream"; blocks: MockBlock[] } = {
  subject: "Melatonin overrides. Restore supports.",
  subjects: ["Melatonin overrides. Restore supports.", "The night shift study everyone is sharing", "What melatonin actually does at 7am"],
  preheader: "A study on night shift workers, and what it means for the rest of us.",
  theme: "navy",
  blocks: [
    { id: "b1", kind: "header" },
    { id: "b2", kind: "hero", imageUrl: HOOK_IMAGE, heading: "See the full formula" },
    { id: "b3", kind: "text", text: "A study on night shift workers has been circulating: participants taking melatonin showed higher levels of a urinary marker associated with DNA repair, suggesting the body clears oxidative damage more efficiently when the hormone is present. It is a genuinely interesting result, and it deserves to be read precisely. Melatonin is not a sedative. It is a timing signal." },
    { id: "b4", kind: "stat", heading: "3 clinical doses", text: "Magnesium bisglycinate 500mg, L-theanine 300mg, apigenin 50mg. No melatonin." },
    { id: "b5", kind: "text", text: "So the question worth asking is not how much melatonin, but what is actually keeping you awake. For most people it is a nervous system that has not been given permission to stand down. Lunia works there instead." },
    { id: "b6", kind: "checklist", heading: "What is in Restore", items: ["Magnesium bisglycinate 500mg", "L-theanine 300mg", "Apigenin 50mg"] },
    { id: "b7", kind: "promo", heading: "Three month plan, $60", text: "$0.67 a night. Ships Monday." },
    { id: "b8", kind: "cta", text: "See the full formula" },
    { id: "b9", kind: "footer" },
  ],
};

export const SUBJECTS = [
  "Poor sleep regularity linked to 90+ diseases",
  "Foods that naturally increase GABA levels",
  "Insomnia: the two types and how to treat each",
  "Telomere length and sleep duration: the Whitehall II cohort",
  "Sleeping less than 6 hours raises cortisol the next day",
  "REM sleep: why it's critical for memory and mood",
  "Why the glycinate form of magnesium is best for sleep",
  "Melatonin supplements boost DNA repair in night shift workers",
  "Social jet lag: why your weekend schedule ruins Monday",
  "Body temperature must drop 1°F to fall asleep",
];

export const HOOK_OPTIONS = [
  { eyebrow: "The barrier problem", headline: "Most GABA in food never reaches your brain", body: "Which is why fermented foods work a different way" },
  { eyebrow: "Nutrition and sleep", headline: "You cannot eat your way to more GABA", body: "But you can feed the bacteria that make it" },
  { eyebrow: "Did you know", headline: "Kimchi at dinner is a GABA strategy", body: "The gut, not the plate, does the work" },
];
