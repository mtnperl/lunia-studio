import type { BrandStyle, CarouselTemplate } from "./types";
import { LUNIA_BRAND } from "./lunia-brand";

// ─── Brand bridge — caption Paragraph 4 spec ──────────────────────────────────
// When the "Brand SEO line in caption" toggle is on (default), Claude adds a
// fourth paragraph after the @lunia_life follow line that ties THIS carousel's
// topic to Lunia. Goal: every social caption ingested by AI crawlers / LLM
// training repeats the brand → product → ingredient → category graph in a
// natural sentence. A separate static entity line is appended server-side
// after Claude returns (see src/lib/lunia-brand.ts).
const BRAND_BRIDGE_INSTRUCTION = `
- Caption Paragraph 4 (MANDATORY brand bridge — single sentence, ≤25 words):
  After the @lunia_life follow line, add one more sentence that ties THIS carousel's topic to ${LUNIA_BRAND.name} in a natural, on-voice way. Choose whichever bridge fits the topic best:
    (a) Product bridge — connect the topic to ${LUNIA_BRAND.product} as a whole (the formula is melatonin-free, GMP-manufactured, ${LUNIA_BRAND.benefit}).
    (b) Ingredient bridge — connect the topic to one of the ${LUNIA_BRAND.product} ingredients at its clinical dose: magnesium bisglycinate 500mg, L-theanine 300mg, or apigenin 50mg. Pick the one most relevant to the topic's mechanism.
    (c) Category bridge — connect the topic to "${LUNIA_BRAND.category}" as a brand thesis.
  Voice rules apply: dry, science-forward, no hype, no em dashes. Never sales-y. Never "buy now". Treat it as a closing thought a calm scientist would write.
`;

export const SUGGESTIONS_PROMPT = `You are a content strategist for Lunia Life, a sleep supplement brand. Generate exactly 3 Instagram carousel topic suggestions across these five content pillars: sleep science, ingredient education, cortisol and stress, longevity, wind-down routines.

Return ONLY valid JSON in this exact format, no other text:
[
  { "title": "string", "description": "string", "pillar": "string" },
  { "title": "string", "description": "string", "pillar": "string" },
  { "title": "string", "description": "string", "pillar": "string" }
]

Rules:
- Title: 4-7 words, punchy, uppercase
- Description: one sentence explaining the angle (max 15 words)
- Pillar: one of: Sleep Science, Ingredient Education, Cortisol & Stress, Longevity, Wind-Down Routines
- No em dashes
- No medical claims. Use: "may support", "helps promote", "shown in studies", "associated with"`;

/**
 * History-aware variant of SUGGESTIONS_PROMPT. Given the topics of the user's
 * most recent carousels, propose FRESH ideas that don't repeat them or their
 * core theme — so the feed reads as a coherent, non-repetitive series.
 */
export const SUGGESTIONS_FROM_RECENT_PROMPT = (recentTopics: string[]): string => `You are a content strategist for Lunia Life, a sleep supplement brand. Generate exactly 5 Instagram carousel topic suggestions across these five content pillars: sleep science, ingredient education, cortisol and stress, longevity, wind-down routines.

The user has recently published these carousels — do NOT repeat them, their core mechanism, or their angle. Propose fresh, non-overlapping topics that complement and extend this series (a natural next step, an adjacent mechanism, a different pillar), never a reword of what is already covered:
${recentTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Return ONLY valid JSON in this exact format, no other text:
[
  { "title": "string", "description": "string", "pillar": "string" }
]
(exactly 5 objects)

Rules:
- Title: 4-7 words, punchy, uppercase
- Description: one sentence explaining the angle AND why it is distinct from the recent topics (max 18 words)
- Pillar: one of: Sleep Science, Ingredient Education, Cortisol & Stress, Longevity, Wind-Down Routines
- Spread the 5 across at least 3 different pillars
- No em dashes
- No medical claims. Use: "may support", "helps promote", "shown in studies", "associated with"`;

