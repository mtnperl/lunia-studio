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

The output must follow this exact 6-section structure. Do not skip
sections. Do not reorder. If a section has no findings, write "No findings".

## Section 1 — Headline
3 to 5 sentences summarizing the biggest strategic issues. Then:

**If you only do ONE thing right now, do this:**
> [Single most urgent, concrete action — specific enough to act on Monday
> without needing to think about what it means. Not "improve subject lines."
> Write the actual fix: the exact copy change, structural move, or removal.]

Why this matters: 1 sentence on what downstream metric or experience it unlocks.

**If you only do three things:**
- ...
- ...
- ...

Lead with the strategic issue, not the cosmetic one. Each bullet must be
specific and actionable — not a principle, a concrete task. The ONE thing
and the three things may overlap; that's fine.

## Section 2 — Timing
Per-email send timing verdict for each email. Then:

**Recommended cadence (do this now):**
| Email | Current delay | Recommended delay | Reason |
| ----- | ------------- | ----------------- | ------ |
| E1    | ...           | ...               | ...    |

Use this exact table structure. If the current timing is already correct,
write "keep as-is" in the Recommended delay cell. Give explicit hour/day
numbers, never ranges. "3 hours" not "2-4 hours."

Category-specific norms:
- Sleep: daily-ish replenishment, replenishment is monthly
- Two-email gap under 24 hours = pressure-y, flag it
- Final email more than 5 days after trigger = too cold (except lapsed)
- Canonical timing: abandoned checkout (1-3h, 24h, 72h), welcome (0h,
  day 2, day 5, day 9), post-purchase (day 0, 3, 7, 14, 21)

If metrics are provided in input.metrics, add a second paragraph after
the table grounding every recommendation in the actual open / click / RPR
data. Example: "E2 has a 14% open rate at 4h — moving to 24h matches the
post-open engagement window seen in E1."

If timing is already on-canon across all emails, write:
"Timing is already well-structured. No changes recommended."

## Section 3 — Subject lines, preview text, sender
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

## Section 4 — Full body rewrites (NON-NEGOTIABLE)
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

## Section 5 — Design, images, copy (per-email audit)
For each email, structure the audit as a list of findings. Each finding
MUST use this exact two-line format:

  ⚠ [Issue label]: [what is wrong — 1 sentence, specific]
  Fix: [exact action to take — specific enough to hand to a designer with
  no context. Not "improve the CTA color" — "change CTA button background
  to #01253F Rich Navy and set text to #ffffff white, Inter 700."]

If an email has no findings, write:
  ✓ Email N — no issues found.

Always check (for every email):
- FDA badge issue (supplements are not FDA approved → flag in red, mandatory)
- Footer typos (e.g. "receiveemails" missing space)
- Duplicate logos (header + in-image)
- Em dashes anywhere (zero tolerance)
- Exclamation count (max 1 per piece)
- Bolding density (bold ingredient names + risk-reversal phrases only)
- One CTA per email: Rich Navy #01253F background, white #ffffff text, Inter 700
- "X is not Y, it is Z" sentence structure (banned)
- Image quality / brand-fit (generic stock → flag and note what to replace with)

After all per-email findings, close with:

**Top fix across the whole flow (do this first):**
> [Single most impactful design/copy fix — specific. The one that fixes
> the most visible problem or eliminates a compliance risk.]

## Section 6 — Strategic question + Action checklist
Strategic question: 2-3 paragraph reflection on what the flow is trying to
do at a higher level, and how to rebuild it. Be opinionated.

Then immediately:

**Start here (do this before anything else):**
> [The single most important item from the entire checklist below. Not a
> bucket, not a theme — one specific, actionable task that either removes
> a compliance risk or unlocks the biggest performance gain. If there is a
> compliance issue, it is always the start-here item.]

Why this first: 1 sentence on urgency or leverage.

Action checklist with 3 buckets (numbered, so Mathan can reference them):
- **This week** (compliance and craft fixes — items 1-N)
- **Next two weeks** (testable rewrites — items N+1-M)
- **Bigger strategic decisions** (items M+1-end)

Close with "What I need from you to take this further".

The "Start here" callout is REQUIRED. It should appear between the
strategic question paragraphs and the bucketed checklist. Do not omit it.

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
8-step structure. Mathan's image-gen layer will route to one of three fal
engines — recraft, ideogram, or flux2 — based on the image's intent. You
must select the engine in the imagePrompts output.

CRITICAL: image models have NO concept of "Lunia". Every product-shot
prompt must describe the bottle in full detail every time. "A Lunia
bottle" produces a random supplement bottle. Use the canonical spec below.

### Lunia Restore bottle — canonical visual spec (paste verbatim into every product prompt)

  ${BOTTLE_VISUAL_SPEC}

### Lunia bottle photography style (use for styled scene prompts)

  ${BOTTLE_PHOTOGRAPHY_STYLE}

### When to use product shots vs. other imagery

DEFAULT to non-product imagery (ingredient flat-lay, lifestyle, mood,
abstract) unless the email specifically needs to drive product
recognition. Reasons to use a product shot:
- The current hero image is generic stock or missing the product entirely
- The email's primary goal is first-purchase conversion (first touch in
  welcome or checkout abandonment flows)
