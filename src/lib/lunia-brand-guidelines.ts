// Lunia Life — CMS Generation Handbook
// Source: Lunia_CMS_Generation_Handbook.docx (v1.0, May 10 2026)
// This is the authoritative brand reference for ALL content generation:
// emails, captions, ad copy, image prompts, and rewrites.
// Every content generation prompt should import BRAND_GUIDELINES.
// Update this file whenever the handbook doc changes; bump BRAND_VERSION.

export const BRAND_VERSION = "1.0";
export const BRAND_UPDATED = "2026-05-10";

// ─── Product canon ────────────────────────────────────────────────────────────

export const PRODUCT = {
  name: "Lunia Restore",
  format: "Capsules",
  capsulesPerBottle: 60,
  servingsPerBottle: 30,
  dose: "2 capsules, 30–60 minutes before bed",
  price1Bottle: 38.93,
  priceSubscription: 29.20,
  price3Bottles: 99.30,
  pricePerServing: "<$1",
  reviewCount: 558,
  reviewStars: 4.9,
  fiveStarPct: 91,
  customerCount: "78,000+",
  ingredients: [
    {
      name: "Magnesium Bisglycinate",
      dose: "500 mg (90 mg elemental)",
      mechanism:
        "Bioavailable chelated form. Potentiates GABA-A receptor activity, lowers neuronal excitability. Glycine component supports lower core body temperature and interacts with NMDA receptors for deeper sleep.",
      allowedClaims: [
        "Supports sleep quality, especially in adults with lower magnesium intake",
        "Bioavailable chelated form of magnesium",
        "Glycine component supports lower core body temperature and interacts with NMDA receptors",
        "Potentiates GABA-A receptor activity",
        "Associated with improvements in self-reported sleep quality in clinical trials",
      ],
    },
    {
      name: "L-Theanine",
      dose: "300 mg",
      mechanism:
        "Non-protein amino acid from green tea. Blocks glutamate, enhances GABA, supports serotonin and dopamine. Promotes relaxation without sedation.",
      allowedClaims: [
        "Supports relaxation without sedation",
        "Shown in studies to support sleep onset and sleep quality",
        "Enhances GABA levels and modulates serotonin and dopamine",
        "Blocks glutamate receptors, supporting a calmer nervous system",
        "Associated with reduced perceived stress in clinical trials at 400mg/day",
      ],
    },
    {
      name: "Apigenin",
      dose: "50 mg",
      mechanism:
        "Flavonoid from chamomile. Binds the benzodiazepine site of GABA-A receptors, enhances inhibitory neurotransmission. Studied for stress reduction and NAD+ pathway.",
      allowedClaims: [
        "A flavonoid found in chamomile",
        "Binds the benzodiazepine site of GABA-A receptors",
        "Supports inhibitory neurotransmission, associated with calming effects",
        "Chamomile extract (containing apigenin) shown in studies to support sleep onset",
        "Studied at the intersection of sleep and longevity biology",
      ],
      caveat:
        "Human evidence is stronger for chamomile extract than isolated apigenin. Frame claims at the chamomile-and-apigenin level when discussing human outcomes.",
    },
  ],
  stackClaims: [
    "Three ingredients targeting overlapping but complementary pathways: GABA modulation, glutamate blocking, and nervous system calming",
    "Designed for sleep architecture and continuity, not knockout sedation",
    "Each ingredient clinically informed, at full transparent doses",
    "A stack built to support consistent nightly use without next-day grogginess",
  ],
  differentiators: [
    "Melatonin-free — the category differentiator",
    "Transparent dosing — every ingredient and exact amount listed, no proprietary blends",
    "Synergistic three-ingredient stack — GABA modulation, glutamate blocking, nervous system calming",
    "Designed for next-day clarity, not sedation",
    "Built for consistent nightly use — non-habit forming",
    "Under $1 per serving — priced below Beam, Momentous, Ritual",
    "Sleep-only brand — no category drift",
  ],
} as const;