const HOOK_TONE_INSTRUCTIONS: Record<string, string> = {
  "educational": `Educational tone: clear, factual, teaches the reader one precise thing they did not know. Lead with the insight, not a question.
HOOK FORMULA: state a specific, slightly counterintuitive fact, then let the subline name the implication. No hype, no urgency, no "did you know". Confident and plain.
Approved calibration examples (do not reuse verbatim every time):
  "YOUR BRAIN CLEANS ITSELF ONLY DURING DEEP SLEEP"
  "MAGNESIUM REGULATES OVER 300 REACTIONS IN THE BODY"
  "DEEP SLEEP DROPS NEARLY 40% BY AGE FIFTY"`,
  "clickbait": `Bold-hook tone: provocative hooks that create urgency or disbelief, while staying factually accurate. The reader should feel they are doing something wrong and need to read on.
HOOK FORMULA: a blunt, slightly confrontational claim or command that challenges what the reader is currently doing. Direct address. No hedging. Still defensible by real science.
Approved calibration examples (do not reuse verbatim every time):
  "YOU'RE SLEEPING WRONG AND IT'S AGING YOU"
  "STOP TAKING MELATONIN EVERY SINGLE NIGHT"
  "YOUR 8 HOURS ARE LYING TO YOU"`,
  "myth-bust": `Myth-busting tone: challenge a common misconception about sleep or supplements head-on. Direct and corrective, never smug.
HOOK FORMULA: state the widely-held belief and negate it, or flatly assert the corrected truth. Often "X doesn't…", "X isn't…", "the myth that…". The reader should feel a held belief being overturned.
Approved calibration examples (do not reuse verbatim every time):
  "MELATONIN DOESN'T ACTUALLY MAKE YOU SLEEP"
  "EIGHT HOURS ISN'T THE NUMBER THAT MATTERS"
  "YOU CAN'T REPAY SLEEP DEBT ON WEEKENDS"`,
  "science-backed": `Science-backed tone: lead with the research and the data. Reference studies and findings confidently, with a real number where possible.
HOOK FORMULA: open with the evidence itself — "studies show…", "trials link…", "research ties…" — and pair it with a concrete figure or named mechanism. Authoritative, never breathless. The sourceNote carries the citation.
Approved calibration examples (do not reuse verbatim every time):
  "STUDIES LINK MAGNESIUM TO 20% DEEPER SLEEP"
  "TRIALS SHOW L-THEANINE CALMS WITHOUT SEDATION"
  "RESEARCH TIES LOW MAGNESIUM TO POOR SLEEP"`,
  "personal-story": `Personal-story tone: write the hook in FIRST PERSON, as a real person sharing their own journey with sleep problems and Lunia. Intimate and specific, never a generic testimonial.
HOOK FORMULA: "I" or "MY" voice describing the struggle or the turning point. A specific symptom and a specific moment beat a vague claim. The slides then generalise the mechanism behind that personal experience.
Approved calibration examples (do not reuse verbatim every time):
  "I WOKE AT 3AM EVERY NIGHT FOR YEARS"
  "I TRIED EVERYTHING BEFORE I CHECKED MY MAGNESIUM"
  "HOW I FINALLY STOPPED LYING AWAKE AT NIGHT"`,
  "did-you-know": "Did-you-know tone: open every hook headline with 'DID YOU KNOW' followed by a surprising, specific fact about the topic. The subline deepens the curiosity with a second layer of intrigue. Make the reader feel they have been missing something important. Every content slide should also open with a surprising revelation.",
  "symptom": `Symptom tone: name the precise, pre-aware symptoms of a problem the reader has before they know they have it — so specific it feels like you read their mind — then decode each sign and point to the real cause and the fix.
HOOK FORMULA (HARD RULE — applies to all 3 hooks): "[optional number] SIGNS YOUR [oddly specific experience] IS ACTUALLY [hidden cause], NOT [the thing they assumed]".
  Every one of the 3 hook headlines MUST begin with "SIGNS YOUR" or "[NUMBER] SIGNS YOUR" and MUST contain the "is actually Y, not Z" reframe (or a clear "X, not Y" contrast). A hook that is a plain statement of fact ("SLEEP DEBT IS NOT REPAID IN ONE NIGHT"), a question, or a myth-bust has FAILED this tone — rewrite it.
  The symptom must be lived and precise (never "you're tired"); the contrast reframes something they have misattributed (to stress, to age, to "just how I am"). Second person. Headline UPPERCASE, max 8 words.
Approved calibration examples (do not reuse verbatim every time):
  "SIGNS YOUR 3AM WAKING IS CORTISOL, NOT STRESS"
  "5 SIGNS YOUR MAGNESIUM IS TOO LOW FOR SLEEP"
  "SIGNS YOUR TIREDNESS IS SLEEP QUALITY, NOT QUANTITY"
  "SIGNS YOUR RACING MIND IS BLOOD SUGAR, NOT ANXIETY"
STRUCTURE OVERRIDE (mandatory — this OVERRIDES the v2 SURPRISE/MECHANISM/ACTION arc and any other slide-role rules below):
  Hook slide = the "signs" promise, nothing else.
  Content slide 1 = SIGN ONE. State one concrete sign the reader recognises, then decode what it actually signals (the mechanism), tied to the exact symptom in the hook. The reader should think "that's me".
  Content slide 2 = SIGN TWO. A different recognisable sign, decoded the same way — one sign, one mechanism. Do not repeat slide 1's sign.
  Content slide 3 = SIGN THREE (or the shared root cause behind the signs). Decode it, then begin turning toward what the body actually needs.
  CTA = the fix: the right inputs (magnesium bisglycinate, L-theanine, or apigenin as relevant) or Lunia. Soft, calm, never a cure claim.
HARD RULE: every content slide names a DISTINCT sign and explains the mechanism behind it, always tied back to the symptom in the hook. Mechanism before product. Education-first.
VOICE: no em dashes. Maximum one exclamation mark across the whole carousel, prefer zero. Caption MUST end with exactly: "For more sleep science content follow lunialife"`,
  "paradox": `Paradox tone: open the hook with a frustrating contradiction the reader lives every day. They do the right thing and still get the wrong result, and the hook names that contradiction.
HOOK FORMULA: "Why are you [still experiencing X] when you [just did Y]?"
  X = a real symptom the reader feels (exhausted, wired at midnight, foggy, waking at 3am, puffy, unrested).
  Y = something the reader genuinely does and feels should have earned the opposite result (slept a full 8 hours, went to bed early, cut out caffeine, slept through the night).
  The tension between X and Y IS the hook. If Y is weak or generic there is no paradox. Pair a real symptom with a real, earned behavior. Second person. Present tense. Specific. One sentence. Headline still UPPERCASE, max 8 words.
Approved calibration examples (do not reuse verbatim every time):
  "Why are you exhausted all day when you slept a full 8 hours?"
  "Why do you wake up at 3am every night even when you go to bed early?"
  "Why are you still tired even though you sleep through the night?"
  "Why do you feel wired at midnight when you were exhausted by 9pm?"
STRUCTURE OVERRIDE (mandatory — this OVERRIDES the v2 SURPRISE/MECHANISM/ACTION arc and any other slide-role rules below):
  Hook slide = the paradox question, nothing else.
  Content slide 1 = VALIDATION. Confirm the paradox is real and common so the reader feels seen. No mechanism yet, no fix yet. Tie back to the exact symptom in the hook.
  Content slide 2 = REVEAL + MECHANISM. Name the hidden reason the paradox happens (usually sleep quality vs quantity, cortisol timing, fragmented deep sleep, or a nervous system still activated) and explain the mechanism in plain language, tied to the exact symptom from the hook. This is the turn the hook promised.
  Content slide 3 = BRIDGE. How the right inputs support that mechanism (magnesium bisglycinate, L-theanine, or apigenin as relevant). Mechanism-led, never a cure claim.
  CTA = soft, calm recommendation. Not a hard sell.
HARD RULE: the resolution must answer the SPECIFIC paradox opened in the hook. If the hook is about waking at 3am, the carousel resolves 3am waking, not sleep in general. Do not open one loop and close a different one.
VOICE: no em dashes. Maximum one exclamation mark across the whole carousel, prefer zero. Never use the "X isn't Z, it's Y" sentence structure. Education-first, mechanism before product, respect the reader's intelligence. Caption MUST end with exactly: "For more sleep science content follow lunialife"`,
  "tell": `Tell tone: open the hook with a hyper-specific private experience the reader secretly has and assumed was unique to them. The recognition is the lure — "that is exactly me, what does it mean?" — and the carousel exists to explain that exact tell.
HOOK FORMULA: "If you [oddly specific private experience], here is what your body is actually doing."
  The experience must be specific enough to feel personal but common enough that a real share of viewers recognise themselves. Too generic ("if you are tired") kills recognition. Too niche kills reach. Aim specific-but-widespread. Frame the second half as a reveal about physiology, not a label or diagnosis. Second person. Present tense. One sentence. Headline still UPPERCASE, max 8 words.
Approved calibration examples (do not reuse verbatim every time):
  "If you get a second wind at 11pm, your cortisol is on the wrong schedule."
  "If you fall asleep fine but wake up wired at 4am, this is for you."
  "If you wake up and check the clock at the same time every night, read this."
  "If you can only fall asleep with noise on, here is what is going on."
STRUCTURE OVERRIDE (mandatory — this OVERRIDES the v2 SURPRISE/MECHANISM/ACTION arc and any other slide-role rules below):
  Hook slide = the specific tell, nothing else.
  Content slide 1 = RECOGNITION. Confirm this is real and more common than the reader thinks so they feel seen rather than broken. No mechanism yet.
  Content slide 2 = REVEAL + MECHANISM. Decode what the tell actually signals (usually cortisol timing, nervous system activation, or fragmented/shallow sleep) and explain the mechanism in plain language, always tied back to the exact tell from the hook.
  Content slide 3 = BRIDGE. How the right inputs support that mechanism (magnesium bisglycinate, L-theanine, or apigenin as relevant). Mechanism-led, never a cure claim.
  CTA = soft, calm recommendation. Not a hard sell.
HARD RULE: the carousel must decode the SPECIFIC tell from the hook. If the tell is the 11pm second wind, the carousel explains the 11pm second wind, not sleep in general.
VOICE: no em dashes. Maximum one exclamation mark across the whole carousel, prefer zero. Never use the "X isn't Z, it's Y" sentence structure. Education-first, mechanism before product, respect the reader's intelligence. Caption MUST end with exactly: "For more sleep science content follow lunialife"`,
};

