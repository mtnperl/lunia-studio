import type { CarouselTemplate } from "./types";

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
  template: CarouselTemplate | null = null
) => `${template ? buildTemplateSection(template) : ""}${hasStyleRef ? STYLE_REFERENCE_PREFIX : ""}You are a UGC scriptwriter and content strategist for Lunia Life, a sleep supplement brand. Generate carousel content for this topic: "${topic}"

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
  "caption": "string"
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
- graphic: Inline SVG infographic that visualizes the key insight from THIS slide. Rules: use viewBox="0 0 936 440" with NO explicit width/height on the svg element • Colors only: #1e7a8a #1a2535 #c8dde8 #f0ece6 #9ab0b8 #ffffff • font-family="Inter,system-ui,sans-serif" • No JS, no external resources, no gradients, no filters, no shadows • Output as a single compact line, max 1600 chars • Use REAL data/numbers from the slide text — do not invent • Design for the full 440px height — spread content vertically, use large numbers (120-180px font), generous spacing, a title label at top and a sub-label below the visual element • Choose the most appropriate type: stat callout (big number/%), bar comparison, numbered timeline (2-4 steps), concept grid (2-4 labeled boxes), or flow diagram • If no meaningful visual can be derived, output exactly ""`;

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
- graphic: same rules as main carousel prompt — SVG infographic, viewBox="0 0 936 440", single compact line max 1600 chars, design for full 440px height with large numbers and generous spacing, real data only, "" if none`;
