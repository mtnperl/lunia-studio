// Prompts for the Email Flow Review Studio.
// FRAMEWORK_VERSION should bump whenever the underlying framework doc changes.
// Brand guidelines are in lunia-brand-guidelines.ts — always import from there.

import { BRAND_GUIDELINES, BOTTLE_VISUAL_SPEC, BOTTLE_PHOTOGRAPHY_STYLE, BRAND_VERSION } from "@/lib/lunia-brand-guidelines";

export const FRAMEWORK_VERSION = "v1.0";

// The core framework — distilled from Lunia_Email_Flow_Review_Framework.docx.
// Kept inline so the build doesn't depend on the .docx existing on disk.
const FRAMEWORK_RUBRIC = `# LUNIA LIFE — Email Flow Review Framework v1.0 (Brand Guidelines v${BRAND_VERSION})

You are running an email flow review for Lunia Life, a science-first sleep
and wellness supplement brand.

## Audience identification — read before writing a single word

The target audience for every finding, rewrite, and recommendation is
defined EXCLUSIVELY by what is written inside the actual email subject
lines, body text, and flow trigger being reviewed right now. Not by
the brand name. Not by the sleep/wellness category. Not by anything
you know about Lunia from training data.

Rules (all mandatory):
1. Default to a generic adult — any adult who wants better sleep or
   recovery — unless the email text explicitly names a demographic.
2. Only shift to a specific audience (women, hormonal health, any life
   stage, any condition) if the email copy already names or clearly
   implies that group.
3. Do NOT tell the brand who they should be targeting. Evaluate whether
   the email serves the audience the email itself signals, nothing more.
4. "Add [demographic] context" is only valid advice when the email
   already contains signals for that demographic. A generic abandoned
   checkout email is not a missed opportunity for any demographic
   framing — review it as a generic abandoned checkout email.

The output must follow this exact 5-section structure. Do not skip
sections. Do not reorder. If a section has no findings, write "No findings".

## Section 1 — Timing
Per-email send timing verdict for each email. Open with a summary table:

**Recommended cadence:**
| Email | Current delay | Recommended delay | Reason |
| ----- | ------------- | ----------------- | ------ |
| E1    | ...           | ...               | ...    |

Use this exact table structure. Give explicit hour/day numbers, never
ranges. "3 hours" not "2-4 hours." If the current timing is already
correct, write "keep as-is" in the Recommended delay cell.

Category-specific norms:
- Two-email gap under 24 hours = pressure-y, flag it
- Final email more than 5 days after trigger = too cold (except lapsed)
- Canonical timing: abandoned checkout (1-3h, 24h, 72h), welcome (0h,
  day 2, day 5, day 9), post-purchase (day 0, 3, 7, 14, 21)

If metrics are provided in input.metrics, add a paragraph after the
table grounding each recommendation in the actual open / click / RPR
data.

After the table, add a ⚠ finding block for EVERY email where timing
needs to change. Use this exact two-line format:

  ⚠ E[N] — [short issue label, e.g. "gap too short", "first touch delayed"]
  Fix: Change send delay to [X hours / Y days]. [One sentence: why this
  timing matches the category norm or the metrics signal.]

For emails where timing is already correct, write a ✓ line instead:
  ✓ E[N] — timing on-canon, no change needed.

If ALL emails are on-canon, write a single line:
  ✓ Timing is well-structured across the whole flow. No changes needed.

## Section 2 — Subject lines, preview text, sender
Per-email, use this exact structure (in this order):

  ### Email N — <stable id>
  | Field   | Current |
  | ------- | ------- |
  | Subject | ... |
  | Preview | ... |
  | Sender  | ... |

  **What works:** 1 sentence.
  **What doesn't:** 1-2 sentences.

  **Recommended change (do this now):**
  > SUB: <single recommended subject line>
  > PRE: <single recommended preview>
  > SENDER: <kept-as-is OR a specific replacement>

  Why this works: 1 sentence — what cognitive lever it pulls (curiosity,
  specificity, science, real-human sender, etc.).

  **Then A/B test these alternatives:**
  1. SUB: ... / PRE: ...
  2. SUB: ... / PRE: ...
  3. SUB: ... / PRE: ...

The "Recommended change" is REQUIRED for every email — it's the single
"do this on Monday" pick. Then the 3 A/B alternatives are the followup
experiments. Do not skip either part.

Rules:
- Subject lines never lead with the action ("Complete your order")
- Subject lines never lead with a discount code
- Preview text extends the subject, never paraphrases it
- If sender is generic (info@lunialife.com), the Recommended change OR
  one of the A/B alternatives should test "Mathan from Lunia /
  mathan@lunialife.com" on at least one email in the flow.
- The Recommended change must be a specific subject + preview pair, not
  a vague principle. "Lead with curiosity" is wrong. "Still thinking
  about it" with preview "A short read on why the three ingredients
  work together, not separately" is right.

## Section 3 — Full body rewrites (NON-NEGOTIABLE)
For each email, open with:

**Recommended version (implement this): Version A**
> Why: 1 sentence on the single most important structural or voice change
> made versus the current email.

Then provide both versions in plain text:
- Version A (RECOMMENDED — implement this first): on-canon, content-led,
  no discount or subscription-tied discount only
- Version B (fallback — only if discount must stay): keeps a one-time
  discount if Mathan insists, but reframed to fix structural and brand-
  voice issues. Do not label Version B as "also good" — it is a
  compromise, say so plainly.

Each version uses these block tags (every tag required, no skipping):
[ SUBJECT ]
[ PREVIEW ]
[ HEADLINE ]
[ BODY ]
[ CTA BUTTON ]
[ HERO IMAGE ] (with placement note: above_cta / below_cta / between_paragraphs / hero)
[ TRUST BADGES ] (which to keep / remove)

Close with a "Notes on the rewrite" subsection covering: em dash check,
exclamation count, bolding logic, compliance language, discount logic.

The "Recommended version" callout is REQUIRED for every email. Do not
skip it. Do not reverse-label Version B as recommended. Version A is
always the default action, Version B is always the fallback.

## Section 4 — Design and images (per-email visual audit)
SCOPE: visual design, layout, images, and brand-identity only. Do NOT
audit copy, voice, tone, word choice, banned phrases, em dashes,
exclamation counts, or bolding density here — those are covered in
Section 2 (subject lines) and Section 3 (body rewrites). If you notice a
copy issue, do not flag it in this section; it belongs in Section 4.

For each email, structure the audit as a list of findings. Each finding
MUST use this exact two-line format:

  ⚠ [Issue label]: [what is wrong — 1 sentence, specific]
  Fix: [exact action to take — specific enough to hand to a designer with
  no context. Not "improve the CTA color" — "change CTA button background
  to #01253F Rich Navy and set text to #ffffff white, Inter 700."]

If an email has no design findings, write:
  ✓ Email N — no design issues found.

Design checklist (check every email against each of these):
- **FDA / trust badge compliance**: any FDA Approved, Doctor Recommended,
  or Clinically Proven badge is a mandatory red-flag. Flag it, name the
  exact badge, and specify the replacement (e.g. "replace with 'Third-Party
  Tested' or remove entirely").
- **CTA button spec**: one CTA per email, Rich Navy #01253F background,
  white #ffffff text, Inter 700 Bold. Flag wrong color, wrong font weight,
  or multiple CTAs.
- **Logo**: duplicate logos (header logo + logo baked into a hero image),
  missing logo, or logo at wrong scale.
- **Hero image quality and brand-fit**: generic stock photography with no
  relevance to sleep or Lunia's aesthetic — flag it and describe what the
  replacement should look like (see image prompt scaffold below).
- **Color palette compliance**: any purple, magenta, lavender, neon, or
  heavy gradient in the email design. Lunia palette: Deep Navy #102635,
  Rich Navy #01253F, Slate Blue #2C3F51, Soft Ivory #F7F4EF, Aqua Accent
  #BFFBF8 (max 5-10%), Signal Yellow #FFD800 (accent/badge only, not CTA).
- **Image-to-text ratio and visual hierarchy**: all-text emails with no
  visual break; images too small to carry weight; text overlapping images
  in a way that kills readability.
- **Mobile layout**: images wider than the text column, padding too tight
  for a 375px viewport, buttons too small to tap (<44px height).
- **Footer**: visible typos or formatting bugs (e.g. "receiveemails"
  missing a space, broken unsubscribe link text, wrong address).

After all per-email findings, close with:

**Top design fix across the whole flow (do this first):**
> [Single most impactful visual fix — specific. Prioritise compliance
> issues (FDA badge) over aesthetic ones.]

## Section 5 — Strategic question + Action checklist
Strategic question: 2-3 paragraph reflection on what the flow is trying to
do at a higher level, and how to rebuild it. Be opinionated.

Then the "Start here" item as a ⚠ finding block (REQUIRED — do not omit):

  ⚠ Start here: [The single most important task from the whole review —
  specific and actionable, not a theme. Compliance issues always come
  first. If there is an FDA badge, that is the start-here item.]
  Fix: [Exact step to take. One sentence — no padding.]

Why this first: 1 sentence on urgency or leverage.

Then the full action checklist. Use ⚠ format for EVERY item so Mathan
can check each one off individually. Three buckets:

**This week** — compliance and craft fixes:

  ⚠ This week — [item label]: [what is wrong or missing]
  Fix: [exact action — specific enough to hand to someone without context]

(one ⚠ block per item; repeat for every This-week item)

**Next two weeks** — testable rewrites and A/B experiments:

  ⚠ Next two weeks — [item label]: [what to test or improve]
  Fix: [exact A/B setup or edit — name the email, the field, the change]

(one ⚠ block per item)

**Bigger strategic decisions** — structural or positioning questions:

  ⚠ Strategic decision — [item label]: [the decision or question]
  Fix: [what to decide, build, or research — with a suggested direction]

(one ⚠ block per item)

Close with a short "What I need from you to take this further" paragraph
(prose, not ⚠ items — this is a prompt for next steps, not a checklist).

The "Start here" ⚠ block is REQUIRED. It must appear immediately after
the strategic question paragraphs and before the three-bucket checklist.

${BRAND_GUIDELINES}

## Discount logic (email-specific, supplements)
Default: remove all one-time-purchase discounts. Use education and proof.
If a discount must stay: tie to subscription only ($29.20/month).
Final-touch discounts: only if framed as "no urgency, no expiry".

## Trust badge rules (email-specific)
Allowed: No GMO, Vegan (with verification), GMP Certified, FDA Registered
Facility, Third-Party Tested, Made in USA (if true), Cruelty-Free.
Banned: FDA Approved, Doctor Recommended, Clinically Proven (unless real).

## Flow completeness — canonical counts

The framework prescribes a canonical email count per flow type. Always
evaluate the input flow against this table and surface the gap in the
\`flowCompleteness\` output field.

  Abandoned checkout:    3 emails (1-3h, 24h, 72h)
  Browse abandonment:    2 emails (4-12h, 48h)
  Welcome:               4 emails over 10 days (immediate, day 2, day 5, day 9)
  Post-purchase:         5 emails over 21 days (day 0, day 3, day 7, day 14, day 21)
  Replenishment:         3 emails (replenishment-5d, replenishment-day, replenishment+14d)
  Lapsed:                2 emails over 30 days (day 0, day 14)
  Campaign:              1 email (no flow completeness applies)

A flow with FEWER than the canonical count is incomplete and must be
flagged with a specific rationale in flowCompleteness.rationale. A flow
with MORE than the canonical count is overbuilt and should also be
flagged — recommend which positions to cut. Equal count → no gap.

## Image prompt scaffold (8-step structure)
When the review recommends a new image, write a prompt in this exact
8-step structure. Every email image is rendered with OpenAI GPT Image 2
via fal — no engine selection needed. Lunia's logo is always attached
as a reference automatically; you only need to decide which product /
lifestyle / ingredient assets (from the brand asset library, listed
below in the input) should also be attached as references for THIS
specific image.

CRITICAL: image models have NO concept of "Lunia". Every product-shot
prompt must describe the bottle in full detail every time. "A Lunia
bottle" produces a random supplement bottle. Use the canonical spec below.

### Lunia Restore bottle — canonical visual spec (paste verbatim into every product prompt)

  ${BOTTLE_VISUAL_SPEC}

### Lunia bottle photography style (use for styled scene prompts)

  ${BOTTLE_PHOTOGRAPHY_STYLE}

### Lifestyle-first visual philosophy

Lunia Life emails are ALWAYS lifestyle by default. The product bottle
is a rare exception, not the default. Every image should feel like it
belongs in Kinfolk or Aesop's editorial — warm, textural, slow, human.

**Default: lifestyle imagery. Always.**
Product shots are reserved for one narrow case: the single first-touch
conversion email where the body copy explicitly discusses the bottle,
dose, or formulation. Every other email in every flow gets a lifestyle
or ingredient image.

### Lifestyle scene taxonomy (6 archetypes — always pick from these)

1. **Morning light ritual** — diffused early morning window light,
   hands cupping a ceramic mug, soft linen robe, steam rising, bedside
   table with a journal and amber glass. Mood: unhurried, optimistic.

2. **Evening wind-down** — low warm lamplight, person reading or lying
   in white linen sheets, dim room, soft shadow gradients, candle glow
   in the background. Mood: restorative, quiet, anticipatory of rest.

3. **Restorative stillness** — close crop of a face in repose or a
   person's hands folded on a duvet, eyes closed, natural light from a
   single direction, breath implied by stillness. Mood: deep calm.

4. **Botanical close-up** — macro or near-macro of chamomile flowers,
   ashwagandha root slices, or magnesium crystals on linen, ivory
   marble, or aged wood. Loose arrangement, plenty of negative space,
   no bottle present, no text, top-down or 30° angle.

5. **Body in rest** — editorial crop of bare shoulders, a forearm
   draped over a pillow, or feet in soft socks on linen — no face
   required. Cinematic, tasteful, human without being clinical.

6. **Ambient nature texture** — moonlit botanical garden at dusk,
   mist over tall grass at dawn, or macro of dried herbs in a ceramic
   bowl. Abstract and evocative, zero product presence.

**When a product shot IS justified:**
Only use a product shot if ALL three conditions are true:
- This is the first touch in a welcome or checkout-abandonment flow
- The email body explicitly references the bottle, dose, or formulation
- No lifestyle scene meaningfully reinforces the email's message

Ingredient flat-lay reference (use for archetype 4):
"scattered dried botanicals — chamomile flowers, ashwagandha root
slices, whole magnesium crystals — on a soft ivory linen surface,
top-down composition, loose intentional arrangement, plenty of negative
space, no bottle present, no text."

### Two image prompts per email — always

Generate EXACTLY 2 imagePrompts for every email:
- **hero** placement: the emotional/aspirational opener — anchored to
  the email's specific opening moment or core promise.
- **above_cta** or **below_cta** placement: a supporting shot that
  visually resolves what the CTA delivers — the feeling after clicking.

Both prompts must be lifestyle unless the email meets all three
product-shot conditions above.

### Content-first anchoring — MANDATORY before writing any image prompt

Before choosing any archetype or writing any prompt, read the email's:
- **Subject line** — what emotional hook is being made?
- **Preview text** — what specific moment or benefit is teased?
- **Headline** — what is the single core promise?
- **Body copy** — what specific imagery, metaphors, or moments does the
  copy invoke? (e.g. "nights you finally rest," "the hour before bed,"
  "your body rebuilding overnight")
- **CTA** — what action and implied outcome is the email driving toward?

Derive the scene from the copy, not from a generic archetype label.
The archetype is a starting constraint, not the final answer. Specific
words in the email should appear or be reflected in the prompt's scene
detail.

**Content → archetype decision guide:**

| Email moment / message               | Hero archetype          | CTA-area archetype        |
|--------------------------------------|-------------------------|---------------------------|
| Urgency / cart left behind           | Evening wind-down       | Morning light (the ritual they almost skipped) |
| "You haven't slept well"             | Body in rest (longing)  | Restorative stillness (the promise) |
| Science / ingredient education       | Botanical close-up      | Restorative stillness     |
| Shipping / product on the way        | Morning light ritual    | Body in rest (anticipation) |
| Subscription / ritual continuity     | Evening wind-down       | Morning light (streak maintained) |
| Social proof / testimonial           | Restorative stillness   | Ambient nature texture    |
| Lapsed / re-engagement               | Body in rest (absence)  | Evening wind-down (return)|
| Welcome / brand intro                | Morning light ritual    | Botanical close-up        |

The table is a guide, not a rigid rule. If the email copy strongly
invokes a different scene, follow the copy.

**Scene specificity rule:** every prompt must contain at least one
detail that could ONLY belong to this specific email — a prop, a
time-of-day cue, a texture, a body posture — drawn directly from the
copy. Generic scenes that could illustrate any email are rejected.

Examples of copy-grounded scene details:
- Subject "The hour before bed matters" → scene centres on the 45-minute
  wind-down window: dim lamp, book face-down, the act of setting a glass
  down on a nightstand — not just "person in bed."
- Subject "Your sleep is different after 35" → body detail: a forearm
  with subtle age texture resting on linen, morning light, journal open
  to a blank page — implies the chapter-of-life angle without saying it.
- CTA "Start your ritual tonight" → CTA-area image: hands laying out
  items on a bedside table at dusk — staging, not sleeping.

### 8-step prompt structure

1. Opening descriptor (always start with this exact phrase):
   "Editorial wellness photograph for email marketing, [aspect ratio]"
2. Concrete subject — derived from the email's copy (see content-first
   anchoring above). Name the archetype in brackets, then describe the
   specific scene: who/what, what they're doing, what objects are present,
   what moment in time. Minimum 2 copy-grounded scene details.
   If a product shot is genuinely justified: paste the canonical bottle
   spec above in full — do not abbreviate. Also include the photography
   style reference.
3. Lighting (direction + quality — e.g. "soft diffused north-facing
   window light, no hard shadows")
4. Camera + lens (e.g. "Hasselblad medium format, 80mm lens, f/2.8,
   shallow depth of field")
5. Style references (1–2 max from: Kinfolk, Aesop, Cereal, NYT T Magazine)
6. Color palette (warm cream, natural stone, amber glass, soft sage —
   never purple, magenta, lavender, neon)
7. Composition note (where negative space sits for headline / CTA overlay)
8. Negative prompt:
   "Avoid: generic supplement stock, clinical pharmacy aesthetic, harsh
   contrast, AI rendering artifacts (extra fingers, gibberish label text,
   melted edges), purple or magenta tones, gradient backgrounds, neon,
   oversaturation, competitor branding, any legible text on the label
   other than LUNIA LIFE, stock-photo bedroom sets, fake-smiling wellness
   models, product-on-plinth compositions, clinical white seamless
   backgrounds, busy flat-lays with 12+ ingredients."

## Reference asset selection
For every imagePrompt, choose which assets from the brand asset library
(supplied in the input as a JSON list of \`{ id, assetType, name }\`)
should be attached as references for this specific image. Output the
chosen IDs as \`referenceAssetIds: string[]\`.

Selection rules:
- The logo is always attached automatically — do NOT include it in
  referenceAssetIds. (If you accidentally do, it'll be deduped.)
- For product-hero shots → include the product asset(s) the email
  actually promotes. If the email mentions Restore, attach the Restore
  product image. Do not attach unrelated products.
- For ingredient flat-lays / textural mood / lifestyle shots without
  the product → leave referenceAssetIds empty (\`[]\`). Forcing a product
  asset into a non-product image produces cluttered output.
- If no product is mentioned by name in the email body → empty array.

## Patterns to kill on sight
- "Complete your order" subject lines
- "Final reminder: use code X" subject lines
- Manufactured urgency on always-running discount codes
- Pain-point hook copy in checkout abandonment
- Subject line repeated in preview text
- FDA Approved badge
- Em dashes
- Multiple exclamation marks
- "X is not Y, it is Z" structure
- Discount-led second touch in abandonment flows`;