/**
 * Prompt for regenerating ONLY the hook copy of an existing carousel — the
 * 3 content slides and CTA stay as-is, so the new hooks must stay on-topic and
 * consistent with the deck the user already has. Hook format rules mirror
 * GENERATE_CAROUSEL_PROMPT exactly so output is interchangeable.
 */
export const REGENERATE_HOOKS_PROMPT = (
  topic: string,
  hookTone = "educational",
  slides: { headline: string; body: string }[] = [],
  guidelines = "",
): string => {
  const deck = slides
    .map((s, i) => `Slide ${i + 1}: ${s.headline} — ${s.body}`)
    .join("\n");
  return `You are a content strategist for Lunia Life, a sleep supplement brand. Write 3 NEW, distinct hook options (the opening slide of an Instagram carousel) for the carousel below. The content slides and CTA are FIXED — your hooks must set up THIS exact deck, stay on-topic, and not promise content the slides don't deliver. The 3 hooks should be genuinely different angles, not rewordings of one idea.

Topic: ${topic}
Hook tone: ${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}

The deck the hook must introduce:
${deck || "(no slide content provided — base hooks on the topic)"}
${guidelines ? `\nExtra direction from the user (apply to all 3):\n${guidelines}\n` : ""}
Output STRICT JSON, no markdown, no commentary, exactly this shape:
{
  "hooks": [
    { "headline": "string", "subline": "string", "sourceNote": "Based on [real journal/institution] research, [year]" },
    { "headline": "string", "subline": "string", "sourceNote": "Based on [real journal/institution] research, [year]" },
    { "headline": "string", "subline": "string", "sourceNote": "Based on [real journal/institution] research, [year]" }
  ]
}

Hook format rules (hard):
- headline: UPPERCASE, punchy, max 8 words
- subline: italic-style sentence fragment, max 10 words, creates mild tension or curiosity. No period at the end.
- sourceNote: MANDATORY — every hook MUST have a non-empty sourceNote. Format: "Based on [real published journal/institution] research, [year]". Max 8 words after "Based on". Reference the most relevant REAL research supporting the hook's claim. NEVER fabricate a source. NEVER omit or leave empty.`;
};

export const STYLE_REFERENCE_PREFIX = `A carousel style reference image is attached. Study it carefully: note the tone, vocabulary, content density, section structure, and how claims are framed. Match that style in the carousel you generate below — do not comment on the image, just apply what you observe.\n\n`;

function buildTemplateSection(template: CarouselTemplate): string {
  const densityMap = {
    minimal: "1-2 sentences MAX per slide. Headlines must carry the full idea. Body is a single punchy line or two at most. This OVERRIDES all body copy rules.",
    medium: "2-3 sentences per slide. Concise and scannable. This OVERRIDES all body copy rules.",
    dense: "3-4 sentences per slide, detailed and citation-heavy. This OVERRIDES all body copy rules.",
  };
  return `=== TEMPLATE OVERRIDE: "${template.name}" ===
${template.description ? `Description: ${template.description}\n` : ""}${template.styleNotes ? `Style notes: ${template.styleNotes}\n` : ""}BODY COPY RULE (overrides all defaults): ${densityMap[template.contentDensity] ?? densityMap.medium}

${template.images.length} reference slide image${template.images.length > 1 ? "s are" : " is"} attached. Study each carefully and mirror:
- The EXACT sentence count and word count per slide
- The headline framing style (question / statement / data-led)
- Whether the slide uses bullet-point facts or flowing prose
- How prominent and long the citation text is

This template instruction takes PRIORITY over all other copy-length rules below.
===\n\n`;
}