// ─── Bottle visual spec (for image prompts) ───────────────────────────────────
// Derived from the reference photography in Lunia_CMS_Generation_Handbook.docx
// (images 1–9). Reference images are saved at:
//   /public/lunia-bottle-ref-1.jpeg  (travertine + lavender, window light)
//   /public/lunia-bottle-ref-2.jpeg  (stone plinth + mountains bg)
//   /public/lunia-bottle-ref-3.jpeg  (linen surface, golden hour window)
//   /public/lunia-bottle-ref-clean.jpeg  (clean white studio shot — clearest label view)

export const BOTTLE_VISUAL_SPEC = `Wide squat amber glass supplement bottle — body wider than it is tall, \
pharmaceutical shape. Very wide black ribbed plastic screw cap, \
significantly wider than the neck. Full-wrap paper label covering the \
middle 70% of the bottle height.

Label (top to bottom):
- Upper half: pale blue-grey sky gradient background, fading from near-\
white at the very top to soft sky blue, with subtle scattered circular \
bubble texture across the surface.
- Logo mark centered near the top: a geometric pattern of nine navy \
circles arranged in a diamond-cross shape — three rows of dots forming \
a diamond, with connecting lines, resembling a constellation or \
asterisk of circles.
- "LUNIA LIFE" in large bold dark charcoal/navy sans-serif uppercase, \
wide letter-spacing, centered.
- "SLEEP SUPPLEMENT" in smaller uppercase tracking immediately below, \
lighter grey.
- Lower half: a painted mountain landscape illustration — layered \
receding mountain ridges in teal, slate blue, and deep navy, with \
fine golden glitter/particle highlights dusted along every ridge line, \
the deepest foreground ridge fading to near-black; the whole scene has \
a watercolor and gold-leaf quality.
- Ingredient text in centered white italic: "Magnesium glycinate / \
Apigenin / L-Theanine" stacked on three lines; below that "60" in \
larger white, "caps" in smaller white beneath.

Amber glass is visible above the label (through which dark capsules are \
faintly visible) and below the label at the bottle base.`;

// Photography style reference — use these when writing image prompts
// that include the Lunia bottle in a styled scene.
export const BOTTLE_PHOTOGRAPHY_STYLE = `Editorial supplement photography. \
Place the bottle on a natural travertine or honed stone surface. \
Soft diffused natural light from a window — golden hour or overcast. \
Props kept minimal: a single botanical element (dried lavender sprig, \
ranunculus, or chamomile stem — one prop only). \
Background: cream linen, warm ivory, or soft sage — never dark, never \
moody, never gradient. The overall feel is airy, natural, and lifestyle-\
editorial. Not clinical, not centred-on-white. \
Color palette in the scene: warm cream, natural stone, soft sage, amber \
glass warmth. No purple, no lavender tones, no neon.`;

// ─── Full brand guidelines string (inject into prompts) ───────────────────────
// This is the authoritative brand context block. Include it at the top of any
// content generation prompt — email rewrites, image prompts, ad copy, captions.