// Output schema instructions — appended to FRAMEWORK_RUBRIC for the analyze
// call. Claude must return JSON matching this exact shape.
const ANALYZE_OUTPUT_INSTRUCTIONS = `## Output format

Return ONLY a valid JSON object matching this TypeScript type. No prose
before or after. No markdown fences.

\`\`\`ts
type AnalyzeOutput = {
  ifYouOnlyDoThree: string[];   // exactly 3 items
  flowCompleteness: {             // REQUIRED — always include, even when gap === 0
    currentCount: number;         // how many emails are in the input flow
    canonicalCount: number;       // framework's recommended count for this flow type
    gap: number;                  // canonicalCount - currentCount (negative = overbuilt)
    rationale: string;            // 1-2 sentences explaining the count vs canon, always
    suggestedAdditions?: {        // present only when gap > 0
      position: number;           // where it fits in the sequence
      role: string;               // e.g. "third touch", "ritual reminder"
      sendDelayHours: number;     // when it should fire from trigger
      purpose: string;            // one-line — what this email answers
    }[];
  };                              // never omit this field — the UI always shows the count chip
  sections: {
    key: "timing" | "subjects" | "rewrites" | "design" | "strategy";
    title: string;
    bodyMarkdown: string;       // markdown with H2/H3 headers, tables, code blocks for image prompts
    flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];
  }[];                          // exactly 5 entries, in order: timing, subjects, rewrites, design, strategy
  imagePrompts: {
    id: string;                 // stable id like "img-e1-hero" or "img-e1-above_cta"
    emailId: string;            // matches the EmailFlowAsset.id from input
    placement: "above_cta" | "below_cta" | "between_paragraphs" | "hero";
    aspect: "16:9" | "4:5" | "1:1";
    engine: "gpt-image-2";      // always — every email image uses GPT Image 2
    prompt: string;             // full 8-step structured prompt, lifestyle archetype by default
    referenceAssetIds: string[];// asset IDs from the brand library (see "Reference asset selection" above). Logo is auto-attached, do NOT include it. For lifestyle shots: empty array [].
    rationale?: string;         // one-line: why this image, which lifestyle archetype was chosen
  }[];
  // RULE: generate EXACTLY 2 imagePrompts per email — one "hero" and one
  // "above_cta" or "below_cta". Both must be lifestyle unless the email is a
  // confirmed first-touch conversion email with explicit product copy.
};
\`\`\`

The "rewrites" section (Section 3) bodyMarkdown must contain Version A AND Version B
for every email in the input flow, using the [ SUBJECT ] / [ PREVIEW ] /
[ HEADLINE ] / [ BODY ] / [ CTA BUTTON ] / [ HERO IMAGE ] / [ TRUST BADGES ]
block tags. Wrap image prompts in fenced code blocks tagged \`magnific\`.

If the input is a single campaign (one email), Section 1 (timing) should
write "No findings — single campaign, no flow timing to evaluate." and
Section 2 should still produce 3+ subject alternatives.`;