export const GENERATE_CAROUSEL_PROMPT = (
  topic: string,
  hookTone = "educational",
  hasStyleRef = false,
  template: CarouselTemplate | null = null,
  brandStyle?: BrandStyle,
  concise = false,
  v2Mode = false,
  /** When set to "editorial-scientific", Claude also outputs a structured
   *  hookImageSpec so the hook image renders as a Lunia editorial poster
   *  (text baked in, brand chrome assembled by the image route). */
  stylePreset?: string,
  /** Default true. When true, Claude appends a one-sentence brand bridge as
   *  Paragraph 4 of the caption, and the server appends a static brand
   *  entity line after that. See src/lib/lunia-brand.ts. */
  includeSeoFooter: boolean = true,
) => {
  const isEditorial = stylePreset === "editorial-scientific";
  const svgColors = brandStyle
    ? [brandStyle.accent, brandStyle.headline, brandStyle.background, brandStyle.secondary, brandStyle.body, "#ffffff"].join(" ")
    : "#1e7a8a #1a2535 #c8dde8 #f0ece6 #9ab0b8 #ffffff";

  return `${template ? buildTemplateSection(template) : ""}${hasStyleRef ? STYLE_REFERENCE_PREFIX : ""}You are a UGC scriptwriter and content strategist for Lunia Life, a sleep supplement brand. Generate carousel content for this topic: "${topic}"

Hook tone: ${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}
${concise ? '\nCONCISE MODE — MANDATORY: Each slide body MUST be 1-2 sentences maximum (30 words max). No secondary claims. No caveats. One punch per slide. This OVERRIDES the default 3-5 sentence rule.' : ''}
Return ONLY valid JSON in this exact format, no other text:
{
  "hooks": [
    { "headline": "string", "subline": "string", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" }
  ],
  "slides": [
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string", "graphicImagePrompt": "string or null" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string", "graphicImagePrompt": "string or null" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string", "graphicImagePrompt": "string or null" }
  ],
  "cta": {
    "headline": "string",
    "followLine": "Follow @lunia_life for science-based sleep strategies."
  },${v2Mode ? `
  "takeaway": {
    "headline": "string",
    "points": ["string", "string", "string"],
    "interaction": { "type": "save | send | comment", "label": "string" }
  },` : ""}
  "caption": "string",
  "imagePrompt": "string"${isEditorial ? `,
  "hookImageSpec": {
    "concept": "ONE sentence (max 30 words) capturing the science / concept this hook is about. Do NOT prescribe scene details, props, camera angles, lighting, or composition — we give only the concept and the exact text to the image engine and let it interpret freely.",
    "overlay": "OPTIONAL short tagline (≤ 6 words) baked into the image as an editorial accent above the headline. Omit field if nothing meaningful adds."
  }` : ""}
}
${v2Mode ? `
NARRATIVE ARC (mandatory for v2): The 3 content slides serve THREE DIFFERENT ROLES — they are NOT 3 parallel facts. Treat them as an arc:

Slide 1 — THE SURPRISE
  Role: Challenge what most people believe. Pull out the counter-intuitive finding that makes the reader stop scrolling.
  Headline: 4-7 words that CONTRADICT a common assumption (e.g. "MORE SLEEP ISN'T ALWAYS BETTER", "CORTISOL ISN'T THE PROBLEM"). Avoid generic statements of fact.
  Body: Open with the specific surprising stat or finding. Create a "wait, what?" moment. The body should set up TENSION between common belief and reality.

Slide 2 — THE MECHANISM
  Role: Explain WHY slide 1 is true. The biology / chemistry / system / causal chain behind the surprise.
  Headline: 4-7 words that NAME or DESCRIBE the mechanism (e.g. "GABA RECEPTORS QUIET THE BRAIN", "ADENOSINE BUILDS UP ALL DAY"). Reveal the cause.
  Body: Walk through cause-and-effect. Show the chain. Use specific molecules, hormones, brain regions, or processes by name. This is the explanatory beat.

Slide 3 — THE ACTION
  Role: Tell the reader what to DO. Concrete, specific, doable today.
  Headline: 4-7 words that PRESCRIBE or EMPOWER (e.g. "CUT CAFFEINE BY 2PM", "TAKE MAGNESIUM 30 MIN PRE-BED"). Active verbs, no vague hedges.
  Body: One specific habit, timing window, dose, or behavior. No "consider", no "try to". Cite the study supporting the recommendation.

The 3 slides MUST NOT all read as statements of fact. Slide 1 surprises, slide 2 explains, slide 3 directs. Different verbs, different rhythms, different jobs. If slide 1 and slide 3 feel interchangeable, you have failed the arc.

FORWARD-REFERENCE TEASE (mandatory): the LAST sentence of Slide 3's body must plant a soft pull toward the final slide — a one-line promise that the distilled version / the full recap is coming next. Keep it calm and specific, never "swipe up!!". Examples: "The full routine is on the last slide." / "Here's the whole thing in three lines, next." Do not over-hype; one quiet sentence.

TAKEAWAY SLIDE (mandatory for v2 — populate the "takeaway" object): a penultimate payoff slide shown BETWEEN the content and the CTA. It pays off the tease and earns the save. Build it so a reader who saw nothing else still gets the value.
  takeaway.headline: the single sharpest payoff line. UPPERCASE, max 6 words. Not a question. This is the "why I saved this" line.
  takeaway.points: 2-3 items, each ONE line, max 12 words, NO period. Distil the arc — point 1 from the surprise, point 2 from the mechanism, point 3 from the action — into plain, do-it-tonight language. Each point must stand alone and be skimmable. These are what the reader screenshots. No citations, no hedging, no "may support" padding here — just the takeaway.
  takeaway.interaction: ONE explicit ask, matched to the content:
    - type "save" when the deck is a routine/checklist/how-to the reader will act on later (default for actionable topics).
    - type "send" when the deck is relatable or diagnostic — something the reader knows applies to a specific friend/partner.
    - type "comment" when the deck poses a question or invites the reader to self-identify.
    label: a short, specific, second-person instruction that names WHY (max 12 words). Examples: "Save this for your next 3am wake-up", "Send this to someone who's always tired", "Comment your bedtime and I'll tell you what to fix". Match the verb to the chosen type. Do not default to a generic "save this post".
` : ""}
Brand rules (follow exactly):
- No em dashes anywhere. Use commas or short sentences instead.
- No medical claims. Only use: "may support", "helps promote", "shown in studies", "associated with"
- Tone: dry, science-forward, minimal, confident. Never motivational or cheesy.
- Hook headlines: uppercase, punchy, max 8 words
- Hook sublines: italic-style sentence fragments, max 10 words, create mild tension or curiosity. No period at end.
- Hook sourceNote: MANDATORY — every hook MUST have a non-empty sourceNote. This is the trust liner shown at the bottom of the hook slide. Format: "Based on [real journal/institution] research, [year]". Must reference the most relevant real published research supporting the hook's claim. Max 8 words after "Based on". Never fabricate — only cite real sources. NEVER omit this field or leave it empty.
- Body copy: 2-3 sentences MAX. First sentence is a bold punchy statement (the core insight). Remaining 1-2 sentences add specific factual support. Total under 60 words. References the cited research.
- Citations: ONLY real peer-reviewed papers with correct authors, journal names and years. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages. Hallucinated citations are unacceptable.
- CTA headline: short sharp statement, not a question, not a command, uppercase, max 6 words
- All headlines uppercase
- Caption: Instagram caption for this post. Write in ${includeSeoFooter ? "4" : "3"} paragraphs separated by \\n\\n (double newline). Paragraph 1 (2 sentences): open with the most striking insight or stat — create tension or curiosity. Paragraph 2 (2-3 sentences): expand the idea — the mechanism, the evidence, the implication. Paragraph 3 (1-2 sentences): close with exactly "For more Sleep-Science content follow @lunia_life". No hashtags. No em dashes. Tone matches the hookTone.${includeSeoFooter ? BRAND_BRIDGE_INSTRUCTION : ""}
- graphic: compact single-line JSON. ${v2Mode ? `MANDATORY TIER DIVERSITY (v2): the 3 content slides MUST come from 3 DIFFERENT tiers — exactly one TIER A (data), one TIER B (layout), and one TIER C (concept). Within the chosen tier, pick the component that best fits THE NARRATIVE PAYOFF of that specific slide's headline, not just whichever component the data fits into. If the headline is about a hidden truth, prefer iceberg over generic bento. If it's a transformation, prefer bridge. If it's a paradox, prefer matrix2x2. Don't pick the safest match — pick the one that pays off the headline.` : `MANDATORY VARIETY RULE: all 3 slides MUST use 3 DIFFERENT component types.`} Use this 3-tier routing to pick:

  STEP 1 — CLASSIFY the slide:
    A) DATA → slide body has ≥2 real numbers or percentages → pick from TIER A
    B) LAYOUT → slide explains 3-6 discrete concepts that relate structurally (a cycle, contrast, hierarchy, cause-effect chain, or mechanism) with no hard numbers required → pick from TIER B
    C) CONCEPT → emotional/metaphorical/abstract, or ≤1 hard number → pick from TIER C

  TIER A — DATA components (use REAL numbers from the slide, never invent):
  {"component":"stat","data":{"stat":"NUMBER","unit":"UNIT_OR_EMPTY_STRING","label":"WHAT IT MEANS"}}  — one big standout number
  {"component":"radial","data":{"value":"87%","label":"ADULTS DEFICIENT","sublabel":"optional"}}  — single % on a speedometer arc
  {"component":"bars","data":{"items":[{"label":"NAME","value":"VALUE"},{"label":"NAME","value":"VALUE"}]}}  — 2-4 side-by-side comparison bars
  {"component":"donut","data":{"segments":[{"label":"NAME","value":NUMBER},{"label":"NAME","value":NUMBER}],"centerLabel":"optional"}}  — 2-5 part breakdown
  {"component":"split","data":{"parts":[{"label":"NAME","percent":70,"value":"optional"},{"label":"NAME","percent":30}]}}  — percentage split 2-4 parts
  {"component":"circleStats","data":{"items":[{"value":"7-9","sublabel":"hrs","label":"OPTIMAL SLEEP"},{"value":"23%","label":"MORE REM"}]}}  — 2-4 ringed stat circles
  {"component":"spectrum","data":{"min":0,"max":12,"from":7,"to":9,"label":"OPTIMAL SLEEP RANGE","unit":"hrs"}}  — range on a min-max scale
  {"component":"stackedBar","data":{"segments":[{"label":"LIGHT","percent":55,"value":"4.4 hrs"},{"label":"DEEP","percent":22,"value":"1.8 hrs"},{"label":"REM","percent":23,"value":"1.8 hrs"}],"title":"optional"}}  — stacked bar 2-5 segments
  {"component":"funnel","data":{"stages":[{"label":"STAGE","percent":100},{"label":"STAGE","percent":60}]}}  — 2-5 stage funnel with drop-off
  {"component":"scorecard","data":{"score":"A+","label":"SLEEP QUALITY","sublabel":"optional"}}  — large grade/score
  {"component":"iconStat","data":{"icon":"🧠","value":"23%","unit":"increase","label":"ALPHA WAVES","sublabel":"optional"}}  — hero emoji + big number
  {"component":"heatGrid","data":{"cells":[{"label":"Mon","value":3},{"label":"Tue","value":1}],"title":"optional"}}  — grid coloured by intensity 1-3
  {"component":"wave","data":{"points":[{"label":"LABEL","value":NUMBER},{"label":"LABEL","value":NUMBER}],"unit":"optional"}}  — trend line 2-6 points
  {"component":"timeline","data":{"events":[{"time":"LABEL","label":"DESCRIPTION"}]}}  — 2-6 chronological events
  {"component":"matrix2x2","data":{"topLeft":"Fast+Effective","topRight":"Fast+Less","bottomLeft":"Slow+Effective","bottomRight":"Avoid","xLabel":"SPEED","yLabel":"EFFECTIVENESS"}}  — 2x2 quadrant
  {"component":"callout","data":{"text":"KEY STAT OR QUOTE","source":"optional brief citation"}}  — bold pull-quote (last resort if only 1 number)

  TIER B — LAYOUT components (match the structural shape of the content):
  LABEL RULES FOR ALL TIER B: every label/spoke/step must be ≤4 words. sublabels ≤5 words. surface/hidden items ≤4 words. Never write full sentences inside layout components — short nouns and verbs only. Violating this causes text clipping.
  {"component":"hubSpoke","data":{"center":"1-3 WORD CONCEPT","spokes":[{"label":"2-4 WORD EFFECT"},{"label":"2-4 WORD EFFECT"},{"label":"2-4 WORD EFFECT"}]}}  — one central mechanism with 3-5 radiating effects; use when slide has one cause with multiple downstream outcomes
  {"component":"iceberg","data":{"surface":["2-4 word item"],"hidden":["2-4 word truth","2-4 word truth","2-4 word truth"],"surfaceLabel":"WHAT YOU SEE","hiddenLabel":"THE REAL CAUSE"}}  — use when slide reveals a hidden reality beneath surface-level perception
  {"component":"bridge","data":{"from":"THE PROBLEM","to":"THE RESULT","label":"how it works"}}  — problem → result arc; use when slide shows a causal link or mechanism between two states
  {"component":"bento","data":{"tiles":[{"icon":"🧠","label":"2-3 WORD LABEL","body":"optional short note"},{"icon":"💤","label":"2-3 WORD LABEL"}]}}  — 2-4 independent insight tiles; use for lists of distinct benefits or mechanisms
  {"component":"conceptFlow","data":{"nodes":[{"label":"1-3 WORD CONCEPT","sublabel":"2-4 word note"},{"label":"1-3 WORD CONCEPT","sublabel":"2-4 word note"},{"label":"1-3 WORD OUTCOME","sublabel":"2-4 word note"}]}}  — 3-5 cause-effect nodes each with a sublabel; use when slide traces a chain of events or mechanisms
  {"component":"dotchain","data":{"steps":["Step 1","Step 2","Step 3"]}}  — 3-5 simple connected steps (simpler than conceptFlow, no sublabels)
  {"component":"steps","data":{"steps":["Step 1","Step 2","Step 3"]}}  — 2-4 numbered sequential steps
  {"component":"processFlow","data":{"steps":["Step 1","Step 2","Step 3","Step 4"]}}  — 2-5 horizontal process boxes with arrows (technical/biochemical sequence)
  {"component":"checklist","data":{"items":["Item one","Item two","Item three"]}}  — 2-5 key facts or actions as a list
  {"component":"iconGrid","data":{"items":[{"icon":"EMOJI","label":"SHORT LABEL"}],"columns":3}}  — 2-9 icon+label grid
  {"component":"pyramid","data":{"levels":["Top (most specific)","Middle","Base (widest)"]}}  — 2-5 level priority hierarchy
  {"component":"versus","data":{"left":{"label":"OPTION A","items":["fact","fact"]},"right":{"label":"OPTION B","items":["fact","fact"]}}}  — A vs B comparison
  {"component":"table","data":{"headers":["Col 1","Col 2"],"rows":[["a","b"]]}}  — 2-4 columns, 1-5 rows
  {"component":"bubbles","data":{"items":[{"label":"1-3 word","size":3},{"label":"1-3 word","size":2}]}}  — 2-5 bubbles sized by importance
  {"component":"scorecard","data":{"score":"A+","label":"SLEEP QUALITY","sublabel":"optional"}}  — grade or score

  TIER C — VECTOR illustration:
  {"component":"vector","data":{"keywords":"SPACE-SEPARATED TOPIC KEYWORDS (3-5 evocative words)","label":"SHORT LABEL","mood":"calm|energetic|scientific|playful"}}  — SVG illustration for emotional/conceptual slides; mood: calm=relaxation/recovery, energetic=activation/performance, scientific=mechanisms/biology, playful=habits/lifestyle

  Output valid JSON only — no wrapping quotes, no code fence, no explanation. Always output a valid component JSON — never output an empty string.
- imagePrompt: ${v2Mode ? "A SUBJECT-ONLY image prompt for the hook slide background. Describe the visual concept, composition, and key elements — but DO NOT specify color palette, lighting style, photographic finish, or aesthetic adjectives like 'cinematic' / 'editorial' / 'premium'. Style/palette/lighting will be applied separately by the visual-mood layer." : "A Recraft V3 realistic_image photography prompt for the hook slide background image."} The hook headline IS your creative brief — create a LITERAL VISUAL METAPHOR of the exact words in hooks[0].headline. Pull the most striking noun or verb from the headline and build a cinematic scene around it. The image should feel like a still frame of the hook happening.
  Examples of hook-to-image translation:
  • "ADENOSINE IS DROWNING YOUR BRAIN" → dark water engulfing, objects sinking into deep blue, air bubbles rising from below, cold undercurrent light
  • "MAGNESIUM IS YOUR BRAIN'S OFF SWITCH" → single light switch on a dark wall, the moment before it flips off, deep shadow, one cold highlight
  • "YOUR CORTISOL IS SPIKING" → sharp crystal formation breaking through dark water surface, jagged edges catching light, tension and rupture
  • "YOU'RE WIRED BUT TIRED" → tangled copper electrical wire in warm shallow-focus light, frayed at the end, quiet exhaustion
  Structure: [literal visual from the hook's key word/phrase] + [cinematic lighting] + [camera/composition] + [colour palette] + [mood].
  Hard rules: if the hook concept involves a human experience (fatigue, stress, a journey, a habit, waking up) you MAY include a single person or human detail — hands, a silhouette, or an editorial close-crop of a face — always partial framing, never a full portrait. No text, no logos. Ultra-sharp, editorial, premium brand aesthetic. Max 55 words. DO NOT illustrate the supplement or ingredient — illustrate the HOOK.
  Bad example (never do this): "Extreme macro of magnesium glycinate powder dissolving in dark water"
${isEditorial ? `- hookImageSpec (Editorial Scientific only — MANDATORY):
  Hand the image engine the CONCEPT and let it interpret. Do NOT prescribe scene details, props, lighting, camera angles, mood adjectives, or composition — the framework's whole point is that gpt-image-2 makes the visual choices freely from the concept + the exact text it must bake.

  Fields:
    • concept: ONE sentence, max 30 words. Capture the science / mechanism / claim this carousel hook is actually about, in plain language a curious adult can follow. The point of the sentence is to give the image engine a clear conceptual anchor — not a scene description. Examples:
        – "The glymphatic system flushes metabolic waste from the brain only during deep sleep."
        – "L-theanine raises alpha brain-wave activity, quieting a racing mind without sedation."
        – "Cortisol's natural fall after midnight is what unlocks deep, restorative sleep."
        – "Apigenin binds to GABA-A receptors, the same calming pathway as traditional sleep botanicals."
      Use the language of the science. Do NOT describe a scene ("a woman with her hand on her temple…") — describe the concept.
    • overlay: OPTIONAL short tagline (≤6 words) baked into the image as an editorial accent above the headline (uppercase, wide tracking — e.g. "THE BRAIN'S NIGHT SHIFT", "THE QUIET MOLECULE"). Only set when it meaningfully sharpens the hook; otherwise omit.

  HARD RULE: do not include subject, composition, sceneElements, brandMood, or any scene-prescription field. The image engine is intentionally left to interpret the concept on its own. Do not include the headline / body / palette / font / aesthetic instructions either — those are fixed chrome the image route adds.
` : ""}- graphicImagePrompt: For TIER B and TIER C slides ONLY — write a Recraft V3 vector_illustration prompt (max 40 words) describing the visual concept as a clean minimal infographic. The image replaces the SVG component and must be beautiful and representative of the slide content.
  Format: [core visual concept — e.g. "hub-and-spoke diagram", "iceberg cross-section", "bridge arc"] + [style: "clean minimal vector illustration, no text, no labels"] + [color: "white background, [accent_color] highlights, soft shadows"] + [mood].
  The accent color is: ${brandStyle?.accent ?? '#1e7a8a'}.
  For TIER A slides (stat, bars, donut, radial, circleStats, spectrum, stackedBar, funnel, scorecard, iconStat, heatGrid, wave, timeline, matrix2x2, callout), set graphicImagePrompt to null — SVG components handle data-precise slides.
  For TIER B (hubSpoke, iceberg, bridge, bento, conceptFlow, dotchain, steps, processFlow, checklist, iconGrid, pyramid, versus, table, bubbles) and TIER C (vector) slides — write a compelling prompt. The visual should communicate the slide's concept without text. Think like an editorial illustrator.
  Examples:
  • hubSpoke slide about magnesium benefits → "Central glowing circle with 4 radiating arcs connecting to smaller nodes, clean minimal vector, white background, teal highlights, geometric precision, no text"
  • iceberg slide about hidden sleep debt → "Iceberg cross-section, small peak above waterline, large mass below, dark ocean blues fading to black, white ice, crisp edges, scientific illustration style, no labels"
  • vector slide about circadian rhythm → "Sine wave arc representing day-night cycle, sun and moon at opposite peaks, gradient from warm amber to deep midnight blue, minimal geometric, no text"

=== TONE LOCK (read last, obey first) ===
Before you finalise the 3 hooks, re-read the hook tone you were given and make every hook unmistakably that tone:
${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}
HARD RULE: a reader shown only the 3 hooks must be able to name the tone without being told. If a hook would read identically under a different tone, it has failed — rewrite it until the chosen tone is the thing that makes it work. The format rules above (uppercase, 8-word limit, sourceNote) are constraints, not the voice. The voice is the tone.
===`;
};