export const BRAND_GUIDELINES = `# LUNIA LIFE — Brand Guidelines (CMS Handbook v${BRAND_VERSION})

These guidelines are non-negotiable. They override any general writing advice,
popular copywriting frameworks, or generic supplement marketing conventions.

## The product

The ONLY product is Lunia Restore. Never reference other products.

- Format: capsules, 60 per bottle (30 servings)
- Dose: 2 capsules, 30–60 minutes before bed
- Price: $38.93 (1 bottle) / $29.20 subscription / $99.30 (3 bottles)
- Reviews: 558 reviews, 4.9 stars, 91% five-star
- Customers: trusted by 78,000+ users
- Under $1 per serving

### Formulation (exact — never deviate from these doses)

| Ingredient             | Dose                    | Key mechanism                                              |
| ---------------------- | ----------------------- | ---------------------------------------------------------- |
| Magnesium Bisglycinate | 500 mg (90 mg elemental)| GABA-A potentiation, lowers core body temp, NMDA receptor  |
| L-Theanine             | 300 mg                  | Blocks glutamate, enhances GABA, relaxation without sedation|
| Apigenin               | 50 mg                   | Benzodiazepine site of GABA-A, chamomile flavonoid          |

Non-negotiable product facts: melatonin-free, no proprietary blends, transparent
dosing, non-habit forming, vegan, GMO-free, gluten-free, no artificial fillers.

## Core differentiators (use these — don't invent others)

1. Melatonin-free. Customers with grogginess, tolerance, or vivid dreams from
   melatonin are actively looking for this.
2. Transparent dosing. Every ingredient and exact amount is listed.
3. Synergistic stack. Three pathways: GABA modulation, glutamate blocking, nervous
   system calming.
4. Designed for next-day clarity, not sedation. No hangover effect.
5. Non-habit forming, designed for consistent nightly use.
6. Under $1 per serving, priced below Beam, Momentous, Ritual.
7. Sleep-only brand. No category drift.

## The voice

Lunia sounds like a calm, well-read friend who happens to know a lot about sleep
biology. Confident without being loud. Curious without being academic. Direct
without being aggressive. Editorial, minimal, and trust-first. It does not perform
certainty it does not have, and it does not soften what it does know. Premium, but
never precious. NYC-cool, not suburban-wellness.

Lunia IS: calm and authoritative, science-first and educational, minimal and
editorial, confident and direct, curious about biology, anti-hype, quiet luxury.

Lunia is NOT: pushy or hypey, clinical or jargon-heavy, cute or whimsical, salesy,
mystical or holistic-fluff, loud luxury or budget-brand.

## Banned words and phrases (absolute — no exceptions)

Hype words (ban these everywhere):
breakthrough, miracle, magic, secret, hack, life-changing, revolutionary,
transform your sleep, unlock, supercharge, optimize, biohack, game-changer,
next-level

AI-sounding phrases (ban these everywhere):
"in today's fast-paced world", "let's dive in", "on a journey to", "navigate the",
"empower you to", "the power of", "elevate your", "embrace the", "unleash",
"discover the secret to", "say goodbye to", "struggle is real"

Banned constructions:
- "X is not Y, it is Z" — banned sentence shape, anywhere
- Em dashes — use commas, periods, or parentheses
- More than one exclamation per piece (zero is the default)
- Rhetorical questions the reader cannot answer: "Tired of being tired?"
- Generic urgency on always-available products: "last chance", "final hours"

## Compliance language

ALLOWED framings (use these):
"Supports sleep quality" / "May help you wind down" / "Helps promote a calmer
nervous system" / "Shown in studies to support" / "Associated with improved" /
"Designed to support" / "Helps reduce nighttime awakenings" / "Supports deep and
REM sleep" / "Supports nervous system regulation" / "Melatonin-free sleep support"

BANNED claim language (never use):
Treats insomnia, cures sleep problems, fixes your sleep, prevents 3am wakeups,
stops waking up, blocks cortisol, diagnoses, replaces medication,
doctor-recommended (without a named doctor on file), FDA approved,
clinically proven (Lunia does not have its own clinical trial),
guaranteed results, instant relief, works the first night,
comparisons to Ambien/Lunesta, knockout, sedative, drug-like framing.

Compliance swaps:
- "Cures insomnia" → "Supports relaxation and healthy sleep onset"
- "Prevents 3am wakeups" → "May help reduce nighttime awakenings"
- "Guaranteed to work" → "Backed by research on each ingredient"
- "Falls asleep instantly" → "Helps you wind down"
- "Knocks you out" → "Supports natural sleep onset"
- "Melatonin-free means safer" → "Melatonin-free, designed for nightly use"

## Science library (cite from here — do not invent citations)

Magnesium Bisglycinate allowed claims:
• "Supports sleep quality, especially in adults with lower magnesium intake"
• "Bioavailable chelated form of magnesium"
• "Glycine component supports lower core body temperature and NMDA receptors"
• "Potentiates GABA-A receptor activity"
• "Associated with improvements in self-reported sleep quality in clinical trials"

L-Theanine allowed claims:
• "Supports relaxation without sedation"
• "Shown in studies to support sleep onset and sleep quality"
• "Enhances GABA levels and modulates serotonin and dopamine"
• "Blocks glutamate receptors, supporting a calmer nervous system"
• "Associated with reduced perceived stress in clinical trials at 400mg/day"

Apigenin allowed claims:
• "A flavonoid found in chamomile"
• "Binds the benzodiazepine site of GABA-A receptors"
• "Chamomile extract (containing apigenin) shown in studies to support sleep onset"
• "Studied at the intersection of sleep and longevity biology"
CAVEAT: Frame at chamomile-and-apigenin level for human outcomes, not isolated apigenin.

Stack synergy allowed claims:
• "Three ingredients targeting overlapping but complementary pathways: GABA modulation,
  glutamate blocking, and nervous system calming"
• "Designed for sleep architecture and continuity, not knockout sedation"
• "Each ingredient clinically informed, at full transparent doses"
• "A stack built to support consistent nightly use without next-day grogginess"

Required disclaimer for any educational ingredient content:
"These statements have not been evaluated by the Food and Drug Administration.
This product is not intended to diagnose, treat, cure, or prevent any disease."

## Who you are writing to

Urban, health-conscious adults aged 25–50. NYC is the archetype. Sleep-literate,
ingredient-aware, skeptical of supplement marketing. They research before buying.
They read ingredient panels. They have tried melatonin and had grogginess or
tolerance. They want better sleep architecture, not to be knocked out.

Their real problems:
• Staying asleep (the 3am cortisol wake-up is the #1 pain point)
• Wired but tired — mentally activated at night even when physically exhausted
• A chatty mind, not physical restlessness
• Melatonin grogginess or vivid dreams
• They need next-day clarity — they are high-functioning and cannot afford fog

What they want from Lunia:
• Calm, restorative nights / Less 2–3am waking / Less morning grogginess
• A ritual they can keep consistently / Ingredient transparency to verify
• To feel like a smart customer, not a sucker

What does NOT work on them:
• Pain-point hooks that catastrophize ("Are you tired of being tired?")
• Manufactured urgency (they wait for the next code)
• Influencer social proof without ingredient data
• Generic wellness aesthetic (pastels, sunset gradients, lavender)
• Outcome guarantees ("sleep through the night every night")

## Content pillars

1. Sleep architecture: REM, deep sleep (N3), cycles, fragmentation
2. Stress physiology: cortisol, "wired but tired", 3am cortisol wake-ups
3. Inflammation and recovery: immune signaling, soreness, skin (compliant framing)
4. Metabolic impacts: cravings, glucose — frame as associations only
5. Longevity: healthspan, cognitive resilience, glymphatic system
6. Wind-down routines: light, temperature, caffeine timing, screen exposure
7. Ingredient education: what each ingredient does, why the stack synergizes

## Proven content angles (use these first)

• 3am wakeups tied to cortisol timing
• Cortisol and weight management (cravings, abdominal fat, water retention)
• Alcohol as sedative vs restorative sleep disruptor
• Glymphatic system as "brain clean-up" during deep sleep
• Sleep deprivation effects on skin
• Melatonin tolerance and grogginess
• Magnesium bisglycinate vs oxide (absorption story)
• Why apigenin is in chamomile and what it does for sleep
• The 3-ingredient synergy (GABA modulation + glutamate blocking + NS calming)

## Winning ad framings (paid Meta — default to these for ad copy)

Every purchase in Lunia's history has come from credibility-forward creative.
Pain-point hooks do NOT convert on cold traffic.

• "honest_authentic" — creator was skeptical, looked at the ingredients, tried it
• "best_investment" — smart spend, ingredient quality, price per serving
• "Skeptic Convert" — tried consistently, real outcome over weeks
• "Morning Outcome" — leads with the result (clear morning, no grogginess)
• "$1 Comparison" — price transparency vs Beam, Momentous, Ritual

## Visual identity

Palette:
- Deep Navy #102635 (primary text, navigation)
- Rich Navy #01253F (editorial hero, dark sections, email mastheads)
- Slate Blue #2C3F51 (secondary text)
- Soft Ivory #F7F4EF (default light background)
- Aqua Accent #BFFBF8 (max 5–10% of layout)
- Signal Yellow #FFD800 (accent only — highlights, badges, UI elements, not email CTAs)

Hard don'ts: gradients, purple, lavender, neon, "wellness pastels".

## Email typography

Inter is the single typeface for all email content.
- Headlines (H1/H2): Inter 400 (Normal), letter-spacing -0.01em, color #102635
- Body: Inter 300 (Light), line-height 1.6, color #1A1A1A
- Bold within body: Inter 700, sparingly — ingredient names + risk-reversal phrases only
- CTA button: Inter 700 (Bold), white (#ffffff) text on Rich Navy #01253F background
Do NOT use Georgia, serif, or any other font family.`;