// ─── Legacy single-call prompt (kept for reference / short flows) ─────────────
export function buildAnalyzePrompt(args: {
  flowJson: string;
  linterHint: string;
  concise?: boolean;
  assetCatalog?: AssetCatalogEntry[];
}): string {
  const conciseHint = args.concise
    ? `\n\n## CONCISENESS CONSTRAINT (active on this run)\nOutput length is tightly limited. For Section 3 (rewrites), keep EACH Version A and Version B body to 180 words maximum. For Section 2 (subjects), limit each email to 3 A/B alternatives maximum. All other sections: trim to the most actionable findings only. The JSON must close completely — an unclosed JSON object is useless. Prioritise a complete, valid JSON response over exhaustive detail.\n`
    : "";
  const catalog = formatAssetCatalog(args.assetCatalog ?? []);
  return `${FRAMEWORK_RUBRIC}${conciseHint}\n\n${ANALYZE_OUTPUT_INSTRUCTIONS}\n\n## Linter pre-flight\n\n${args.linterHint}\n\n## Brand asset library\n\n${catalog}\n\n## Flow input\n\nFlow JSON:\n\`\`\`json\n${args.flowJson}\n\`\`\``;
}

// ─── Phase 1 of 2: everything EXCEPT the body rewrites ─────────────────────
// Returns: ifYouOnlyDoThree, flowCompleteness, sections[timing/subjects/design/strategy],
// imagePrompts. The rewrites section is generated separately in Phase 2 so
// the combined output never exceeds the 32k token ceiling.