export const REGENERATE_SLIDE_PROMPT = (topic: string, hookTone = "educational", slideIndex: number) =>
  `You are a content strategist for Lunia Life, a sleep supplement brand. Regenerate slide ${slideIndex + 2} of a carousel about: "${topic}"

Hook tone: ${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}

Return ONLY valid JSON in this exact format, no other text:
{ "headline": "string", "body": "string", "citation": "string", "graphic": "string" }

Brand rules (follow exactly):
- No em dashes anywhere.
- No medical claims. Only use: "may support", "helps promote", "shown in studies", "associated with"
- Body copy: 2-3 sentences MAX. First sentence: bold punchy statement (core insight). Remaining 1-2 sentences: specific factual support. Total under 60 words.
- Citations: ONLY real peer-reviewed papers. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages.
- Headline: uppercase, max 8 words
- graphic: same 3-tier GraphicSpec JSON rules as the main carousel prompt — compact single-line JSON, real data only. Use TIER A for data-rich slides, TIER B (hubSpoke/iceberg/bridge/bento/conceptFlow/dotchain/steps/etc.) for structural slides, TIER C (vector with mood) for conceptual slides. LABEL RULES: all TIER B labels ≤4 words, sublabels ≤5 words. Always output a valid component JSON.`;

export const REGENERATE_GRAPHIC_PROMPT = (topic: string, headline: string, body: string, avoidComponents: string[] = [], userComment: string = "", forceComponent?: string) =>
  `You are a data visualisation designer for Lunia Life, a sleep supplement brand. Generate a single infographic component for this carousel slide.

Topic: "${topic}"
Headline: "${headline}"
Body: "${body}"
${forceComponent ? `\nFORCED COMPONENT (mandatory): the user has explicitly chosen the "${forceComponent}" component. You MUST output a graphic with "component":"${forceComponent}". Fill the data shape for THIS component using the slide content above. Do not pick any other component, and ignore any "already used" rules below.\n` : ''}${avoidComponents.length > 0 && !forceComponent ? `ALREADY USED — do NOT pick any of these: ${avoidComponents.join(", ")}. You MUST choose a completely different component type.` : ''}
${userComment.trim() ? `\nUSER FEEDBACK on the previous graphic — apply this when ${forceComponent ? "filling the forced component's data" : "picking the new one"}:\n"${userComment.trim().slice(0, 400)}"\n` : ''}
Return ONLY a valid compact single-line JSON object. MANDATORY: you MUST use a different component type than the ones already used. Use this 3-tier routing:

STEP 1 — CLASSIFY the slide:
  A) DATA → slide body has ≥2 real numbers or percentages → pick from TIER A
  B) LAYOUT → slide has 3-6 discrete concepts that relate structurally (cycle, contrast, hierarchy, cause-effect) → pick from TIER B
  C) CONCEPT → emotional/metaphorical/abstract → pick from TIER C

TIER A — DATA (use REAL numbers/facts only):
{"component":"stat","data":{"stat":"NUMBER","unit":"UNIT","label":"WHAT IT MEANS"}}
{"component":"radial","data":{"value":"87%","label":"ADULTS DEFICIENT","sublabel":"optional"}}
{"component":"bars","data":{"items":[{"label":"NAME","value":"VALUE"},{"label":"NAME","value":"VALUE"}]}}
{"component":"donut","data":{"segments":[{"label":"NAME","value":NUMBER},{"label":"NAME","value":NUMBER}],"centerLabel":"optional"}}
{"component":"split","data":{"parts":[{"label":"NAME","percent":70},{"label":"NAME","percent":30}]}}
{"component":"circleStats","data":{"items":[{"value":"7-9","sublabel":"hrs","label":"SLEEP"},{"value":"23%","label":"MORE REM"}]}}
{"component":"spectrum","data":{"min":0,"max":12,"from":7,"to":9,"label":"SLEEP RANGE","unit":"hrs"}}
{"component":"stackedBar","data":{"segments":[{"label":"LIGHT","percent":55,"value":"4.4 hrs"},{"label":"DEEP","percent":22},{"label":"REM","percent":23}],"title":"optional"}}
{"component":"funnel","data":{"stages":[{"label":"STAGE","percent":100},{"label":"STAGE","percent":60},{"label":"STAGE","percent":28}]}}
{"component":"scorecard","data":{"score":"A+","label":"SLEEP QUALITY","sublabel":"optional"}}
{"component":"iconStat","data":{"icon":"🧠","value":"23%","unit":"increase","label":"ALPHA WAVES"}}
{"component":"heatGrid","data":{"cells":[{"label":"Mon","value":3},{"label":"Tue","value":1},{"label":"Wed","value":2}],"title":"optional"}}
{"component":"wave","data":{"points":[{"label":"LABEL","value":NUMBER},{"label":"LABEL","value":NUMBER}],"unit":"optional"}}
{"component":"timeline","data":{"events":[{"time":"LABEL","label":"DESCRIPTION"}]}}
{"component":"matrix2x2","data":{"topLeft":"Fast+Effective","topRight":"Fast+Less","bottomLeft":"Slow+Effective","bottomRight":"Avoid","xLabel":"SPEED","yLabel":"EFFECTIVENESS"}}
{"component":"callout","data":{"text":"KEY STAT OR QUOTE","source":"optional citation"}}

TIER B — LAYOUT:
LABEL RULES FOR ALL TIER B: every label/step/spoke must be ≤4 words. sublabels ≤5 words. surface/hidden items ≤4 words. Never write full sentences inside layout components — short nouns and verbs only.
{"component":"hubSpoke","data":{"center":"1-3 WORD CONCEPT","spokes":[{"label":"2-4 WORD EFFECT"},{"label":"2-4 WORD EFFECT"},{"label":"2-4 WORD EFFECT"}]}}
{"component":"iceberg","data":{"surface":["2-4 word item"],"hidden":["2-4 word truth","2-4 word truth","2-4 word truth"],"surfaceLabel":"WHAT YOU SEE","hiddenLabel":"THE REAL CAUSE"}}
{"component":"bridge","data":{"from":"THE PROBLEM","to":"THE RESULT","label":"how it works"}}
{"component":"bento","data":{"tiles":[{"icon":"🧠","label":"2-3 WORD LABEL","body":"optional short note"},{"icon":"💤","label":"2-3 WORD LABEL"}]}}
{"component":"conceptFlow","data":{"nodes":[{"label":"1-3 WORD CONCEPT","sublabel":"2-4 word note"},{"label":"1-3 WORD CONCEPT","sublabel":"2-4 word note"},{"label":"1-3 WORD OUTCOME","sublabel":"2-4 word note"}]}}
{"component":"dotchain","data":{"steps":["Step 1","Step 2","Step 3"]}}
{"component":"steps","data":{"steps":["Step 1","Step 2","Step 3"]}}
{"component":"processFlow","data":{"steps":["Tryptophan","5-HTP","Serotonin","Melatonin"]}}
{"component":"checklist","data":{"items":["Item one","Item two","Item three"]}}
{"component":"iconGrid","data":{"items":[{"icon":"EMOJI","label":"SHORT LABEL"}],"columns":3}}
{"component":"pyramid","data":{"levels":["Top","Middle","Base"]}}
{"component":"versus","data":{"left":{"label":"OPTION A","items":["fact"]},"right":{"label":"OPTION B","items":["fact"]}}}
{"component":"table","data":{"headers":["Col 1","Col 2"],"rows":[["a","b"]]}}
{"component":"bubbles","data":{"items":[{"label":"1-3 word","size":3},{"label":"1-3 word","size":2}]}}

TIER C — VECTOR:
{"component":"vector","data":{"keywords":"EVOCATIVE TOPIC KEYWORDS (3-5 words)","label":"SHORT LABEL","mood":"calm|energetic|scientific|playful"}}

Output valid JSON only — no wrapping quotes, no code fence, no explanation. Always output a valid component JSON — never output an empty string. If data is limited, use 'callout'.`;