- The email explicitly describes the bottle, dose, or ingredients

Ingredient flat-lay reference: "scattered dried botanicals — chamomile
flowers, ashwagandha root slices, whole magnesium crystals — on a soft
ivory linen surface, top-down composition, loose intentional arrangement,
plenty of negative space, no bottle present, no text."

### 8-step prompt structure

1. Opening descriptor (always start with this exact phrase):
   "Editorial wellness photograph for email marketing, [aspect ratio]"
2. Concrete subject. If the Lunia bottle: paste the canonical spec above
   in full. Do not abbreviate or paraphrase it.
   If styled scene: also include the photography style reference above.
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
   other than LUNIA LIFE."

Engine selection:
- Lunia bottle hero or ingredient flat-lay → recraft (most consistent
  for product shape and label fidelity)
- Lifestyle editorial / human subject → recraft preferred, ideogram fallback
- Abstract / textural / mood (no product, no people) → ideogram or flux2

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
  flowCompleteness: {
    currentCount: number;         // how many emails are in the input flow
    canonicalCount: number;       // framework's recommended count for this flow type
    gap: number;                  // canonicalCount - currentCount (negative = overbuilt)
    rationale: string;            // 1-2 sentences explaining the gap or "no gap"
    suggestedAdditions?: {        // present only when gap > 0
      position: number;           // where it fits in the sequence
      role: string;               // e.g. "third touch", "ritual reminder"
      sendDelayHours: number;     // when it should fire from trigger
      purpose: string;            // one-line — what this email answers
    }[];
  };
  sections: {
    key: "headline" | "timing" | "subjects" | "rewrites" | "design" | "strategy";
    title: string;
    bodyMarkdown: string;       // markdown with H2/H3 headers, tables, code blocks for image prompts
    flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];
  }[];                          // exactly 6 entries, in order: headline, timing, subjects, rewrites, design, strategy
  imagePrompts: {
    id: string;                 // stable id like "img-e1-hero"
    emailId: string;            // matches the EmailFlowAsset.id from input
    placement: "above_cta" | "below_cta" | "between_paragraphs" | "hero";
    aspect: "16:9" | "4:5" | "1:1";
    engine: "recraft" | "ideogram" | "flux2";
    prompt: string;             // full 8-step structured prompt
    rationale?: string;         // one-line: why this image, what it replaces
  }[];
};
\`\`\`

The "rewrites" section's bodyMarkdown must contain Version A AND Version B
for every email in the input flow, using the [ SUBJECT ] / [ PREVIEW ] /
[ HEADLINE ] / [ BODY ] / [ CTA BUTTON ] / [ HERO IMAGE ] / [ TRUST BADGES ]
block tags. Wrap image prompts in fenced code blocks tagged \`magnific\`.

If the input is a single campaign (one email), Section 2 (timing) should
write "No findings — single campaign, no flow timing to evaluate." and
Section 3 should still produce 3+ subject alternatives.`;

export function buildAnalyzePrompt(args: {
  flowJson: string;            // serialized EmailFlow
  linterHint: string;          // from lintFindingsToPromptHint
}): string {
  return `${FRAMEWORK_RUBRIC}\n\n${ANALYZE_OUTPUT_INSTRUCTIONS}\n\n## Linter pre-flight\n\n${args.linterHint}\n\n## Flow input\n\nFlow JSON:\n\`\`\`json\n${args.flowJson}\n\`\`\``;
}