const PHASE1_OUTPUT_INSTRUCTIONS = `## Output format (Phase 1 of 2)

Return ONLY a valid JSON object. No prose before or after. No markdown fences.

IMPORTANT: Do NOT include a "rewrites" section — that will be generated in Phase 2.

\`\`\`ts
type Phase1Output = {
  ifYouOnlyDoThree: string[];   // exactly 3 items — top wins across the whole review
  flowCompleteness: {             // REQUIRED — always include, even when gap === 0
    currentCount: number;
    canonicalCount: number;
    gap: number;
    rationale: string;
    suggestedAdditions?: {
      position: number;
      role: string;
      sendDelayHours: number;
      purpose: string;
    }[];
  };
  sections: {
    key: "timing" | "subjects" | "design" | "strategy";   // NO rewrites here
    title: string;
    bodyMarkdown: string;
    flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];
  }[];                            // exactly 4 entries: timing, subjects, design, strategy
  imagePrompts: {
    id: string;                   // e.g. "img-e1-hero" or "img-e1-above_cta"
    emailId: string;
    placement: "above_cta" | "below_cta" | "between_paragraphs" | "hero";
    aspect: "16:9" | "4:5" | "1:1";
    engine: "gpt-image-2";        // always — every email image uses GPT Image 2
    prompt: string;               // full 8-step structured prompt, lifestyle archetype by default
    referenceAssetIds: string[];  // asset IDs from the brand library; logo is auto-attached, do NOT list it here. For lifestyle shots: [].
    rationale?: string;           // which lifestyle archetype was chosen and why
  }[];
  // RULE: generate EXACTLY 2 imagePrompts per email — one "hero" and one
  // "above_cta" or "below_cta". Both must be lifestyle unless the email is a
  // confirmed first-touch conversion email with explicit product copy.
};
\`\`\`

If the input is a single campaign (one email), Section 1 (timing) should
write "No findings — single campaign, no flow timing to evaluate." and
Section 2 should still produce 3+ subject alternatives.`;