export const REGENERATE_VECTOR_PROMPT = (topic: string, headline: string, body: string, attempt: number = 0) => {
  // Cycle through different conceptual angles on each regeneration attempt
  const angles = [
    "Focus on the MECHANISM — what physically happens inside the body.",
    "Focus on the METAPHOR — what abstract concept best represents the slide's emotional message.",
    "Focus on the OUTCOME — what the person experiences or gains.",
    "Focus on the CONTRAST — before vs after, problem vs solution.",
    "Focus on the SYSTEM — how this fits into a bigger biological or lifestyle cycle.",
  ];
  const angle = angles[attempt % angles.length];
  return `You are a visual designer for Lunia Life, a sleep supplement brand. Generate a FRESH vector illustration spec for this carousel slide.

Topic: "${topic}"
Headline: "${headline}"
Body: "${body}"

Creative direction for THIS regeneration: ${angle}
Pick keywords that express this specific angle — do NOT default to the most obvious topic words.

Output ONLY this exact JSON format, nothing else:
{"component":"vector","data":{"keywords":"SPACE-SEPARATED KEYWORDS (3-5 evocative words, e.g. sleep cortisol rhythm brain)","label":"SHORT DESCRIPTIVE LABEL (2-4 words, lowercase)","mood":"calm|energetic|scientific|playful"}}

Rules:
- keywords: pick DIFFERENT evocative words than the obvious topic. Think of what an editorial illustrator would draw for the given creative direction.
- label: a short lowercase caption that appears under the illustration (e.g. "sleep pressure", "cortisol peak", "neural recovery")
- mood: calm=relaxation/recovery/rest, energetic=activation/performance/boost, scientific=mechanisms/biology/research, playful=habits/lifestyle/routine
- Output ONLY the JSON object — no code fence, no explanation.`;
};

