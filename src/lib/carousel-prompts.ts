import type { BrandStyle, CarouselTemplate } from "./types";

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

const HOOK_TONE_INSTRUCTIONS: Record<string, string> = {
  "educational": "Educational tone: clear, factual, teaches the reader something they didn't know. Start with an insight.",
  "clickbait": "Clickbait tone: bold, provocative hooks that create urgency or disbelief. Still factually accurate.",
  "curiosity": "Curiosity-gap tone: tease an unexpected or counterintuitive insight. Make the reader want to know more.",
  "myth-bust": "Myth-busting tone: challenge a common misconception about sleep or supplements. Be direct and corrective.",
  "science-backed": "Science-backed tone: lead with research findings and data. Reference studies confidently.",
  "personal-story": "Personal-story tone: write as if a real person is sharing their journey with sleep problems and Lunia.",
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
  concise = false
) => {
  const svgColors = brandStyle
    ? [brandStyle.accent, brandStyle.headline, brandStyle.background, brandStyle.secondary, brandStyle.body, "#ffffff"].join(" ")
    : "#1e7a8a #1a2535 #c8dde8 #f0ece6 #9ab0b8 #ffffff";

  return `${template ? buildTemplateSection(template) : ""}${hasStyleRef ? STYLE_REFERENCE_PREFIX : ""}You are a UGC scriptwriter and content strategist for Lunia Life, a sleep supplement brand. Generate carousel content for this topic: "${topic}"

Hook tone: ${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}
${concise ? '\nCONCISE MODE — MANDATORY: Each slide body MUST be 1-2 sentences maximum (30 words max). No secondary claims. No caveats. One punch per slide. This OVERRIDES the default 3-5 sentence rule.' : ''}
Return ONLY valid JSON in this exact format, no other text:
{
  "hooks": [
    { "headline": "string", "subline": "string", "sourceNote": "Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "Based on [Journal Name] research, [Year]" },
    { "headline": "string", "subline": "string", "sourceNote": "Based on [Journal Name] research, [Year]" }
  ],
  "slides": [
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" },
    { "headline": "string", "body": "string", "citation": "string", "graphic": "string" }
  ],
  "cta": {
    "headline": "string",
    "followLine": "Follow @lunia_life for science-based sleep strategies."
  },
  "caption": "string",
  "imagePrompt": "string"
}

Brand rules (follow exactly):
- No em dashes anywhere. Use commas or short sentences instead.
- No medical claims. Only use: "may support", "helps promote", "shown in studies", "associated with"
- Tone: dry, science-forward, minimal, confident. Never motivational or cheesy.
- Hook headlines: uppercase, punchy, max 8 words
- Hook sublines: italic-style sentence fragments, max 10 words, create mild tension or curiosity. No period at end.
- Hook sourceNote: short trust liner shown at the bottom of the hook slide. Format: "Based on [real journal/institution] research, [year]". Must reference the most relevant real published research supporting the hook's claim. Max 8 words after "Based on". Never fabricate — only cite real sources.
- Body copy: 2-3 sentences MAX. First sentence is a bold punchy statement (the core insight). Remaining 1-2 sentences add specific factual support. Total under 60 words. References the cited research.
- Citations: ONLY real peer-reviewed papers with correct authors, journal names and years. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages. Hallucinated citations are unacceptable.
- CTA headline: short sharp statement, not a question, not a command, uppercase, max 6 words
- All headlines uppercase
- Caption: Instagram caption for this post. Write in 3 paragraphs separated by \n\n (double newline). Paragraph 1 (2 sentences): open with the most striking insight or stat — create tension or curiosity. Paragraph 2 (2-3 sentences): expand the idea — the mechanism, the evidence, the implication. Paragraph 3 (1-2 sentences): close with exactly "For more Sleep-Science content follow @lunia_life". No hashtags. No em dashes. Tone matches the hookTone.
- graphic: compact single-line JSON. MANDATORY VARIETY RULE: all 3 slides MUST use 3 DIFFERENT component types. Use this 3-tier routing to pick:

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
- imagePrompt: A Recraft V3 realistic_image photography prompt for the hook slide background image. The hook headline IS your creative brief — create a LITERAL VISUAL METAPHOR of the exact words in hooks[0].headline. Pull the most striking noun or verb from the headline and build a cinematic scene around it. The image should feel like a still frame of the hook happening.
  Examples of hook-to-image translation:
  • "ADENOSINE IS DROWNING YOUR BRAIN" → dark water engulfing, objects sinking into deep blue, air bubbles rising from below, cold undercurrent light
  • "MAGNESIUM IS YOUR BRAIN'S OFF SWITCH" → single light switch on a dark wall, the moment before it flips off, deep shadow, one cold highlight
  • "YOUR CORTISOL IS SPIKING" → sharp crystal formation breaking through dark water surface, jagged edges catching light, tension and rupture
  • "YOU'RE WIRED BUT TIRED" → tangled copper electrical wire in warm shallow-focus light, frayed at the end, quiet exhaustion
  Structure: [literal visual from the hook's key word/phrase] + [cinematic lighting] + [camera/composition] + [colour palette] + [mood].
  Hard rules: if the hook concept involves a human experience (fatigue, stress, a journey, a habit, waking up) you MAY include a single person or human detail — hands, a silhouette, or an editorial close-crop of a face — always partial framing, never a full portrait. No text, no logos. Ultra-sharp, editorial, premium brand aesthetic. Max 55 words. DO NOT illustrate the supplement or ingredient — illustrate the HOOK.
  Bad example (never do this): "Extreme macro of magnesium glycinate powder dissolving in dark water"`;
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

export const REGENERATE_GRAPHIC_PROMPT = (topic: string, headline: string, body: string, avoidComponents: string[] = []) =>
  `You are a data visualisation designer for Lunia Life, a sleep supplement brand. Generate a single infographic component for this carousel slide.

Topic: "${topic}"
Headline: "${headline}"
Body: "${body}"
${avoidComponents.length > 0 ? `ALREADY USED — do NOT pick any of these: ${avoidComponents.join(", ")}. You MUST choose a completely different component type.` : ''}
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
