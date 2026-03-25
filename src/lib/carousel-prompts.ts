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
    minimal: "1-2 sentences MAX per slide. Headlines must carry the full idea. Body is a single punchy line or two at most. This OVERRIDES the default 3-5 sentence rule.",
    medium: "2-3 sentences per slide. Concise and scannable. This OVERRIDES the default 3-5 sentence rule.",
    dense: "4-5 sentences per slide, detailed and citation-heavy. Match the default 3-5 sentence rule.",
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
  brandStyle?: BrandStyle
) => {
  const svgColors = brandStyle
    ? [brandStyle.accent, brandStyle.headline, brandStyle.background, brandStyle.secondary, brandStyle.body, "#ffffff"].join(" ")
    : "#1e7a8a #1a2535 #c8dde8 #f0ece6 #9ab0b8 #ffffff";

  return `${template ? buildTemplateSection(template) : ""}${hasStyleRef ? STYLE_REFERENCE_PREFIX : ""}You are a UGC scriptwriter and content strategist for Lunia Life, a sleep supplement brand. Generate carousel content for this topic: "${topic}"

Hook tone: ${HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["educational"]}

Return ONLY valid JSON in this exact format, no other text:
{
  "hooks": [
    { "headline": "string", "subline": "string" },
    { "headline": "string", "subline": "string" },
    { "headline": "string", "subline": "string" }
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
- Body copy: 3-5 sentences, specific and factual, references the cited research
- Citations: ONLY real peer-reviewed papers with correct authors, journal names and years. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages. Hallucinated citations are unacceptable.
- CTA headline: short sharp statement, not a question, not a command, uppercase, max 6 words
- All headlines uppercase
- Caption: Instagram caption for this post. 6-9 sentences that tease the carousel content, share a key insight or stat from the slides, and build curiosity to read the full carousel. No hashtags. No em dashes. Tone matches the hookTone. Always end with exactly: "For more Sleep-Science content follow @lunia_life"
- graphic: compact single-line JSON object — pick the component that best visualises this slide's key data point or insight. MANDATORY VARIETY RULE: All 3 slides MUST use 3 DIFFERENT component types — never repeat the same component across slides. Rotate through the full range of available components. Available components (use REAL numbers/facts from the slide, never invent) — listed in suggested rotation order:
  {"component":"dotchain","data":{"steps":["Step 1","Step 2","Step 3"]}}  — 3-5 connected chain steps showing a process or mechanism
  {"component":"wave","data":{"points":[{"label":"TIME OR LABEL","value":NUMBER},{"label":"TIME OR LABEL","value":NUMBER}],"unit":"optional unit"}}  — trend/wave line showing values over time or stages, 2-6 points
  {"component":"iconGrid","data":{"items":[{"icon":"EMOJI","label":"SHORT LABEL"},{"icon":"EMOJI","label":"SHORT LABEL"}],"columns":3}}  — grid of icon+label pairs, 2-9 items, use for lists of benefits/features
  {"component":"donut","data":{"segments":[{"label":"NAME","value":NUMBER,"color":"optional hex"},{"label":"NAME","value":NUMBER}],"centerLabel":"optional total or key stat"}}  — donut/pie chart for 2-5 part breakdown
  {"component":"versus","data":{"left":{"label":"OPTION A","items":["fact","fact"]},"right":{"label":"OPTION B","items":["fact","fact"]}}}  — two-way comparison
  {"component":"pyramid","data":{"levels":["Most specific (top)","Middle","Base (widest)"]}}  — 2-5 level hierarchy
  {"component":"callout","data":{"text":"KEY STAT OR QUOTE FROM THE BODY","source":"optional brief citation"}}  — bold pull-quote highlight
  {"component":"table","data":{"headers":["Col 1","Col 2"],"rows":[["a","b"]]}}  — 2-4 columns, 1-5 rows
  {"component":"split","data":{"parts":[{"label":"NAME","percent":70,"value":"optional"},{"label":"NAME","percent":30}]}}  — percentage breakdown of 2-4 parts
  {"component":"timeline","data":{"events":[{"time":"LABEL","label":"DESCRIPTION"}]}}  — 2-6 chronological events
  {"component":"stat","data":{"stat":"NUMBER","unit":"UNIT_OR_EMPTY_STRING","label":"WHAT IT MEANS"}}  — one big number or percentage
  {"component":"bars","data":{"items":[{"label":"NAME","value":"VALUE"},{"label":"NAME","value":"VALUE"}]}}  — 2-4 items for side-by-side comparison
  {"component":"steps","data":{"steps":["Step 1","Step 2","Step 3"]}}  — 2-4 sequential steps or a mechanism
  {"component":"checklist","data":{"items":["Item one","Item two","Item three"]}}  — 2-5 key facts or actions
  {"component":"radial","data":{"value":"87%","label":"ADULTS MAGNESIUM DEFICIENT","sublabel":"optional context"}}  — single big % or score on a bold speedometer arc
  {"component":"circleStats","data":{"items":[{"value":"7-9","sublabel":"hrs","label":"OPTIMAL SLEEP"},{"value":"23%","label":"MORE REM SLEEP"}]}}  — 2-4 ringed stat circles side by side, ideal for comparing 2-4 related metrics
  {"component":"spectrum","data":{"min":0,"max":12,"from":7,"to":9,"label":"OPTIMAL SLEEP RANGE","unit":"hrs"}}  — highlight a healthy/optimal range on a min-max scale
  {"component":"funnel","data":{"stages":[{"label":"AWARENESS","percent":100},{"label":"INTEREST","percent":62},{"label":"CONVERSION","percent":18}]}}  — 2-5 stage funnel showing drop-off or progression
  {"component":"scorecard","data":{"score":"A+","label":"SLEEP QUALITY RATING","sublabel":"optional"}}  — large grade/score with corner bracket styling
  {"component":"bubbles","data":{"items":[{"label":"Magnesium","size":3},{"label":"L-Theanine","size":2},{"label":"Glycine","size":1}]}}  — 2-5 bubbles sized by importance (size 1-3), ideal for ingredient clusters
  {"component":"iconStat","data":{"icon":"🧠","value":"23%","unit":"increase","label":"ALPHA BRAIN WAVES","sublabel":"optional"}}  — hero emoji + big number + label, for one standout stat with a visual anchor
  {"component":"matrix2x2","data":{"topLeft":"Fast+Effective","topRight":"Fast,Less Effective","bottomLeft":"Slow+Effective","bottomRight":"Avoid","xLabel":"SPEED","yLabel":"EFFECTIVENESS"}}  — 2x2 quadrant matrix for positioning or trade-off analysis
  {"component":"stackedBar","data":{"segments":[{"label":"LIGHT SLEEP","percent":55,"value":"4.4 hrs"},{"label":"DEEP SLEEP","percent":22,"value":"1.8 hrs"},{"label":"REM","percent":23,"value":"1.8 hrs"}],"title":"optional title"}}  — single stacked bar showing how a whole divides into parts (2-5 segments)
  {"component":"processFlow","data":{"steps":["Tryptophan absorbed","Converted to 5-HTP","Serotonin synthesised","Melatonin released"]}}  — 2-5 arrow-connected process steps in a horizontal flow
  {"component":"heatGrid","data":{"cells":[{"label":"Mon","value":3},{"label":"Tue","value":1},{"label":"Wed","value":2}],"title":"optional title"}}  — grid of cells coloured by intensity (1=low 2=mid 3=high), for patterns across days/items
  Output valid JSON only — no wrapping quotes, no code fence, no explanation. If no meaningful visualisation fits the content, output exactly ""
- imagePrompt: A Recraft V3 realistic_image photography prompt for the hook slide background image. The hook headline IS your creative brief — create a LITERAL VISUAL METAPHOR of the exact words in hooks[0].headline. Pull the most striking noun or verb from the headline and build a cinematic scene around it. The image should feel like a still frame of the hook happening.
  Examples of hook-to-image translation:
  • "ADENOSINE IS DROWNING YOUR BRAIN" → dark water engulfing, objects sinking into deep blue, air bubbles rising from below, cold undercurrent light
  • "MAGNESIUM IS YOUR BRAIN'S OFF SWITCH" → single light switch on a dark wall, the moment before it flips off, deep shadow, one cold highlight
  • "YOUR CORTISOL IS SPIKING" → sharp crystal formation breaking through dark water surface, jagged edges catching light, tension and rupture
  • "YOU'RE WIRED BUT TIRED" → tangled copper electrical wire in warm shallow-focus light, frayed at the end, quiet exhaustion
  Structure: [literal visual from the hook's key word/phrase] + [cinematic lighting] + [camera/composition] + [colour palette] + [mood].
  Hard rules: no people, no faces, no text, no logos • ultra-sharp, editorial, premium brand aesthetic • max 55 words • DO NOT illustrate the supplement or ingredient — illustrate the HOOK.
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
- Body copy: 3-5 sentences, specific and factual
- Citations: ONLY real peer-reviewed papers. Format: Author FM, et al. Title. Journal. Year;Vol(Issue):Pages.
- Headline: uppercase, max 8 words
- graphic: same GraphicSpec JSON rules as the main carousel prompt — compact single-line JSON, real data only, "" if none`;

export const REGENERATE_GRAPHIC_PROMPT = (topic: string, headline: string, body: string, currentComponent?: string) =>
  `You are a data visualisation designer for Lunia Life, a sleep supplement brand. Generate a single infographic component for this carousel slide.

Topic: "${topic}"
Headline: "${headline}"
Body: "${body}"
${currentComponent ? `Current component (DO NOT use this — pick a different one): "${currentComponent}"` : ''}
Return ONLY a valid compact single-line JSON object. Pick the component that best visualises the key data point or insight from the body text. MANDATORY: you MUST use a different component type than the current one above. Available components (use REAL numbers/facts from the body, never invent):

{"component":"dotchain","data":{"steps":["Step 1","Step 2","Step 3"]}}
{"component":"wave","data":{"points":[{"label":"LABEL","value":NUMBER}],"unit":"optional unit"}}
{"component":"iconGrid","data":{"items":[{"icon":"EMOJI","label":"SHORT LABEL"}],"columns":3}}
{"component":"donut","data":{"segments":[{"label":"NAME","value":NUMBER}],"centerLabel":"optional"}}
{"component":"versus","data":{"left":{"label":"OPTION A","items":["fact","fact"]},"right":{"label":"OPTION B","items":["fact","fact"]}}}
{"component":"pyramid","data":{"levels":["Top level","Middle","Base"]}}
{"component":"callout","data":{"text":"KEY STAT OR QUOTE","source":"optional brief citation"}}
{"component":"table","data":{"headers":["Col 1","Col 2"],"rows":[["a","b"]]}}
{"component":"split","data":{"parts":[{"label":"NAME","percent":70},{"label":"NAME","percent":30}]}}
{"component":"timeline","data":{"events":[{"time":"LABEL","label":"DESCRIPTION"}]}}
{"component":"stat","data":{"stat":"NUMBER","unit":"UNIT_OR_EMPTY_STRING","label":"WHAT IT MEANS"}}
{"component":"bars","data":{"items":[{"label":"NAME","value":"VALUE"},{"label":"NAME","value":"VALUE"}]}}
{"component":"steps","data":{"steps":["Step 1","Step 2","Step 3"]}}
{"component":"checklist","data":{"items":["Item one","Item two","Item three"]}}
{"component":"radial","data":{"value":"87%","label":"ADULTS MAGNESIUM DEFICIENT","sublabel":"optional context"}}
{"component":"circleStats","data":{"items":[{"value":"7-9","sublabel":"hrs","label":"OPTIMAL SLEEP"},{"value":"23%","label":"MORE REM"}]}}
{"component":"spectrum","data":{"min":0,"max":12,"from":7,"to":9,"label":"OPTIMAL SLEEP RANGE","unit":"hrs"}}
{"component":"funnel","data":{"stages":[{"label":"STAGE 1","percent":100},{"label":"STAGE 2","percent":60},{"label":"STAGE 3","percent":28}]}}
{"component":"scorecard","data":{"score":"A+","label":"SLEEP QUALITY RATING","sublabel":"optional"}}
{"component":"bubbles","data":{"items":[{"label":"Magnesium","size":3},{"label":"L-Theanine","size":2},{"label":"Glycine","size":1}]}}
{"component":"iconStat","data":{"icon":"🧠","value":"23%","unit":"increase","label":"ALPHA BRAIN WAVES"}}
{"component":"matrix2x2","data":{"topLeft":"Fast+Effective","topRight":"Fast+Less","bottomLeft":"Slow+Effective","bottomRight":"Avoid","xLabel":"SPEED","yLabel":"EFFECTIVENESS"}}
{"component":"stackedBar","data":{"segments":[{"label":"LIGHT","percent":55,"value":"4.4 hrs"},{"label":"DEEP","percent":22,"value":"1.8 hrs"},{"label":"REM","percent":23,"value":"1.8 hrs"}],"title":"optional title"}}
{"component":"processFlow","data":{"steps":["Tryptophan absorbed","Converted to 5-HTP","Serotonin synthesised","Melatonin released"]}}
{"component":"heatGrid","data":{"cells":[{"label":"Mon","value":3},{"label":"Tue","value":1},{"label":"Wed","value":2}],"title":"optional title"}}

Output valid JSON only — no wrapping quotes, no code fence, no explanation. If no meaningful visualisation fits, output exactly "".`;