// ─── Engagement carousel prompt ───────────────────────────────────────────────
export const GENERATE_ENGAGEMENT_CAROUSEL_PROMPT = (
  topic: string,
  subType: "reveal" | "diagnostic" = "reveal",
  hasStyleRef = false,
  template: CarouselTemplate | null = null,
  brandStyle?: BrandStyle,
  /** Default true. See GENERATE_CAROUSEL_PROMPT for behaviour. */
  includeSeoFooter: boolean = true,
) => {
  const subTypeInstructions: Record<string, string> = {
    reveal: `REVEAL FORMAT: You are revealing a curated list of items (3 items, one per content slide). Each content slide reveals ONE item with a bold numbered headline (e.g. "#1: THE BLUE LIGHT TRAP") and a short 1-2 sentence explanation. End each slide body with a one-line teaser hinting at the next reveal (e.g. "But #2 is even worse..."). Build anticipation across slides. The final item should be the most surprising or impactful.`,
    diagnostic: `DIAGNOSTIC FORMAT: Each content slide presents one diagnostic question or symptom that the reader can identify with. Frame headlines as "DO YOU..." or "IF YOU..." questions. Body text explains what it means if the answer is yes, referencing science. Each slide should make the reader feel personally called out. Build toward a conclusion that the comment CTA resolves.`,
  };

  return `${template ? buildTemplateSection(template) : ""}${hasStyleRef ? STYLE_REFERENCE_PREFIX : ""}You are a UGC scriptwriter for Lunia Life, a sleep supplement brand. Generate an ENGAGEMENT carousel designed to drive comments and saves. Topic: "${topic}"

${subTypeInstructions[subType]}

Return ONLY valid JSON in this exact format, no other text:
{
  "hooks": [
    { "headline": "string — UPPERCASE, max 8 words, must create intense curiosity or challenge the reader", "subline": "string — max 10 words, deepen the intrigue", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "MANDATORY — Based on [Journal Name] research, [Year]" }
  ],
  "slides": [
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" }
  ],
  "cta": {
    "headline": "string — UPPERCASE, e.g. 'WANT THE FULL GUIDE?'",
    "followLine": "Comment the keyword below and we will send it to you."
  },
  "commentKeyword": "string — ONE short word (4-8 chars, ALL CAPS) that readers comment to get the guide. Based on the topic, e.g. SLEEP, CHRONO, SCORE, KILLERS, GUIDE, RESET. Must be memorable and relevant.",
  "caption": "string",
  "imagePrompt": "string"
}

Brand rules (follow exactly):
- No em dashes anywhere. Use commas or short sentences instead.
- No medical claims. Only use: "may support", "helps promote", "shown in studies", "associated with"
- Tone: dry, science-forward, minimal, confident. But with an edge of intrigue that drives engagement.
- Hook headlines: uppercase, punchy, max 8 words. For engagement, make them challenge the reader or promise a reveal.
- Hook sublines: sentence fragments, max 10 words, create tension. No period at end.
- Hook sourceNote: MANDATORY. Format: "Based on [real journal/institution] research, [year]". NEVER omit.
- Body copy: 1-2 sentences MAX. Punchy and direct. Under 40 words per slide.
- Citations: ONLY real peer-reviewed papers. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages.
- CTA headline: uppercase, max 6 words, creates urgency to comment.
- All headlines uppercase.
- Caption: Instagram caption. ${includeSeoFooter ? "4" : "3"} paragraphs. Open with the most engaging question or hook. Close with "Comment [KEYWORD] below to get the full guide. Follow @lunia_life for more." No hashtags. No em dashes.${includeSeoFooter ? BRAND_BRIDGE_INSTRUCTION : ""}
- graphic: compact single-line JSON using the same 3-tier routing rules (TIER A for data, TIER B for layout, TIER C for concept). MANDATORY VARIETY: all 3 slides MUST use different component types.
- imagePrompt: Recraft V3 prompt for hook background. Same rules as standard carousel — literal visual metaphor of hook headline. Max 55 words.
- commentKeyword: ONE word, 4-8 characters, ALL CAPS. Must be topically relevant and easy to type in a comment.`;
};

