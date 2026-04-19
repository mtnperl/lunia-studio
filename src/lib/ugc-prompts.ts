import { AngleConcept } from "./angleLibrary";
import { BriefScript } from "./types";

const REFERENCE_SCRIPTS: BriefScript[] = [
  {
    videoHook: "Hold up the bottle, glance off-camera. \"My sister sent me this at 2am. I'm 44.\"",
    textHook: "3am wake-ups, brain fog, mood swings. Nobody told me this was perimenopause.",
    narrative: `So here's what's happening. Estrogen drops in your forties, even before periods stop. That drop hits GABA. GABA runs your sleep and your mood. That's why the 3am wake-ups aren't random, they're hormonal.

I read the label on this. Three ingredients I recognized from the actual studies. Magnesium glycinate, the form that crosses the blood-brain barrier. Ashwagandha at a clinical dose. L-theanine, 200mg, the same amount in the research.

Three weeks in, I went from waking up four times a night to once. That's it. Not cured, not transformed. Just sleeping.`,
    cta: "I really recommend it if you're in the same boat. Link's below. Not sponsored, just sharing.",
  },
  {
    videoHook: "Flipping the bottle. \"Let me show you what's actually in this.\"",
    textHook: "Most supplements hide behind 'proprietary blend.' This one doesn't.",
    narrative: `I'm skeptical of supplements. Most of them are under-dosed or the ingredients are hidden in a proprietary blend so you can't tell how much of anything you're getting.

This one lists every ingredient with the dose. The magnesium is the glycinate form, 200mg. The ashwagandha is KSM-66, 600mg, which matches the clinical studies. L-theanine, 200mg.

I brought it to my doctor. She said the ingredients are evidence-backed at those doses. Not magic, but reasonable. That was enough for me to try it.`,
    cta: "If you care about what's actually in your supplements, check the label on this one.",
  },
];

const SYSTEM_PROMPT = `You are drafting a UGC video script for Lunia Life, a hormone-support supplement brand targeting women 35-60.

VOICE RULES (hard):
- NO em dashes. Use commas, periods, or "..." only.
- NO medical claims. Never say the product "cures", "treats", "prevents", or "diagnoses". Use "may support", "supports", "helps with" instead.
- NO influencer shorthand: no "game changer", "life changing", "obsessed", "holy grail", "click the link", "use my code".
- NO "this is not X, it's Y" constructions.
- Max one exclamation mark per section.
- Specific numbers over vague claims. "went from 4 wake-ups to 1" beats "sleep better".
- Sentence fragments are fine, even good. Sound like a real person texting.
- Mechanism-first when it makes sense. Explain the why briefly, then show the outcome.
- Mild CTA only. "I really recommend it" over "RUN don't walk".

OUTPUT FORMAT:
Return strict JSON matching this shape (no markdown fence, no explanation):
{
  "videoHook": "string — the on-camera opening line, 1-2 sentences",
  "textHook": "string — the text overlay / caption, 1 short line",
  "narrative": "string — the main script body, 2-4 paragraphs separated by \\n\\n",
  "cta": "string — one short closing line, soft recommendation"
}`;

export function buildScriptUserPrompt(args: {
  angleLabel: string;
  concept: AngleConcept | null;
  conceptLabel: string;
  title: string;
  extraNotes?: string;
}): string {
  const { angleLabel, concept, conceptLabel, title, extraNotes } = args;

  const seed = concept
    ? `Concept seed (use as the backbone, but rewrite in a fresh voice):
- Video hook seed: ${concept.videoHook}
- Text hook seed: ${concept.textHook}
- Narrative arc: ${concept.narrativeArc}`
    : `Concept seed: (none — custom concept)`;

  const referenceBlock = REFERENCE_SCRIPTS
    .map(
      (s, i) =>
        `REFERENCE SCRIPT ${i + 1}:
videoHook: ${s.videoHook}
textHook: ${s.textHook}
narrative: ${s.narrative}
cta: ${s.cta}`,
    )
    .join("\n\n");

  return `Draft a UGC script for:
- Angle: ${angleLabel}
- Concept label: ${conceptLabel}
- Brief title: ${title}
${extraNotes ? `- Extra notes from the user: ${extraNotes}` : ""}

${seed}

Here are two reference scripts that hit the Lunia voice. Match this level of specificity, cadence, and restraint. Do NOT copy them.

${referenceBlock}

Return JSON only.`;
}

export const UGC_SCRIPT_SYSTEM_PROMPT = SYSTEM_PROMPT;