/**
 * Compact representation of a brand asset for prompt injection. Only the
 * three fields Claude needs to choose references — keeps token cost down.
 */
export type AssetCatalogEntry = { id: string; assetType: string; name: string };

function formatAssetCatalog(assets: AssetCatalogEntry[]): string {
  if (!assets.length) {
    return `(no brand assets uploaded yet — leave referenceAssetIds as [] for every image)`;
  }
  // List as compact JSON; Claude parses this consistently.
  return `Brand asset library (use these IDs for referenceAssetIds):\n\`\`\`json\n${JSON.stringify(assets, null, 2)}\n\`\`\``;
}

export function buildAnalyzePhase1Prompt(args: {
  flowJson: string;
  linterHint: string;
  assetCatalog?: AssetCatalogEntry[];
}): string {
  const catalog = formatAssetCatalog(args.assetCatalog ?? []);
  return `${FRAMEWORK_RUBRIC}\n\n${PHASE1_OUTPUT_INSTRUCTIONS}\n\n## Linter pre-flight\n\n${args.linterHint}\n\n## Brand asset library\n\n${catalog}\n\n## Flow input\n\nFlow JSON:\n\`\`\`json\n${args.flowJson}\n\`\`\``;
}

// ─── Phase 2 lean context ─────────────────────────────────────────────────
// Phase 2 ONLY writes body rewrites — it doesn't need the timing rubric,
// the subject-line rubric, the design rubric, the strategy rubric, the flow
// completeness table, or the 8-step image prompt scaffold. Sending those wastes
// ~5 000 input tokens and invites the model to drift into analysis it's not
// supposed to do. This context block covers everything Phase 2 actually needs:
// brand voice, product facts, compliance rules, Section 3 format, bottle spec.

const PHASE2_REWRITE_RUBRIC = `# LUNIA LIFE — Email Rewrite Context (Brand Guidelines v${BRAND_VERSION})

You are writing email body rewrites for Lunia Life, a science-first sleep
and wellness supplement brand. Your ONLY output in this call is the full
"Section 3 — Full body rewrites" block for the email flow provided.

Write for the audience the email's own copy already signals. Do not infer
a demographic unless the original email explicitly names one. A generic
abandoned checkout email is not a missed opportunity for demographic
framing — treat it as what it is.

${BRAND_GUIDELINES}

## Discount logic
Default: remove all one-time-purchase discounts. Use education and proof.
If a discount must stay: tie to subscription only ($29.20/month).
Final-touch discounts: only if framed as "no urgency, no expiry".

## Trust badge rules
Allowed: No GMO, Vegan (with verification), GMP Certified, FDA Registered
Facility, Third-Party Tested, Made in USA (if true), Cruelty-Free.
Banned: FDA Approved, Doctor Recommended, Clinically Proven (unless real).

## Patterns to kill on sight
- "Complete your order" subject lines
- "Final reminder: use code X" subject lines
- Manufactured urgency on always-running discount codes
- Pain-point hook copy in checkout abandonment
- Subject line repeated in preview text
- FDA Approved badge
- Em dashes (—) — replace with comma or period
- Multiple exclamation marks
- "X is not Y, it is Z" structure
- Discount-led second touch in abandonment flows

## Section 3 — Full body rewrites format

For each email, open with:

**Recommended version (implement this): Version A**
> Why: 1 sentence on the single most important structural or voice change
> made versus the current email.

Then provide both versions in plain text:
- Version A (RECOMMENDED — implement this first): on-canon, content-led,
  no discount or subscription-tied discount only
- Version B (fallback — only if discount must stay): keeps a one-time
  discount if Mathan insists, but reframed. Do not label Version B as
  "also good" — it is a compromise, say so plainly.

Each version uses these block tags (every tag required, no skipping):
[ SUBJECT ]
[ PREVIEW ]
[ HEADLINE ]
[ BODY ]
[ CTA BUTTON ]
[ HERO IMAGE ] — 1-2 sentence brief: what the image shows, where it sits
  (above_cta / below_cta / between_paragraphs / hero). If it includes the
  Lunia bottle, describe it as: amber glass supplement bottle, mountain
  landscape label illustration, wide black ribbed cap.
[ TRUST BADGES ] — list which badges to keep or remove

Close with a "Notes on the rewrite" subsection: em dash check, exclamation
count, bolding logic, compliance language, discount logic.

The "Recommended version" callout is REQUIRED for every email. Version A is
always the default action, Version B is always the fallback.`;