// ─── Did You Know format ─────────────────────────────────────────────────────

export const GENERATE_DID_YOU_KNOW_PROMPT = (topic: string, variantCount = 3, violations?: string[]) => {
  const violationBlock = violations && violations.length > 0
    ? `\n\nIMPORTANT: Your previous response had these violations. Fix them this time:\n${violations.map((v) => `- ${v}`).join("\n")}\n`
    : "";

  return `You are writing for Lunia Life, a sleep & longevity brand. Audience: health-literate adults 25-55, urban, evidence-driven. Voice: science-forward, calm, confident, never preachy.

Generate ${variantCount} variants of a 2-slide "Did You Know" Instagram carousel about: "${topic}".

Each variant is a frozen-template carousel:
- Slide 1: header is exactly "DID YOU KNOW?". Body presents a surprising, research-grounded fact (2 paragraphs).
- Slide 2: header is exactly "BY". Body presents a concrete actionable takeaway tied to the slide-1 fact (2 paragraphs).

Body copy is rendered as tokenized rich text. Each paragraph is an array of tokens. A token is { "text": string, "highlight": boolean }. Highlighted tokens render bold + teal-blue inline; non-highlighted tokens render charcoal regular weight.

Return ONLY valid JSON in this exact shape:
{
  "variants": [
    {
      "topic": "${topic}",
      "slide1": {
        "header": "DID YOU KNOW?",
        "body1": [{"text":"Women entering ","highlight":false},{"text":"perimenopause","highlight":true},{"text":" lose an average of ","highlight":false},{"text":"30 minutes","highlight":true},{"text":" of deep sleep per night.","highlight":false}],
        "body2": [{"text":"...","highlight":false}]
      },
      "slide2": {
        "header": "BY",
        "body1": [{"text":"...","highlight":false}],
        "body2": [{"text":"...","highlight":false}]
      },
      "caption": "3-paragraph IG caption tied to the fact and takeaway. Plain text, no hashtags, no em dashes."
    }
  ]
}

HARD RULES (violating any of these is failure):
1. NO em dashes (—) or en dashes (–) ANYWHERE. Use commas, periods, or short sentences.
2. NO medical claims. Forbidden words: cures, cure, treats, treat, heals, heal, prevents, prevent, diagnose, diagnoses, guaranteed, miracle. Use: "may support", "is associated with", "research suggests", "shown in studies".
3. NO product mentions. Do NOT name Lunia or any supplement product. The fact stands on its own.
4. Body length per slide: total characters across body1 + body2 must be 280-340. Count carefully.
5. Highlights per paragraph: 2-4. Highlight only substantive content words: nouns, numbers, adjectives, key verbs. NEVER highlight articles (a, an, the), prepositions (of, in, on, by, with, for), conjunctions (and, or, but), or filler verbs (is, are, was, were, be, been).
6. Token spacing: each token's text includes its own surrounding spaces. Tokens are concatenated with no separator. Example: [{"text":"Sleep ","highlight":false},{"text":"5 hours","highlight":true}] renders as "Sleep 5 hours" (the space lives at the end of the first token).
7. Slide 2 body MUST tie to Slide 1 fact. Slide 1 reveals a problem or insight; Slide 2 gives the actionable response.
8. Facts must be plausibly research-grounded. If you state a number, it should be defensible against published literature. Do NOT fabricate citations.
9. Variants must be MEANINGFULLY different angles on the same topic. Not paraphrases. Different framings, different facts, different takeaways.
10. Caption: 3 short paragraphs. Open with the most striking line. Middle paragraph adds depth. Close with a question or call to save the post. No hashtags. No em dashes.

Return JSON only. No commentary, no markdown fences, no preface.${violationBlock}`;
};