// Used by /api/email-review/generate-additional-emails. Asks Claude to
// draft N new emails for a flow that's currently short of canon.
export function buildGenerateAdditionalEmailsPrompt(args: {
  flowJson: string;
  count: number;
  suggestedAdditionsJson: string;   // serialized array from flowCompleteness.suggestedAdditions
  existingRewritesMarkdown: string; // Section 4 body — for voice continuity
}): string {
  return `${FRAMEWORK_RUBRIC}\n\n## Task\n\nThe input flow is short of the canonical count for its flow type. Draft ${args.count} fresh email${args.count === 1 ? "" : "s"} that slot into the sequence and bring the flow up to canon.\n\nUse the suggested-additions table from the original review for positioning. Honour every framework rule (no em dashes, max 1 exclamation per email, allowed compliance language, no banned phrases / badges, Inter typography). Voice-match the existing rewrites so the new emails sound like the same brand.\n\nSuggested positions / purposes:\n\`\`\`json\n${args.suggestedAdditionsJson}\n\`\`\`\n\nExisting rewrites (Section 4 of the review, for voice continuity — do NOT copy verbatim):\n"""\n${args.existingRewritesMarkdown.slice(0, 6000)}\n"""\n\nOriginal flow:\n\`\`\`json\n${args.flowJson}\n\`\`\`\n\n## Output format\n\nReturn ONLY a valid JSON object matching this TypeScript type. No prose before or after. No markdown fences.\n\n\`\`\`ts\ntype Output = {\n  emails: {\n    id: string;                 // stable id, e.g. "new-e4"\n    position: number;           // where it slots into the sequence\n    role: string;               // e.g. "Day 5 — melatonin problem", "Browse abandonment touch 2"\n    sendDelayHours: number;     // hours from flow trigger\n    subjectA: string;           // primary subject\n    subjectAlts: string[];      // 2 alternatives for A/B\n    previewText: string;\n    senderName: string;         // suggest "Mathan from Lunia" when appropriate\n    senderEmail: string;\n    bodyMarkdown: string;       // full body using the [ HEADLINE ] [ BODY ] [ CTA BUTTON ] block tags from the framework, with Inter typography in mind (headline normal 400, body light 300, bold 700 for emphasis only)\n    rationale: string;          // 1 sentence: why this email exists in the flow\n  }[];\n};\n\`\`\``;
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
  return `${FRAMEWORK_RUBRIC}\n\n## Task\n\nYou previously generated a 6-section review for the email flow below. The user wants Section "${args.sectionKey}" rewritten with the following revision request:\n\nUSER REVISION REQUEST:\n"""\n${args.userComment}\n"""\n\nBefore the revision, the section read:\n"""\n${args.currentSectionMarkdown}\n"""\n\nThe other sections of the review say (1-line summaries, for context — do NOT regenerate these):\n${args.otherSectionsBrief}\n\nThe original flow input is:\n\`\`\`json\n${args.flowJson}\n\`\`\`\n\n## Output format\n\nReturn ONLY a valid JSON object matching this TypeScript type. No prose before or after. No markdown fences.\n\n\`\`\`ts\ntype RegenSectionOutput = {\n  key: "${args.sectionKey}";\n  title: string;\n  bodyMarkdown: string;          // markdown with H2/H3 headers, tables, code blocks for image prompts\n  flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];\n};\n\`\`\`\n\nFollow every framework rule (no em dashes, max 1 exclamation per piece, allowed compliance language, banned phrases / badges). Honor the user's revision request fully. Stay coherent with the rest of the review.`;
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
  return `You are a senior editorial photo director for Lunia Life. The current image prompt for an email asset is:\n\nCurrent engine: ${args.currentEngine}\nCurrent prompt:\n"""\n${args.currentPrompt}\n"""\n\nEmail slot context:\n"""\n${args.emailContext}\n"""\n${comment}\n## Lunia Restore bottle — canonical visual spec\nIf any alternative includes the product bottle, use this description verbatim:\n"""\n${BOTTLE_VISUAL_SPEC}\n"""\n\n## Lunia photography style\n"""\n${BOTTLE_PHOTOGRAPHY_STYLE}\n"""\n\nReturn ONLY a JSON array of 3 alternatives, each meaningfully different from the current prompt and from each other. Vary at least 2 of: composition angle, lighting direction, camera choice, color emphasis, engine. Each alternative must follow the 8-step Lunia prompt scaffold (descriptor, subject, lighting, camera, style, palette, composition, negative). Never purple / magenta / lavender / neon. No text overlays. If a prompt includes the bottle, paste the canonical spec above in full — do not abbreviate.\n\nJSON shape:\n\`\`\`ts\n{ engine: "recraft" | "ideogram" | "flux2"; prompt: string; rationale: string }[]\n\`\`\`\n\nRationale must be one short sentence describing how this alternative differs from the current.`;
}