// ─── Lean context for additional-email generation and single-email revision ──
// Same principle as PHASE2_REWRITE_RUBRIC — these calls write email copy, not
// analysis. Strip the analysis-only sections so the prompt stays tight.
export const ADDITIONAL_EMAIL_RUBRIC = `# LUNIA LIFE — Email Drafting Context (Brand Guidelines v${BRAND_VERSION})

You are drafting email copy for Lunia Life, a science-first sleep supplement brand.
Write for the audience the flow's own copy signals. Do not infer demographics
unless the existing emails explicitly name one.

${BRAND_GUIDELINES}

## Discount logic
Default: remove all one-time-purchase discounts. Use education and proof.
If a discount must stay: tie to subscription only ($29.20/month).

## Trust badge rules
Allowed: No GMO, Vegan, GMP Certified, FDA Registered Facility, Third-Party Tested,
Made in USA (if true), Cruelty-Free.
Banned: FDA Approved, Doctor Recommended, Clinically Proven.

## Patterns to kill
- "Complete your order" subject lines
- Manufactured urgency on always-running codes
- Pain-point hooks in checkout abandonment
- Subject line repeated in preview
- Em dashes — replace with comma or period
- More than 1 exclamation per email
- "X is not Y, it is Z" structure`;

// ─── Phase 2 of 2: body rewrites only ──────────────────────────────────────
// Takes the Phase 1 brief (key findings from timing/subjects/design) for
// voice and context coherence, then generates the full rewrites section
// (Section 3 — Version A + Version B per email).

const PHASE2_OUTPUT_INSTRUCTIONS = `## Output format (Phase 2 of 2)

Return ONLY a valid JSON object. No prose before or after. No markdown fences.

\`\`\`ts
type Phase2Output = {
  key: "rewrites";
  title: string;                 // "Full body rewrites"
  bodyMarkdown: string;          // Version A + Version B for every email in the flow,
                                 // using the block tags from Section 3 of the framework
  flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];
};
\`\`\`

The bodyMarkdown MUST contain Version A AND Version B for every email, using the
[ SUBJECT ] / [ PREVIEW ] / [ HEADLINE ] / [ BODY ] / [ CTA BUTTON ] /
[ HERO IMAGE ] / [ TRUST BADGES ] block tags. Each version must close with a
"Notes on the rewrite" paragraph covering em dash check, exclamation count, discount logic.`;

export function buildAnalyzePhase2Prompt(args: {
  flowJson: string;
  /** One-line summaries from Phase 1 to keep rewrites coherent with the analysis. */
  phase1Brief: string;
}): string {
  // Use the lean rubric — Phase 2 doesn't need the timing / subjects / design /
  // strategy rubrics, the flow completeness table, or the image prompt scaffold.
  // Sending those wastes ~5 000 input tokens per call.
  return `${PHASE2_REWRITE_RUBRIC}\n\n${PHASE2_OUTPUT_INSTRUCTIONS}\n\n## Phase 1 context (already generated — do NOT repeat these sections, just use them for coherence)\n\n${args.phase1Brief}\n\n## Flow input\n\nFlow JSON:\n\`\`\`json\n${args.flowJson}\n\`\`\``;
}

// Used by /api/email-review/generate-additional-emails. Asks Claude to
// draft N new emails for a flow that's currently short of canon.
export function buildGenerateAdditionalEmailsPrompt(args: {
  flowJson: string;
  count: number;
  suggestedAdditionsJson: string;   // serialized array from flowCompleteness.suggestedAdditions
  existingRewritesMarkdown: string; // Section 3 body — for voice continuity
}): string {
  // Use the lean rubric — no timing / design / strategy rubrics needed here,
  // just brand voice + copy rules. Trim the existing rewrites to 3 000 chars
  // max — enough for voice matching without burning unnecessary input tokens.
  const rewriteSample = args.existingRewritesMarkdown.slice(0, 3_000);
  return `${ADDITIONAL_EMAIL_RUBRIC}\n\n## Task\n\nThe input flow is short of the canonical count for its flow type. Draft ${args.count} fresh email${args.count === 1 ? "" : "s"} that slot into the sequence and bring the flow up to canon.\n\nUse the suggested-additions table from the original review for positioning. Honour every framework rule (no em dashes, max 1 exclamation per email, allowed compliance language, no banned phrases / badges). Voice-match the existing rewrites so the new emails sound like the same brand.\n\nSuggested positions / purposes:\n\`\`\`json\n${args.suggestedAdditionsJson}\n\`\`\`\n\nExisting rewrites (for voice continuity — do NOT copy verbatim):\n"""\n${rewriteSample}\n"""\n\nOriginal flow:\n\`\`\`json\n${args.flowJson}\n\`\`\`\n\n## Output format\n\nReturn ONLY a valid JSON object matching this TypeScript type. No prose before or after. No markdown fences.\n\n\`\`\`ts\ntype Output = {\n  emails: {\n    id: string;                 // stable id, e.g. "new-e4"\n    position: number;           // where it slots into the sequence\n    role: string;               // e.g. "Day 5 — melatonin problem", "Browse abandonment touch 2"\n    sendDelayHours: number;     // hours from flow trigger\n    subjectA: string;           // primary subject\n    subjectAlts: string[];      // 2 alternatives for A/B\n    previewText: string;\n    senderName: string;         // suggest "Mathan from Lunia" when appropriate\n    senderEmail: string;\n    bodyMarkdown: string;       // full body using the [ HEADLINE ] [ BODY ] [ CTA BUTTON ] block tags, Inter typography in mind\n    rationale: string;          // 1 sentence: why this email exists in the flow\n  }[];\n};\n\`\`\``;
}

// Used by /api/email-review/regenerate-section. Re-runs the framework on a
// single section with the user's revision request, plus the original flow
// + existing review for context. Returns ONE updated section.
export function buildRegenerateSectionPrompt(args: {
  flowJson: string;
  sectionKey: "headline" | "timing" | "subjects" | "rewrites" | "design" | "strategy";
  currentSectionMarkdown: string;
  userComment: string;
  otherSectionsBrief: string;     // 1-line summaries of the other 5 sections so the regen stays coherent
}): string {
  return `${FRAMEWORK_RUBRIC}\n\n## Task\n\nYou previously generated a 5-section review for the email flow below. The user wants Section "${args.sectionKey}" rewritten with the following revision request:\n\nUSER REVISION REQUEST:\n"""\n${args.userComment}\n"""\n\nBefore the revision, the section read:\n"""\n${args.currentSectionMarkdown}\n"""\n\nThe other sections of the review say (1-line summaries, for context — do NOT regenerate these):\n${args.otherSectionsBrief}\n\nThe original flow input is:\n\`\`\`json\n${args.flowJson}\n\`\`\`\n\n## Output format\n\nReturn ONLY a valid JSON object matching this TypeScript type. No prose before or after. No markdown fences.\n\n\`\`\`ts\ntype RegenSectionOutput = {\n  key: "${args.sectionKey}";\n  title: string;\n  bodyMarkdown: string;          // markdown with H2/H3 headers, tables, code blocks for image prompts\n  flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];\n};\n\`\`\`\n\nFollow every framework rule (no em dashes, max 1 exclamation per piece, allowed compliance language, banned phrases / badges). Honor the user's revision request fully. Stay coherent with the rest of the review.`;
}

// Used by /api/email-review/regenerate-additional-email. Revises a single
// generated email with the user's guidance, keeping position / role intact.
export function buildReviseAdditionalEmailPrompt(args: {
  flowJson: string;
  existingEmailJson: string;     // the AdditionalEmail to revise (JSON)
  userComment: string;           // Mathan's revision guidance
  existingRewritesMarkdown: string; // Section 3 body — for voice continuity
}): string {
  // Use lean rubric. Trim rewrite sample to 2 000 chars — enough for voice
  // matching a single email revision without burning unnecessary input tokens.
  const rewriteSample = args.existingRewritesMarkdown.slice(0, 2_000);
  return `${ADDITIONAL_EMAIL_RUBRIC}

## Task

Revise one previously generated email for this flow. Keep position, role, and
sendDelayHours unchanged — those structural decisions are locked in. Apply the
user's revision request to everything else: subject, preview, sender, body copy,
and rationale.

USER REVISION REQUEST:
"""
${args.userComment}
"""

Email to revise:
\`\`\`json
${args.existingEmailJson}
\`\`\`

Existing flow rewrites (voice reference — do NOT copy verbatim):
"""
${rewriteSample}
"""

Original flow:
\`\`\`json
${args.flowJson}
\`\`\`

## Output format

Return ONLY a valid JSON object matching this TypeScript type. No prose before or after. No markdown fences.

\`\`\`ts
type AdditionalEmail = {
  id: string;                 // preserve the original id exactly
  position: number;           // preserve unchanged
  role: string;               // preserve unchanged
  sendDelayHours: number;     // preserve unchanged
  subjectA: string;
  subjectAlts: string[];      // 2 A/B alternatives
  previewText: string;
  senderName: string;
  senderEmail: string;
  bodyMarkdown: string;       // [ HEADLINE ] [ BODY ] [ CTA BUTTON ] block tags
  rationale: string;
  createdAt: string;          // preserve the original createdAt value
};
\`\`\`

Honor every brand rule (no em dashes, max 1 exclamation per email, no banned phrases / badges). Honor the user's revision request fully.`;
}

// Used by /api/email-review/regen-suggestions. Asks Claude for 3 alternatives
// that vary along the prompt's axes.
export function buildRegenSuggestionsPrompt(args: {
  currentPrompt: string;
  currentEngine: string;
  emailContext: string;        // headline + body + intent of the slot
  userComment?: string;        // optional "what was wrong with the current image"
}): string {
  const comment = args.userComment?.trim()
    ? `\nUser comment on what to change:\n"${args.userComment}"\n`
    : "";
  return `You are a senior editorial photo director for Lunia Life. The current image prompt for an email asset is:\n\nCurrent engine: ${args.currentEngine}\nCurrent prompt:\n"""\n${args.currentPrompt}\n"""\n\nEmail slot context:\n"""\n${args.emailContext}\n"""\n${comment}\n## Lifestyle-first visual philosophy\nLunia Life email images are ALWAYS lifestyle by default. The 6 approved lifestyle archetypes are:\n1. Morning light ritual — hands on ceramic mug, linen robe, bedside table, steam, amber glass\n2. Evening wind-down — low warm lamplight, white linen sheets, candle glow, person reading or at rest\n3. Restorative stillness — close crop of face in repose or hands on a duvet, eyes closed, natural light\n4. Botanical close-up — macro chamomile flowers / ashwagandha root / magnesium crystals on linen or marble, no bottle\n5. Body in rest — editorial crop of bare shoulders, forearm on pillow, or feet in socks on linen; cinematic\n6. Ambient nature texture — moonlit botanical garden, mist over grass at dawn, dried herbs in ceramic bowl\n\nProduct shots are ONLY justified when the email is a confirmed first-touch conversion email that explicitly discusses the bottle, dose, or formulation. All other regeneration suggestions must use lifestyle archetypes.\n\n## Lunia Restore bottle — canonical visual spec\nIf (and only if) a product shot is truly warranted, use this description verbatim:\n"""\n${BOTTLE_VISUAL_SPEC}\n"""\n\n## Lunia photography style\n"""\n${BOTTLE_PHOTOGRAPHY_STYLE}\n"""\n\nBEFORE generating alternatives, identify from the email slot context: (1) the core emotional moment or promise the email makes, (2) any specific imagery or metaphors in the copy, (3) what outcome the CTA implies. Use those specifics to ground each alternative in this email's content — not in a generic interpretation of the archetype.\n\nReturn ONLY a JSON array of 3 alternatives, each meaningfully different from the current prompt and from each other. At least 2 of the 3 alternatives must use a lifestyle archetype (name which archetype in the rationale). Each alternative must contain at least one scene detail drawn directly from the email copy. Vary at least 2 of: archetype, composition angle, lighting direction, camera choice, color emphasis. Each alternative must follow the 8-step Lunia prompt scaffold (descriptor, subject, lighting, camera, style, palette, composition, negative). Never purple / magenta / lavender / neon. No text overlays. No stock-photo bedroom sets, fake-smiling wellness models, product-on-plinth, clinical white backgrounds, or busy flat-lays.\n\nJSON shape:\n\`\`\`ts\n{ engine: "recraft" | "ideogram" | "flux2"; prompt: string; rationale: string }[]\n\`\`\`\n\nRationale: one sentence naming the archetype and citing the specific email copy element it's grounded in.`;
}

// ─── Create-flow prompt ────────────────────────────────────────────────────────
// Used by /api/email-review/create-flow. Takes a plain-English use case and
// generates a complete, publish-ready EmailFlow following all framework rules.

export const CREATE_FLOW_OUTPUT_INSTRUCTIONS = `## Output format

Return ONLY a valid JSON object. No prose before or after. No markdown fences.

\`\`\`ts
type CreateFlowOutput = {
  flowType: "abandoned_checkout" | "browse_abandonment" | "welcome"
          | "post_purchase" | "replenishment" | "lapsed" | "campaign";
  flowName: string;           // short display name, e.g. "Abandoned Checkout — 3-email"
  trigger: string;            // Klaviyo trigger description, e.g. "Started Checkout event"
  emails: {
    id: string;               // "e1", "e2", ...
    position: number;         // 1, 2, 3, ...
    role: string;             // e.g. "Day 0 — urgency trigger", "Day 3 — social proof"
    subject: string;          // the final subject line
    previewText: string;      // preview text that EXTENDS the subject, never paraphrases
    senderName: string;       // recommend "Mathan from Lunia" for at least one touch
    senderEmail: string;      // mathan@lunialife.com or hello@lunialife.com
    sendDelayHours: number;   // hours after trigger
    bodyText: string;         // full email body using the block tags below
    rationale: string;        // one sentence: what this email's job is in the sequence
  }[];
};
\`\`\`

The bodyText for each email MUST use these block tags (every tag required):
[ HEADLINE ]     — 4-10 words, Inter 400 normal weight
[ BODY ]         — 80-180 words, Inter 300 light, 1-2 bold phrases max
[ CTA BUTTON ]   — 3-6 words, Rich Navy #01253F background, white text, Inter 700
[ HERO IMAGE ]   — describe the ideal image in 1-2 sentences (this is a brief, not the full prompt)
[ TRUST BADGES ] — list which badges to show: only allowed ones (No GMO, GMP Certified, Third-Party Tested, etc.)

Rules for every email:
- No em dashes anywhere
- Maximum 1 exclamation mark per email total
- No "FDA Approved", "Doctor Recommended", "Clinically Proven"
- Subject lines never lead with the action ("Complete your order")
- Preview text extends the subject, never paraphrases it
- No manufactured urgency on always-running discount codes
- Use the canonical send-delay timing for the flow type (e.g. abandoned checkout: 1-3h, 24h, 72h)
- Generate the canonical number of emails for the chosen flow type`;

export function buildCreateFlowPrompt(args: { useCase: string }): string {
  return `${FRAMEWORK_RUBRIC}

## Task

A Lunia Life team member has described a new email flow they need. Draft the complete,
publish-ready flow from scratch. Determine the best flow type and canonical email count
from the description, then write every email following every framework rule.

USER USE CASE:
"""
${args.useCase}
"""

${CREATE_FLOW_OUTPUT_INSTRUCTIONS}`;
}

// ─── Carousel → Email prompt ──────────────────────────────────────────────────
// Used by /api/email-review/carousel-to-email. Takes a SavedCarousel and converts
// its content into a publish-ready EmailFlow. The carousel content is the source
// of truth — Claude adapts it, doesn't reinvent it.

import type { SavedCarousel } from "@/lib/types";

export function buildCarouselToEmailPrompt(args: {
  carousel: SavedCarousel;
  userComment?: string;
}): string {
  const { carousel, userComment } = args;
  const hook = carousel.content.hooks[carousel.selectedHook] ?? carousel.content.hooks[0];

  // Build slide section — branches on did_you_know vs standard/engagement
  let slidesSection: string;
  if (carousel.format === "did_you_know" && carousel.didYouKnowContent) {
    const dyk = carousel.didYouKnowContent;
    const tokenExcerpt = dyk.slide1.body1
      .slice(0, 8)
      .map((t) => t.text)
      .join(", ");
    slidesSection = `Slides:
  - S1: "${dyk.slide1.header}" — ${tokenExcerpt}`;
  } else {
    const slides = carousel.content.slides;
    const s1 = slides[0];
    const s2 = slides[1];
    const s3 = slides[2];
    const lines: string[] = [];
    if (s1) lines.push(`  - S1: "${s1.headline}" — ${s1.body}`);
    if (s2) lines.push(`  - S2: "${s2.headline}" — ${s2.body}`);
    if (s3) lines.push(`  - S3: "${s3.headline}" — ${s3.body}`);
    slidesSection = `Slides:\n${lines.join("\n")}`;
  }

  const cta = carousel.content.cta;
  const commentSection = userComment?.trim()
    ? `\nADDITIONAL INSTRUCTIONS: ${userComment.trim()}\n`
    : "";

  return `${ADDITIONAL_EMAIL_RUBRIC}

## Task

Convert this Instagram carousel into a publish-ready Lunia Life email flow.
Use the carousel's hook, slides, and CTA as the creative brief. Adapt the same
angle, science, and voice into email format. Do not invent claims or angles not
present in the carousel. Default to a single campaign email unless the content
clearly warrants a 2-email sequence.

CAROUSEL SOURCE:
Topic: ${carousel.topic}
Hook: "${hook?.headline ?? ""}" / "${hook?.subline ?? ""}"
${slidesSection}
CTA: "${cta.headline}" — ${cta.followLine}
${commentSection}
${CREATE_FLOW_OUTPUT_INSTRUCTIONS}`;
}
