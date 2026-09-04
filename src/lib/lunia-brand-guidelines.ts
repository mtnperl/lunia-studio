// Lunia Life — CMS Generation Handbook
// v2.1, 3 September 2026. Supersedes v2.0 (same day) and v1.0 (10 May 2026).
//
// Sources reconciled into this version:
//   LUNIA_CANON_03_INGREDIENT_RESEARCH_2026-08-12   (claim tiers, approved phrasing)
//   LUNIA_DOSAGE_INTEGRITY_RESEARCH_2026-08-26      (sourcing truth, self-audit)
//   LUNIA_PRODUCT_REFERENCE_RULE v3, 2026-08-22     (image generation)
//   LUNIA_REVE_CANON_2026-07-29                     (second SKU, unit economics)
//   Lunia_Text_Hook_Framework 2026-06-20            (UGC hooks, on-screen styling)
//   Lunia_Meta_Placement_Ad_Size_Guide 2026-07-01   (placements and sizes)
//   Shopify live read 2026-09-03                    (price, reviews, selling plans)
//
// This is the authoritative brand reference for ALL content generation:
// emails, captions, ad copy, image prompts, hooks, and rewrites.
// Every content generation prompt should import BRAND_GUIDELINES.
// Update this file whenever the source canon changes; bump BRAND_VERSION.

export const BRAND_VERSION = "2.1";
export const BRAND_UPDATED = "2026-09-03";

// ---------------------------------------------------------------------------
// WHAT CHANGED FROM v1.0
// ---------------------------------------------------------------------------
// 1. BOTTLE_VISUAL_SPEC is dead. It described the bottle as a wide squat jar,
//    which it is not, and it duplicated what the attached reference already
//    carries. Never describe the product in words. Attach the reference.
// 2. Lunia is no longer a one-SKU brand. Lunia Rêve is live on Shopify.
// 3. Review count and rating updated from live Shopify data.
// 4. "Under a dollar a night" is ENABLED and is a proven converting frame.
//    It is true on subscription only. See PRICING_CLAIMS for the exact
//    approved wordings and the one wording that is false.
// 5. "Clinically dosed / clinical dose / clinically formulated" banned outright.
// 6. Ingredient claims now carry evidence tiers. The tier governs the verb.
// 7. New SOURCING_TRUTH: the magnesium oxide arithmetic and apigenin provenance.
// 8. "Non-habit forming" requires compliance sign-off before it ships.
//
// NEW IN v2.1
// 9.  BANNED_PHRASES is now a machine-readable array. Lint against it.
// 10. PALETTE is a single exported const. Change a hex there and it propagates
//     into BRAND_GUIDELINES, the hook styling spec and the email spec. It is
//     the only place colour values should be edited.
// 11. CHANNEL_SPECS: placement mapping, ad sizes, the Instagram-only rule.
// 12. HOOK_FRAMEWORK and IG_CAPTION_TEMPLATE, so short-form stops improvising.
// 13. OFFER_RULES, including the anchor-price decision. It is deliberate.
// 14. REFORMULATION_WATCH: if the 135 mg elemental option ships, every dose
//     number in this file and in every live asset becomes wrong.
// 15. DISCLAIMER_RULES by channel.

// ---------------------------------------------------------------------------
// PALETTE — the single source of truth for colour. Edit hexes HERE only.
// ---------------------------------------------------------------------------
// Reconciled against Lunia_Color_Brand_Book (April 2026). Six colours, no more.
// "No other colors may be introduced without an update to this document."
// Every colour reference elsewhere in this file interpolates from here, so a
// change to a hex below propagates into BRAND_GUIDELINES, the on-screen hook
// styling spec and the email spec automatically.
export const PALETTE = {
  deepNavy:   "#102635", // primary text, headers, navigation, standard dark UI, footer. The everyday navy.
  richNavy:   "#01253F", // editorial hero backgrounds, dark sections, email mastheads. The spotlight navy.
  slateBlue:  "#2C3F51", // secondary text, containers, borders
  softIvory:  "#F7F4EF", // default light background, negative space, inverse text on navy
  aquaAccent: "#BFFBF8", // highlights, subtle emphasis, UI feedback. Accent only.
  signalYellow: "#FFD800", // key actions, web CTAs, badges. Accent only.
} as const;

export const PALETTE_RULES = {
  accentCeiling: "Aqua and Signal Yellow together: maximum 5 to 10 percent of any layout. Contrast, not decoration.",
  navySeparation: "Never place Deep Navy and Rich Navy adjacent in the same module. The contrast is too subtle and reads as a rendering bug.",
  ctaSplit:
    "Web and landing pages: primary CTA is Signal Yellow with navy text. " +
    "Email: CTA button is Soft Ivory text on Rich Navy. Signal Yellow is NOT an email CTA colour. " +
    "This split is deliberate, not a conflict.",
  hardDonts: [
    "Purple", "Lavender", "Violet", "Magenta", "Neon", "Gradients",
    "Wellness pastels", "Sunset gradients", "Any colour not in PALETTE",
  ],
  // Purple and lavender are hard don'ts, confirmed 2026-09-04. Any older
  // reference to an indigo/purple/lavender Lunia palette is dead and wrong.
} as const;

// ---------------------------------------------------------------------------
// Product canon — Lunia Restore
// ---------------------------------------------------------------------------
export const PRODUCT = {
  name: "Lunia Restore",
  shopifyHandle: "lunia-sleep-vitamins",
  shopifyGid: "gid://shopify/Product/7750951108689",
  format: "Capsules",
  capsulesPerBottle: 60,
  servingsPerBottle: 30,
  dose: "Up to 2 capsules, 30 to 60 minutes before bed",
  // NOTE: it is UP TO TWO capsules, which is one serving and one night.
  // Any asset that says "one capsule before bed" is wrong. Pack #5 AD013
  // primary text B currently says this. Fix it.

  // Live prices, Shopify, 2026-09-03
  price1Bottle: 38.93,
  compareAtPrice: 59.90,              // permanently displayed, see OFFER_RULES
  priceSubscriptionMonthly: 29.20,    // 25% off, monthly delivery
  priceSubscriptionQuarterly: 19.99,  // 48.63% off per bottle, billed every 3 months
  price3Bottles: 99.30,               // one-time 3-pack, verify against the live bundle

  // Per night. One serving is one night, so per serving and per night are the
  // same number. "Night" is the better word for a sleep brand. Use it.
  perNightOneTime: 1.30,
  perNightMonthlySub: 0.97,
  perNightQuarterlySub: 0.67,

  // Live social proof, Shopify/Judge.me, 2026-09-03
  reviewCount: 563,
  reviewStars: 4.91,
  fiveStarPct: 91,
  customerCount: "78,000+",

  ingredients: [
    {
      name: "Magnesium Bisglycinate",
      label: "500 mg (90 mg elemental)",
      material: "Albion-type buffered bisglycinate chelate. Buffered means it contains magnesium oxide as a stabiliser.",
      evidenceTier: "A for the form, weak on dose. Our 90 mg is about 36% of the only bisglycinate sleep RCT dose (Schuster 2025, 250 mg elemental).",
      mechanism:
        "Chelated form. Acts on NMDA and GABA-A receptor systems that regulate neural excitability. Carries roughly 410 mg of glycine per serving as part of the chelate.",
      allowedClaims: [
        "In a placebo-controlled trial, magnesium bisglycinate was shown to reduce insomnia severity scores",
        "Research suggests people with lower dietary magnesium intake may see more benefit",
        "The bisglycinate form is chelated for absorption and is generally gentler on the stomach than magnesium oxide",
        "Magnesium acts on NMDA and GABA-A receptor systems that regulate neural excitability",
        "Bioavailable chelated form of magnesium",
      ],
      prohibited: [
        "clinically proven", "cures insomnia", "corrects your deficiency", "you are deficient",
        "the most absorbable form", "100 percent absorbed", "magnesium boosts glymphatic clearance",
        "any glycine outcome claim, minute count or percentage",
      ],
      caveats: [
        "GLYCINE: we deliver roughly 410 mg. The glycine sleep trials used 3,000 mg. Never borrow the glycine thermoregulation story, the minutes or the percentages.",
        "GLYMPHATIC: the link is indirect. Say deep sleep is when clearance systems are most active. Never say magnesium boosts clearance.",
        "DOSE: own it. Our magnesium is formulated to work alongside apigenin on overlapping inhibitory pathways, not as a standalone magnesium therapy.",
      ],
    },
    {
      name: "L-Theanine",
      label: "300 mg",
      material: "Confirm with the manufacturer whether this is Suntheanine or generic. If generic, never cite Suntheanine's trial data.",
      evidenceTier: "A and B. Our strongest dose story. 300 mg sits inside the 200 to 450 mg range described in the research (Cotter 2026).",
      mechanism:
        "Non-protein amino acid from green tea. Weakly antagonises glutamate receptors and reduces presynaptic glutamate formation. Associated with increased GABA, dopamine and serotonin.",
      allowedClaims: [
        "A 2025 meta-analysis of 19 trials found L-theanine improved subjective sleep quality and sleep onset",
        "Research points to a 200 to 450 mg daily range, and Lunia uses 300 mg",
        "L-theanine is associated with a calm, alert state rather than sedation",
        "In a controlled study, a single dose reduced the salivary cortisol response to an acute stressor",
        "L-theanine has been shown to change alpha-band brain activity, a pattern associated with wakeful calm",
        "Studies associate L-theanine with attention and reaction time measures rather than next-day grogginess",
      ],
      prohibited: [
        "clinically dosed", "the clinical dose", "puts you to sleep", "sedates",
        "lowers your cortisol", "resets cortisol", "boosts alpha waves for deep sleep",
        "no side effects", "works instantly",
      ],
      caveats: [
        "CORTISOL: acute stress response only. Chronic dosing did not produce a between-group cortisol difference (Moulin 2024). Never imply sustained hormone reduction.",
        "ALPHA WAVES: say it changes alpha-band activity in ways associated with calm. Do not say it boosts alpha waves.",
      ],
    },
    {
      name: "Apigenin",
      label: "50 mg",
      material:
        "A 90 to 98 percent isolate. It has to be. Chamomile standardised to 1.2 percent apigenin would need 4.17 grams of extract to deliver 50 mg, which is roughly eight capsules for one ingredient. The mainstream 98 percent material in the US is semi-synthesised from citrus naringin or hesperidin.",
      evidenceTier: "D for isolated apigenin, B via chamomile extract, C for dietary intake. Our strongest mechanism story and our thinnest human evidence story.",
      mechanism:
        "A flavone. Binds the benzodiazepine site on GABA-A receptors in laboratory studies. Studied for its role in NAD+ metabolism.",
      allowedClaims: [
        "Apigenin binds to the benzodiazepine site on GABA-A receptors in laboratory studies",
        "A flavone found in chamomile, parsley and celery",
        "Higher dietary apigenin intake has been associated with better sleep quality",
        "Chamomile extract trials show improvements in sleep quality",
        "Apigenin is studied for its role in NAD+ metabolism, and higher dietary flavone intake has been associated with slower biological aging markers",
        "50 mg of isolated apigenin, far more than chamomile preparations deliver",
      ],
      prohibited: [
        "clinically dosed apigenin", "the clinically studied dose", "the researched dose",
        "apigenin is proven to improve sleep", "anti-aging", "increases NAD+ in you",
        "extends lifespan", "works like a sleeping pill", "same as prescription sleep aids",
        "any percentage or minute count attributed to apigenin",
      ],
      caveats: [
        "SOURCING, THE BIG ONE: never state or imply that our apigenin is derived from chamomile unless the manufacturer has confirmed the route in writing and it is chamomile. Saying the molecule is FOUND IN chamomile is a botanical fact and is fine. Saying OURS COMES FROM chamomile is a supply-chain claim we cannot currently substantiate, and it is a false-advertising exposure.",
        "DOSE: there is no trial-derived dose for isolated apigenin in humans for sleep. The 50 mg convention comes from Huberman's protocol, not from dose-response research. Say so rather than implying otherwise.",
        "HUMAN OUTCOMES: frame at the chamomile-and-apigenin level, not isolated apigenin.",
        "ALLERGY: chamomile is Asteraceae. Ragweed, marigold, daisy and chrysanthemum allergies can cross-react. This belongs in customer service macros.",
      ],
    },
  ],

  stackClaims: [
    "Three ingredients targeting overlapping but complementary pathways: GABA modulation, glutamate blocking, and nervous system calming",
    "Magnesium and apigenin act at different binding sites on an overlapping receptor system, which is the rationale for combining them",
    "Designed for sleep architecture and continuity, not knockout sedation",
    "Every ingredient and exact amount printed on the label, no proprietary blends",
    "A stack built to support consistent nightly use",
  ],

  differentiators: [
    "Melatonin-free. The category differentiator. Customers with grogginess, tolerance or vivid dreams from melatonin are actively looking for this.",
    "Transparent dosing. Every ingredient and exact amount is listed, no proprietary blends.",
    "Synergistic stack. Three pathways: GABA modulation, glutamate blocking, nervous system calming.",
    "Designed for next-day clarity, not sedation.",
    "Under a dollar a night on subscription, priced below Beam, Momentous and Ritual. See PRICING_CLAIMS for approved wordings.",
    "Sleep-first brand. Restore plus one sleep accessory, no category drift.",
  ],
} as const;

// ---------------------------------------------------------------------------
// Pricing claims — the "under a dollar a night" frame, enabled
// ---------------------------------------------------------------------------
// This is one of two proven converting frames on cold traffic (the other is
// credibility/honesty). Use it. The only rule is that it has to be true, and
// it is true on subscription.
//
//   one-time      $38.93 / 30 nights = $1.30 a night
//   monthly sub   $29.20 / 30 nights = $0.97 a night   <- under a dollar
//   quarterly sub $19.99 / 30 nights = $0.67 a night   <- comfortably under
//
export const PRICING_CLAIMS = {
  preferredUnit: "night",  // not "day", not "serving". Sleep brand. One serving is one night.

  approved: [
    "Under a dollar a night on subscription",
    "Less than a dollar a night when you subscribe",
    "97 cents a night on the monthly plan",
    "67 cents a night on the quarterly plan",
    "Subscribe and it comes to under a dollar a night",
    "About the price of a coffee a week, on subscription",
    "Under a dollar a night, which is less than Beam, Momentous or Ritual",
  ],

  banned: [
    "Under a dollar a night",           // unqualified, with no subscription anywhere in the asset. False at $1.30.
    "Under $1 per serving",             // same problem, worse word
    "Under a dollar a night, from $38.93", // actively contradicts itself
  ],

  rule:
    "The subscription must be visible in the same asset, ideally the same sentence. " +
    "In a headline where there is no room, the primary text or the on-screen line " +
    "underneath has to carry it. Never let the number travel alone.",

  // Why this frame is worth protecting: it is the "best_investment" lane, and
  // it does double duty. It converts, and it makes the subscription the obvious
  // choice rather than an upsell.
  strategicNote:
    "This claim is not just a price argument. It is a subscription argument wearing " +
    "a price argument's clothes. The number is only true on the plan, so quoting it " +
    "sells the plan. Put it in the ad, not only on the PDP.",
} as const;

// ---------------------------------------------------------------------------
// Offer rules
// ---------------------------------------------------------------------------
export const OFFER_RULES = {
  standardSaleDepth: "35% off is the house sale depth. $59.90 to $38.93 is exactly 35%.",

  // DECIDED, NOT A BUG. Do not re-flag this.
  anchorPrice:
    "Restore carries a permanent compare-at of $59.90 against a $38.93 selling price. " +
    "This is a deliberate anchoring decision, not an oversight. $59.90 is the reference " +
    "point the customer prices against, and '35% off' is the standing frame. Write to it. " +
    "Two operating notes that follow from it rather than argue with it: keep $59.90 " +
    "consistent everywhere it appears, since an anchor that moves stops anchoring and " +
    "starts looking like a mistake; and when a real promotion runs, discount from $38.93 " +
    "rather than stacking a second percentage on the standing one, because '35% off' " +
    "plus 'an extra 20%' invites the reader to do arithmetic that undercuts the anchor.",

  reveException:
    "Rêve does NOT get an anchor price. It is a new SKU with no price history, the " +
    "category leader (Drowsy) is permanently discounted and looks cheap for it, and the " +
    "Rêve canon rules a fake MSRP out explicitly. On Rêve, strike only against a real " +
    "purchasable number: the Sleep Set against the cost of buying both items separately.",

  neverDo: [
    "Manufactured urgency on an always-available product: 'last chance', 'final hours'",
    "A countdown that resets",
    "Moving the $59.90 anchor around between surfaces",
    "Stacking a second discount percentage on top of the standing 35%",
    "Any strikethrough at all on Rêve except the Sleep Set versus buying separately",
  ],

  okToDo: [
    "Real, dated promotional windows with a real end",
    "Subscription savings shown as the honest arithmetic they are",
    "Bundle pricing struck against the true cost of buying the items separately",
    "The Rêve add-on honest-margins line, verbatim",
  ],
} as const;

// ---------------------------------------------------------------------------
// Reformulation watch — freeze rule
// ---------------------------------------------------------------------------
export const REFORMULATION_WATCH = {
  status: "Under evaluation with NutraStar. Quotes dated 7 July and 23 July 2026. Not decided.",
  proposedChange:
    "Raise magnesium from 90 mg elemental to 120 or 135 mg, keeping L-theanine at " +
    "300 mg and apigenin at 50 mg, in a two-capsule size 00 serving. The 135 mg option " +
    "would move us from 36% to 54% of the Schuster trial dose, which is a materially " +
    "better dose story.",
  rule:
    "If this ships, EVERY dose number in this file, on the PDP, on the label, in every " +
    "live ad, every email, every blog post and every UGC script becomes wrong. Before " +
    "committing to a print run, a large creative pack, or an insert card, check whether " +
    "the reformulation has been signed. Do not print dose numbers on anything with a " +
    "long shelf life while this is open.",
} as const;

// ---------------------------------------------------------------------------
// Channel specs
// ---------------------------------------------------------------------------
export const CHANNEL_SPECS = {
  meta: {
    rule: "Instagram only. Feed plus Stories, Status and Reels. Everything else off.",
    placements: [
      { placement: "Instagram Feed", size: "4x5", on: true },
      { placement: "Stories, Status, Reels", size: "9x16", on: true },
      { placement: "In-stream ads for reels", size: "9x16", on: false },
      { placement: "Search results", size: "1x1", on: false },
      { placement: "Marketing messages (WhatsApp)", size: "n/a", on: false },
      { placement: "Apps and sites (Audience Network)", size: "n/a", on: false },
    ],
    uploadNote:
      "Upload all three sizes (1x1, 4x5, 9x16) in Customize Media so Meta picks the " +
      "right crop, then toggle off everything except Feeds and Stories/Status/Reels. " +
      "Facebook placements and Audience Network have not converted on this account.",
    copySlots: {
      primaryText: "Short 2 to 4 sentences. Long up to 6 where the placement supports it. Offer a mid-length cut when Reels truncation is a risk.",
      headline: "Short. It is the only line that survives a truncated render.",
      description: "One line. Often the ingredient list or the offer.",
    },
  },

  openAiAds: {
    rule: "ChatGPT placement needs square 1:1 images. This is the one place 1:1 is correct.",
    status: "Testing since Labor Day 2026.",
  },

  ctaConvention:
    "Every paid caption closes with a CTA to lunialife.com. The product name never " +
    "lands in sentence one. It arrives after the hook has done its job.",
} as const;

// ---------------------------------------------------------------------------
// UGC text hook framework
// ---------------------------------------------------------------------------
export const HOOK_FRAMEWORK = {
  step0: "Ask for the video script or transcript first, and stop until you have it. A hook written without the script is a guess dressed up as a recommendation.",

  principles: [
    "LAST PHRASE OF THE VIDEO. Take the closing line or final emotional beat and move it to the front. Opens with the payoff, makes the viewer want the backstory.",
    "OPPOSITE OF THE FIRST LINE. Invert the opening sentiment. If she opens enthusiastic, open reluctant. Creates the curiosity gap.",
    "SUMMARY IN ONE LINE. Compress the arc into one sentence. Lead with the most credible beat, usually the surprise or the proof moment, not the loudest claim.",
  ],
  rule: "Three hooks per request, one per principle. Never blend them. One logic per hook.",

  longVersion: {
    when: "When dwell time and a quality-view signal are the goal.",
    twoBeatReveal: "First clause at 0:00, payoff clause 1.5 to 2 seconds later.",
    hold: "4 to 5 seconds, or until she finishes her first spoken sentence, whichever is later. Drop the font one step so three lines fit the upper third.",
    caveat: "Meta scores the whole retention curve, not the first frame. Watch 3-second AND 15-second retention. A hook that lifts 3-second views and tanks 15-second retention is buying the wrong signal. Cut it.",
  },

  styling: {
    font: "Bold tight sans with a native feel, Inter Bold or the platform caption font. It should look typed, not designed.",
    placement: "Upper third, centered. Clear of the face and clear of the bottom 250px where Reels and Stories put captions and the CTA.",
    color: `Soft Ivory ${PALETTE.softIvory} on a translucent Deep Navy ${PALETTE.deepNavy} scrim at about 45%. One emphasis phrase in Signal Yellow ${PALETTE.signalYellow}. Never more than one, it reads as spam.`,
    legibility: "Readable on mute at 60% zoom. Assume sound off and a fast scroll.",
    motion: "None for the short version. Two-beat reveal only for the long version. No bounce, no typewriter. Credibility framing wants stillness.",
  },

  testing:
    "One-variable test. Same video, hook swapped, nothing else. Read CTR first, then " +
    "ATC rate, then purchases. A hook can lift the click but cannot rescue a creative " +
    "that does not convert once watched. Judge on ATC and purchase, not CTR alone. " +
    "Do not layer a budget change on top of a live hook test.",

  lean:
    "Cold traffic buys from credibility and value, not pain-point emotion. The two " +
    "proven lanes: the financial frame (would pay again, under a dollar a night, the " +
    "math is easy) and the credibility frame (looked up the label, only three " +
    "ingredients, not a scam). Pain-point hooks click and do not buy. Use one only " +
    "with a clear hypothesis, and wait for a second purchase before believing a win.",
} as const;

// ---------------------------------------------------------------------------
// Organic IG caption template
// ---------------------------------------------------------------------------
export const IG_CAPTION_TEMPLATE = {
  reference: "modernwisdom / neurothrivee style",
  structure: [
    "Opening framing sentence on what is mechanistically happening",
    "3 to 5 numbered mechanisms, each a short paragraph: name, then the biology, then what fails without it",
    "One-line synthesis close",
  ],
  cta: 'If you want more neuroscience-backed breakdowns on [topic], follow 👇 @lunialife',
  credit: "Credit: @sourcehandle",
  voice: "Direct and conversational. Use real anatomical terms: SCN, adenosine, NREM, parasympathetic, glymphatic, HPA axis. No em dashes.",
  note: "Organic education carries no product claim. Do not bolt a product pitch onto a mechanism post. The product earns its place by being the obvious next thought, not by being named.",
} as const;

// ---------------------------------------------------------------------------
// UGC, reviews and social proof
// ---------------------------------------------------------------------------
export const SOCIAL_PROOF_RULES = [
  "Never write a review, testimonial or creator quote that a real person did not say. Not as a placeholder, not as an example, not 'for the mockup'.",
  "UGC is licensed through Backstage. Do not use a creator's footage or words outside the licence terms.",
  "Never name a competitor. Say 'big brands' or 'other products'. Beam, Momentous and Ritual may be named ONLY in a price comparison where the prices quoted are current and checkable.",
  "563 reviews, 4.91 stars, 91% five-star, 78,000+ customers. These are brand-level for Lunia Life products. Never attribute them to Rêve, which has its own review count of its own.",
  "Influencer social proof without ingredient data does not work on this audience. Pair every creator with a number.",
];

// ---------------------------------------------------------------------------
// Disclaimer rules by channel
// ---------------------------------------------------------------------------
export const DISCLAIMER_RULES = {
  fdaDisclaimer:
    "These statements have not been evaluated by the Food and Drug Administration. " +
    "This product is not intended to diagnose, treat, cure, or prevent any disease.",
  where: {
    pdpAndBlog: "Required on any page carrying an ingredient or structure-function claim.",
    email: "Required in the footer of any email carrying an ingredient claim.",
    metaAds: "Not required in the ad unit itself, but the landing page must carry it. Never write an ad claim the landing page cannot support.",
    organicSocial: "Required on educational ingredient content where a product claim is attached.",
  },
  individualResults:
    "'Individual results may vary' goes on EVERY outcome claim, in every channel, " +
    "including ad primary text. If the sentence describes something the customer " +
    "will experience, the line goes in the asset.",
} as const;

// ---------------------------------------------------------------------------
// Sourcing truth — the two things a hostile reader attacks first
// ---------------------------------------------------------------------------
export const SOURCING_TRUTH = `## The magnesium oxide arithmetic

Our label reads 500 mg of buffered bisglycinate chelate yielding 90 mg elemental.
That is 18.0% elemental magnesium, which is above the 14.10% ceiling for fully
reacted anhydrous bisglycinate. Buffered means the material contains magnesium
oxide as a stabiliser. Running the mass balance:

  anhydrous chelate basis: 28.3% of our elemental magnesium comes from oxide
  dihydrate chelate basis:  43.7% of our elemental magnesium comes from oxide

So the honest range is 28 to 44 percent, and which end depends on the hydration
state of the chelate, which sits on the supplier's COA. Get it.

By mass of powder the oxide is 8 to 13 percent, which is what "a small amount of
oxide as a stabiliser" means. By magnesium delivered it is between a quarter and
nearly half. Those are different sentences and only one of them survives someone
doing the arithmetic. Say the second one first.

The defensible position is genuinely strong: at 18 percent we sit at the honest
end of the buffered range. The commonly traded grades are 20 percent (38.5% of
the magnesium from oxide) and 30 percent (69.2%). We can publish the exact number
and come out ahead of the category, which almost nobody else can do.

OPEN ACTION: check the printed panel. If magnesium oxide is not named as a source,
add it. 21 CFR 101.36(d) requires all sources of a single dietary ingredient to be
listed. This is the exact theory pleaded in Hoffman v. Bluebonnet and Copeland v.
Albion. The cost is a label revision. The upside is a claim nobody can match.

OPEN ACTION: the brand blog currently frames magnesium oxide as an inferior filler
while we ship a buffered chelate containing it. Reconcile that before publishing
further comparison content. The defensible framing is that oxide's poor standalone
absorption is precisely why it belongs as a small stabiliser inside a chelate
rather than as the primary magnesium source.

## The apigenin provenance rule

By arithmetic, our 50 mg is a 90 to 98 percent isolate. No 50 mg apigenin capsule
in existence contains chamomile extract. By supply-chain evidence, the mainstream
98 percent material in the US is semi-synthesised from citrus naringin or
hesperidin at $285 to $320 per kg, against more than $1,425 per kg for genuine
plant extraction. At least one supplier lists chamomile, parsley, celery and
"purely Synthesis" under a single SKU with a single certificate of analysis, so
"our supplier says chamomile" is not an answer.

HARD RULE: never state or imply that Lunia's apigenin is derived from chamomile.
"A flavone found in chamomile" is a fact about the molecule and is fine.
"Our apigenin comes from chamomile" is a supply-chain claim we cannot substantiate.

OPEN ACTION: audit every Lunia surface for a chamomile-source claim on apigenin.
Website, PDP, blog, ad copy, IG captions, UGC scripts, email flows, insert cards,
customer service macros. Fix the copy before publishing anything on this topic.

## The finished-product honesty statement

There is no randomised controlled trial on the finished Lunia Restore formula.
Our evidence is at the ingredient level, at doses and forms we publish in full.
Volunteer this rather than waiting to be asked. Most of the category implies
otherwise, which makes saying it a genuine differentiator.`;

// ---------------------------------------------------------------------------
// Product canon — Lunia Rêve (second SKU, live)
// ---------------------------------------------------------------------------
export const REVE = {
  name: "Lunia Rêve",
  displayRule: "Always with the circumflex in display copy. Always 'reve' with no accent in slugs, handles, SKUs and filenames.",
  pronunciation: "rev, rhymes with Bev",
  descriptor: "Mulberry silk sleep mask",
  shopifyHandle: "lunia-reve",
  shopifyGid: "gid://shopify/Product/15943166132305",
  status: "Live on Shopify at $78 as of 2026-09-03",

  // NOTE: the July canon named the colourways Midnight and Mist. The live
  // variants read Fathom and Sky Blue. Reconcile before writing any copy that
  // names a colour, and before any print run.
  colourwaysCanon: ["Midnight", "Mist"],
  colourwaysLive: ["Fathom", "Sky Blue"],

  price: 78,
  priceInCartAddOn: 49,
  pricePostPurchase: 44,
  priceSleepSet: 98,        // Rêve + 1 Restore
  priceThreePackPlusReve: 139,
  freeShippingThreshold: 85,

  facts: [
    "100% mulberry silk shell",
    "Structured 3D shape with internal padding, curved nose notch, wide flat band with velcro closure",
    "Woven white LUNIA LIFE label with the logo mark",
    "Hand wash only, cold water, neutral silk detergent, air dry in shade",
  ],

  rules: [
    "NEVER mention momme. The supplier stated 19, below Drowsy's 22 and Manta's 30. Position on structure, not fabric weight.",
    "Explain hand wash as a consequence of the structure, not as a caveat. The 3D shape and padding create the space over the eyes. A machine crushes both. A flat silk rectangle can be machine washed because it has no shape to lose.",
    "Never claim 100% blackout. Everyone does, almost nothing achieves it, and the failure point is always the nose bridge. Naming that is the most differentiating thing on the page.",
    "Disclose the fill material once confirmed. Everyone else says 'cloud padding', which means polyester.",
    "Never run a compare-at strikethrough on a fake MSRP. Strikethrough is legitimate only when the struck number is a real purchasable price, which is true for the Sleep Set versus buying both separately.",
    "Brand-level review proof is honest on the Rêve page: 78,000+ customers and 563 reviews for Lunia Life products. Never attribute those reviews to Rêve itself.",
    "The honest-margins add-on line, verbatim: 'The mask is $78 on its own. It is $49 here because you are already paying for the box, and we are not paying to acquire you twice. That difference is the only thing that changed.'",
  ],

  toConfirm: [
    "Fill material and composition", "Lining", "Strap composition", "Eye clearance in mm",
    "Dimensions", "Weight in grams", "Head circumference range", "Country of origin",
    "OEKO-TEX Standard 100 status", "Whether $9.50 is FOB or landed",
  ],

  launchGates: [
    "No paid acquisition on 200 units. Selling out mid-learning-phase kills the ad set. Warm traffic, email and organic only.",
    "No mask creative in C1 or C2. Mask creative is inherently lifestyle, and lifestyle clicks but does not buy on this account. Separate campaign, Instagram only, judged on its own CPA.",
    "Tag every mask order from order one. A $78 SKU inflates AOV and can hide a regression in acquisition subscription mix, which is the primary metric.",
  ],

  strategicRole:
    "The mask's job is not margin. At roughly $11 landed it is cheap enough to use as an " +
    "incentive to move a one-time buyer onto a subscription. But 200 units cannot fund an " +
    "open offer. Run it capped: about 25 units to a defined segment against a holdout. If " +
    "it moves the number, that is the business case for a 1,000-unit reorder. Reorder " +
    "decision at 60% sell-through, not 90%. Lead time is 4 to 8 weeks plus freight.",
} as const;

// ---------------------------------------------------------------------------
// Image generation — the Product Reference Rule (v3)
// ---------------------------------------------------------------------------
// The old BOTTLE_VISUAL_SPEC is gone. Never describe the product in words.
// Attach the reference, every time, and attach the logo separately from the
// bottle. Two references, two jobs.

export const REFERENCE_IMAGES = {
  // @image_1 — the isolated logo mark. PENDING. Mathan is supplying the file.
  // Until it exists, drop the @image_1 sentence from the product block and
  // generate off @image_2 alone. Do not substitute a crop of the bottle photo.
  logoMark: null as string | null,

  // @image_2 — the bottle, current featured packshot.
  bottle:
    "https://cdn.shopify.com/s/files/1/0619/2021/5121/files/magnific_premium-editorial-studio-_po6s1xTehw.png?v=1781053285",
  bottleBackupAngle:
    "https://cdn.shopify.com/s/files/1/0619/2021/5121/files/1_50d2f772-0f60-4a92-9c24-e2a7310c5a65.png?v=1772587956",
};

export const PRODUCT_REFERENCE_BLOCK = `=== PRODUCT: the bottle in @image_2, the logo mark in @image_1 ===
@image_2 is the product. Reproduce that exact supplement bottle as photographed: the same silhouette and proportions, the same cap, the same label artwork, colours, typography and wording. Treat the label as printed artwork being copied, not as a design to be generated. Do not redesign, restyle, simplify, reinterpret or rearrange any part of it.
@image_1 is the Lunia Life logo mark on its own. Wherever the logo appears on the label, reproduce it exactly as shown in @image_1, not a redrawn, simplified or recoloured version.
The label text stays exactly as it appears in the reference. Never add, swap or invent an ingredient name. The words Melatonin, Ashwagandha, Valerian, Chamomile and GABA must never appear anywhere on the product.`;

export const SCALE_BLOCK = `SCALE: a hand held 60 count supplement bottle. It sits inside a closed adult palm with the fingers wrapping most of the way around it, about one third the height of an adult face. Never larger than a coffee mug, and never scaled up beyond the proportions in the reference.`;

export const ANATOMY_BLOCK = `ANATOMY: every hand has exactly five fingers, every person exactly two hands, every hand belongs to a visible person. No extra fingers, no sixth digit, no extra or disembodied hands, no fused fingers, no elongated forearms.`;

export const NEGATIVE_LIST = `Avoid: the words Melatonin or Ashwagandha, a redesigned or restyled label, altered label wording, changed label colours or typography, a different bottle from the one in the reference, a generic stock supplement bottle, an oversized product, extra fingers, six fingers, extra hands, disembodied hands, fused fingers, elongated arms, purple, lavender, magenta, neon, gradient backgrounds, stock photo look, plastic skin, glossy retouching, whitened teeth, bokeh, gibberish text, watermarks, text overlapping the subjects, any second block of text.`;

// Street frames swap the tail of NEGATIVE_LIST for:
export const NEGATIVE_LIST_STREET_TAIL = `neon signs, orange sodium glow, HDR, heavy bokeh, readable street signage or branding`;

/** @deprecated v1.0 wrote a nine-point description of the bottle. It described
 * the product as a wide squat jar, which it is not, and it fought the attached
 * reference for control of the render. Use PRODUCT_REFERENCE_BLOCK instead.
 * This export is kept only so old imports do not break. */
export const BOTTLE_VISUAL_SPEC = PRODUCT_REFERENCE_BLOCK;

export const IMAGE_VERIFICATION_CHECKLIST = [
  "Bottle matches @image_2 exactly: same silhouette, same cap, same label",
  "Logo mark matches @image_1 exactly, not softened, redrawn or recoloured",
  "Ingredients read exactly Magnesium glycinate, Apigenin, L-Theanine, on three lines",
  "No melatonin, ashwagandha or any other ingredient name anywhere",
  '"60" large with "caps" small beneath, not "60 CAPSULES"',
  "Bottle fits in the hand, roughly one third the height of a face",
  "Five fingers per hand, no extra or disembodied hands",
  "Overlay copy sits on flat backdrop, never across a person",
];
// A generated label is a claims surface. Check it like one.

// Platform notes: Higgsfield gpt_image_2 at 2k, quality high, 3:4, is 7 credits
// and the best value by far. Magnific gpt-2 is 260 credits for the same model
// tier, use only if Higgsfield is down. Unlimited passes do not reach the MCP
// connector, so budget on credits.

// ---------------------------------------------------------------------------
// Photography style
// ---------------------------------------------------------------------------
export const BOTTLE_PHOTOGRAPHY_STYLE = `Editorial supplement photography. \
Place the bottle on a natural travertine or honed stone surface. \
Soft diffused natural light from a window, golden hour or overcast. \
Props kept minimal: a single botanical element (dried lavender sprig, \
ranunculus, or chamomile stem, one prop only). \
Background: cream linen, warm ivory, or soft sage. Never dark, never \
moody, never gradient. The overall feel is airy, natural, and lifestyle-\
editorial. Not clinical, not centred-on-white. \
Colour palette in the scene: warm cream, natural stone, soft sage, amber \
glass warmth. No purple, no lavender tones, no neon.`;

export const REVE_PHOTOGRAPHY_STYLE = `Bright, clean, beauty-editorial. Plain \
white, off-white or light grey backdrops. Soft broad frontal light, minimal \
shadow. Luminous skin with natural texture, minimal makeup, calm unforced \
expression, tight framing. Aspect ratio 3:4 for portraits, 4:3 for \
pillow-height shots. This is deliberately brighter than the Restore direction: \
the right reference is Drowsy, since the products are nearly identical. \
Close every prompt with: "Strictly no purple, no lavender and no violet \
anywhere. No moon or star motifs. No clinical or medical imagery. No text or \
graphics. No heavy skin retouching." \
The woven LUNIA LIFE label will garble in generation. For frames where the \
label must read, use real photography or a PIL composite.`;

// ---------------------------------------------------------------------------
// Machine-readable banned list. Lint every generated asset against this.
// ---------------------------------------------------------------------------
export const BANNED_PHRASES = [
  // Hype
  "breakthrough", "miracle", "magic", "secret", "hack", "life-changing",
  "revolutionary", "transform your sleep", "unlock", "supercharge", "optimize",
  "biohack", "game-changer", "next-level",
  // AI tells
  "in today's fast-paced world", "let's dive in", "on a journey to",
  "navigate the", "empower you to", "the power of", "elevate your",
  "embrace the", "unleash", "discover the secret to", "say goodbye to",
  "struggle is real",
  // Dose inflation
  "clinically dosed", "clinical dose", "clinically studied dose",
  "the researched dose", "clinically informed", "clinically formulated",
  "clinically proven",
  // Disease and outcome
  "treats insomnia", "cures insomnia", "cures sleep", "fixes your sleep",
  "prevents 3am", "stops waking up", "blocks cortisol", "lowers your cortisol",
  "resets cortisol", "replaces medication", "doctor-recommended", "FDA approved",
  "guaranteed results", "instant relief", "works the first night",
  "knocks you out", "knockout", "sedative", "ambien", "lunesta",
  // Ingredient-specific
  "boosts glymphatic", "boosts alpha waves", "most absorbable form",
  "apigenin from chamomile", "our apigenin comes from chamomile",
  "anti-aging", "extends lifespan",
  // Urgency
  "last chance", "final hours", "act now", "don't miss out",
  // Price
  "under $1 per serving",
];

// Regex checks that catch shapes rather than strings.
export const BANNED_PATTERNS = [
  { name: "em dash", pattern: /—/ },
  { name: "en dash used as em dash", pattern: /\s–\s/ },
  { name: "'X is not Y, it is Z' construction", pattern: /\bis not\b[^.?!]{0,60}\bit'?s\b/i },
  { name: "multiple exclamations", pattern: /!(?=[\s\S]*!)/ },
  { name: "rhetorical tired-of question", pattern: /\b(tired of|sick of|struggling with)\b[^.?!]*\?/i },
  { name: "under a dollar without subscription context", pattern: /under (a dollar|\$1)(?![\s\S]{0,160}(subscri|monthly|quarterly|plan))/i },
  { name: "one capsule dosing error", pattern: /\bone capsule\b[^.?!]{0,40}\bbed\b/i },
];

// ---------------------------------------------------------------------------
// Full brand guidelines string (inject into prompts)
// ---------------------------------------------------------------------------
export const BRAND_GUIDELINES = `# LUNIA LIFE — Brand Guidelines (CMS Handbook v${BRAND_VERSION}, ${BRAND_UPDATED})

These guidelines are non-negotiable. They override any general writing advice,
popular copywriting frameworks, or generic supplement marketing conventions.

## The products

Two SKUs. Lunia Restore is the hero and the default. Lunia Rêve is a sleep mask
that supports it. Never invent a third product, and never write Rêve copy into a
Restore asset unless the brief says bundle.

### Lunia Restore
- Format: capsules, 60 per bottle (30 servings, 30 nights)
- Dose: UP TO 2 capsules, 30 to 60 minutes before bed. Never write "one capsule".
- Price: $38.93 one time, $29.20 monthly subscription, $19.99 per bottle on the
  quarterly plan, $99.30 for the one-time 3-pack
- Per night: $1.30 one time, $0.97 monthly subscription, $0.67 quarterly
- Reviews: 563 reviews, 4.91 stars, 91% five-star
- Customers: trusted by 78,000+ users

### Lunia Rêve
- Mulberry silk sleep mask, $78 standalone, $49 as an in-cart add-on to Restore
- Structured 3D shape, curved nose notch, woven LUNIA LIFE label
- Hand wash only, and that is a feature of the structure, not a caveat
- Never mention momme. Never claim 100% blackout.

### Formulation (exact, never deviate from these doses)

| Ingredient             | Dose                    | Key mechanism                                               |
| ---------------------- | ----------------------- | ----------------------------------------------------------- |
| Magnesium Bisglycinate | 500 mg (90 mg elemental)| NMDA and GABA-A receptor systems, neural excitability        |
| L-Theanine             | 300 mg                  | Blocks glutamate, associated with calm without sedation      |
| Apigenin               | 50 mg                   | Benzodiazepine site of GABA-A, a flavone found in chamomile  |

Non-negotiable product facts: melatonin-free, no proprietary blends, transparent
dosing, vegan, GMO-free, gluten-free, no artificial fillers.

"Non-habit forming" and "natural sleep support" require compliance sign-off
before they ship. Do not use them freely.

## The price frame, which is enabled and should be used

Under a dollar a night, on subscription. This is one of the two proven converting
frames on cold traffic and it does double duty, because the subscription is both
what makes the claim true and what makes the customer profitable.

APPROVED:
- "Under a dollar a night on subscription"
- "Less than a dollar a night when you subscribe"
- "97 cents a night on the monthly plan"
- "67 cents a night on the quarterly plan"
- "Under a dollar a night, which is less than Beam, Momentous or Ritual"

BANNED: the same number with no subscription anywhere in the asset. At the
one-time price it is $1.30 a night and the unqualified claim is false. The
subscription has to be visible in the same asset, ideally the same sentence.
In a headline with no room, the primary text or the on-screen line underneath
carries it. Never let the number travel alone.

Say "night", not "day" and not "serving". One serving is one night, and this is
a sleep brand.

## Core differentiators (use these, do not invent others)

1. Melatonin-free. Customers with grogginess, tolerance, or vivid dreams from
   melatonin are actively looking for this.
2. Transparent dosing. Every ingredient and exact amount is listed.
3. Synergistic stack. Three pathways: GABA modulation, glutamate blocking,
   nervous system calming.
4. Designed for next-day clarity, not sedation. No hangover effect.
5. Under a dollar a night on subscription, below Beam, Momentous and Ritual.
6. Sleep-first brand. No category drift.

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

## Banned words and phrases (absolute, no exceptions)

Hype words:
breakthrough, miracle, magic, secret, hack, life-changing, revolutionary,
transform your sleep, unlock, supercharge, optimize, biohack, game-changer,
next-level

AI-sounding phrases:
"in today's fast-paced world", "let's dive in", "on a journey to", "navigate the",
"empower you to", "the power of", "elevate your", "embrace the", "unleash",
"discover the secret to", "say goodbye to", "struggle is real"

Dose-inflation phrases (these trigger a compliance rewrite regardless of context):
"clinically dosed", "clinical dose", "the clinically studied dose", "the researched
dose", "clinically informed", "clinically formulated", "clinically proven"

Note on "full doses": accurate for L-theanine and defensible as a formula-level
statement about transparency and no proprietary blends. NOT accurate as a claim
that every ingredient sits at a trial dose. Do not stretch it that far.

Banned constructions:
- "X is not Y, it is Z" — banned sentence shape, anywhere
- Em dashes. Use commas, periods, or parentheses
- More than one exclamation per piece (zero is the default)
- Rhetorical questions the reader cannot answer: "Tired of being tired?"
- Generic urgency on always-available products: "last chance", "final hours"
- Hashtag blocks and keyword stacks
- Naming a competitor, except in a current, checkable price comparison

## Compliance language

ALLOWED framings:
"Supports sleep quality" / "May help you wind down" / "Helps promote a calmer
nervous system" / "Shown in studies to support" / "Associated with improved" /
"Designed to support" / "May help reduce nighttime awakenings" / "Supports deep and
REM sleep" / "Supports nervous system regulation" / "Melatonin-free sleep support"

BANNED claim language:
Treats insomnia, cures sleep problems, fixes your sleep, prevents 3am wakeups,
stops waking up, blocks cortisol, diagnoses, replaces medication,
doctor-recommended (without a named doctor on file), FDA approved,
clinically proven (Lunia has no clinical trial on the finished formula),
guaranteed results, instant relief, works the first night,
comparisons to Ambien/Lunesta, knockout, sedative, drug-like framing.

Compliance swaps:
- "Cures insomnia" → "Supports relaxation and healthy sleep onset"
- "Prevents 3am wakeups" → "May help reduce nighttime awakenings"
- "Guaranteed to work" → "Backed by research on each ingredient"
- "Falls asleep instantly" → "Helps you wind down"
- "Knocks you out" → "Supports natural sleep onset"
- "Melatonin-free means safer" → "Melatonin-free, designed for nightly use"
- "Clinically formulated" → "Formulated from the published research on each ingredient"

Disclaimers:
- "Individual results may vary" goes on EVERY outcome claim, in every channel.
- The FDA disclaimer goes on the PDP, blog, email footers and educational social
  where a product claim is attached. Ad units do not need it, but the landing page
  must carry it, so never write an ad claim the landing page cannot support.

## Evidence tiers, because the tier governs the verb

- Tier A. Human RCT on the ingredient at or near our dose.
  Licensed: "shown in a randomised controlled trial", "in a placebo-controlled trial".
- Tier B. Pooled human evidence, or human RCT on a related form or higher dose.
  Licensed: "research suggests", "studies have found", "associated with".
- Tier C. Human observational.
  Licensed: "associated with", "people with higher intake tend to". Never a causal verb.
- Tier D. Mechanistic, in vitro or animal.
  Licensed: "binds to", "acts on", "in laboratory studies", "the rationale for".
  Never a human outcome, duration or percentage.
- Tier X. Not licensed. Null results, mixed literature, finished-product performance.

Where each ingredient sits: magnesium is our strongest form story and our weakest
dose story. L-theanine is our strongest dose story and a solid evidence story.
Apigenin is our strongest mechanism story and our thinnest human evidence story.
Copy that plays to each ingredient's actual strength outperforms copy that treats
all three as equally proven, and it survives scrutiny.

## Science library (cite from here, do not invent citations)

Magnesium Bisglycinate:
• "In a placebo-controlled trial, magnesium bisglycinate was shown to reduce
  insomnia severity scores" (Tier A, Schuster 2025)
• "Research suggests people with lower dietary magnesium intake may see more benefit"
• "The bisglycinate form is chelated for absorption and is generally gentler on the
  stomach than magnesium oxide" (Tier B)
• "Magnesium acts on NMDA and GABA-A receptor systems that regulate neural
  excitability" (Tier D, no outcome or timing claim in the same sentence)
GUARDRAILS: no glycine outcome claims (we deliver 410 mg, the glycine trials used
3,000 mg). Deep sleep is when clearance systems are most active, magnesium does not
boost glymphatic clearance.

L-Theanine:
• "A 2025 meta-analysis of 19 trials found L-theanine improved subjective sleep
  quality and sleep onset" (Tier B)
• "Research points to a 200 to 450 mg daily range, and Lunia uses 300 mg"
• "L-theanine is associated with a calm, alert state rather than sedation"
• "In a controlled study, a single dose reduced the salivary cortisol response to an
  acute stressor" (Tier A, ACUTE ONLY)
• "L-theanine has been shown to change alpha-band brain activity, a pattern
  associated with wakeful calm"
GUARDRAIL: cortisol language stays tied to the acute stress response. Chronic dosing
did not produce a between-group cortisol difference.

Apigenin:
• "Apigenin binds to the benzodiazepine site on GABA-A receptors in laboratory
  studies" (Tier D)
• "A flavone found in chamomile"
• "Higher dietary apigenin intake has been associated with better sleep quality, and
  chamomile extract trials show improvements in sleep quality" (Tier C and B)
• "50 mg of isolated apigenin, far more than chamomile preparations deliver"
GUARDRAILS: frame human outcomes at the chamomile-and-apigenin level. Never claim our
apigenin is sourced from chamomile. There is no trial-derived isolated-apigenin dose,
and the 50 mg convention comes from Huberman's protocol, not from dose-response work.

Stack synergy:
• "Magnesium and apigenin act at different binding sites on an overlapping receptor
  system, which is the rationale for combining them" (Tier D)
• "Three ingredients targeting overlapping but complementary pathways"
• "Designed for sleep architecture and continuity, not knockout sedation"
BANNED: "clinically proven synergy", any percentage from the mouse study.

Consistency of use, which is also the subscription argument:
• "In a chamomile trial, sleep improvements tracked with continued use and were not
  present four weeks after stopping" (Tier B, Chang and Chen 2016). Cite as a
  chamomile finding, never as a Lunia outcome.

Finished product: there is no randomised trial on the finished Lunia formula. Say so.

## Objection handling, in one line each

"Your magnesium dose is too low." Lower than the bisglycinate trial dose, and we say
so. It is formulated to work with apigenin on overlapping pathways, not as standalone
magnesium therapy. It is also more real magnesium than most products claiming five
times as much.

"There is magnesium oxide in your product." The buffered chelate contributes 28 to 44
percent of the magnesium as oxide, we publish the number, and we name oxide on the
panel. Almost nobody else in the category does either.

"Apigenin has no human trials." There are no randomised trials of isolated apigenin
for sleep, and we do not claim otherwise. What exists is receptor-level evidence,
pooled chamomile extract trials, and a 1,936-person dietary study.

"Your apigenin isn't from chamomile." We do not claim it is. It is a high-purity
isolate. No 50 mg apigenin capsule in existence contains chamomile extract.

"You have never tested the actual product." Correct, and we say so on the record.
Our evidence is ingredient-level, at doses and forms we publish in full.

"Studies show magnesium does not help sleep." Some do. The literature is genuinely
mixed. Modest and real is the honest reading.

## Compound naming

Magnesium Bisglycinate in blog, PDP, paid captions and founder contexts.
Magnesium Glycinate in short-form video, on-screen hook text and creator scripts.
When a caption case feels ambiguous, default to Bisglycinate.

## Who you are writing to

Urban, health-conscious adults aged 25 to 50. NYC is the archetype. Sleep-literate,
ingredient-aware, skeptical of supplement marketing. They research before buying.
They read ingredient panels. They have tried melatonin and had grogginess or
tolerance. They want better sleep architecture, not to be knocked out.

Their real problems:
• Staying asleep (the 3am cortisol wake-up is the #1 pain point)
• Wired but tired, mentally activated at night even when physically exhausted
• A chatty mind, not physical restlessness
• Melatonin grogginess or vivid dreams
• They need next-day clarity, they are high-functioning and cannot afford fog

What they want from Lunia:
• Calm, restorative nights / Less 2 to 3am waking / Less morning grogginess
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
4. Metabolic impacts: cravings, glucose, framed as associations only
5. Longevity: healthspan, cognitive resilience, glymphatic system
6. Wind-down routines: light, temperature, caffeine timing, screen exposure
7. Ingredient education: what each ingredient does, why the stack synergizes
8. Category honesty: dosing arithmetic, elemental versus compound weight, what
   "third-party tested" legally means. This is the newest and strongest pillar and
   almost nobody else can write it, because almost nobody else can survive it.

## Proven content angles (use these first)

• 3am wakeups tied to cortisol timing
• Cortisol and weight management (cravings, abdominal fat, water retention)
• Alcohol as sedative versus restorative sleep disruptor
• Glymphatic system as "brain clean-up" during deep sleep
• Sleep deprivation effects on skin
• Melatonin tolerance and grogginess
• Magnesium bisglycinate versus oxide (absorption story, told honestly, see above)
• Why apigenin is in chamomile and what it does for sleep
• The 3-ingredient synergy (GABA modulation + glutamate blocking + NS calming)
• Elemental versus compound weight: why "magnesium glycinate 500 mg" on a competitor
  label is 70 mg of magnesium
• Why a real chelate is bulky, and what a two-capsule serving can physically hold

## Winning ad framings (paid Meta, default to these for ad copy)

Every purchase in Lunia's history has come from credibility-forward creative.
Pain-point hooks do NOT convert on cold traffic. Lifestyle and UGC clicks but does
not buy.

• "honest_authentic" — creator was skeptical, looked at the ingredients, tried it
• "best_investment" — smart spend, ingredient quality, under a dollar a night
• "Skeptic Convert" — tried consistently, real outcome over weeks
• "Morning Outcome" — leads with the result (clear morning, no grogginess)
• "$1 Comparison" — price transparency versus Beam, Momentous, Ritual
• "Read the label first" — print all three amounts in the ad, let the numbers argue

## Placements

Instagram only. Feed takes 4x5. Stories, Status and Reels take 9x16. Everything
else stays off, including Facebook placements, Audience Network and Search results.
Upload 1x1, 4x5 and 9x16 in Customize Media so Meta picks the crop, then toggle the
placements down. ChatGPT ad placement is the one exception that needs 1x1.

Every paid caption closes with a CTA to lunialife.com. The product name never lands
in sentence one.

## Visual identity

Six colours. No others, ever.
- Deep Navy ${PALETTE.deepNavy} (primary text, headers, navigation, footer, standard dark UI)
- Rich Navy ${PALETTE.richNavy} (editorial hero, dark sections, email mastheads, dark-mode hero)
- Slate Blue ${PALETTE.slateBlue} (secondary text, containers, borders)
- Soft Ivory ${PALETTE.softIvory} (default light background, negative space, inverse text on navy)
- Aqua Accent ${PALETTE.aquaAccent} (highlights, subtle emphasis, UI feedback)
- Signal Yellow ${PALETTE.signalYellow} (key actions, web CTAs, badges)

Accents together are capped at 5 to 10% of any layout. Contrast, not decoration.
Never place Deep Navy and Rich Navy adjacent in the same module.

CTA colour splits by channel, deliberately: web and landing pages use Signal Yellow
with navy text. Email uses Soft Ivory text on Rich Navy. Signal Yellow is not an
email CTA colour.

HARD DON'TS: purple, lavender, violet, magenta, neon, gradients, wellness pastels,
sunset gradients, and any colour not on the six-colour list above.

## Email typography

Inter is the single typeface for all email content.
- Headlines (H1/H2): Inter 400 (Normal), letter-spacing -0.01em, color ${PALETTE.deepNavy}
- Body: Inter 300 (Light), line-height 1.6, color ${PALETTE.slateBlue}
- Bold within body: Inter 700, sparingly, ingredient names and risk-reversal phrases only
- CTA button: Inter 700 (Bold), ${PALETTE.softIvory} text on Rich Navy ${PALETTE.richNavy} background
Do NOT use Georgia, serif, or any other font family.

Test the ê in Rêve across Gmail, Outlook and Apple Mail before any subject line ships.`;

// ---------------------------------------------------------------------------
// Open actions carried in this file so they do not get lost.
// Ranked by cost-to-fix against exposure.
// ---------------------------------------------------------------------------
export const OPEN_ACTIONS = [
  { effort: "5 min",  item: "PDP headline reads 'Clinically Formulated for Restorative Sleep'. Banned construction under this handbook, on the highest-traffic page. Rewrite it." },
  { effort: "5 min",  item: "CONFIRMED WRONG, FIX: Pack #5 AD013 primary text B says 'One capsule, 30 to 60 minutes before bed'. The dose is up to two. Corrected line: 'Two capsules, 30 to 60 minutes before bed.'" },
  { effort: "1 email",item: "Get the chelate hydration state and the apigenin production route from the manufacturer in writing. Everything else in SOURCING_TRUTH depends on it." },
  { effort: "1 hour", item: "Audit every surface for a chamomile-source claim on apigenin, then fix the copy before publishing anything on the topic." },
  { effort: "5 min",  item: "Email spec now uses Slate Blue for body text and Soft Ivory for CTA text, replacing #1A1A1A and #ffffff, which were not on the approved palette. Check a live Klaviyo template renders correctly before the next send." },
  { effort: "label",  item: "Check the printed Supplement Facts panel. If magnesium oxide is not named as a source, add it. Removes the Hoffman/Copeland theory and creates a claim nobody can match." },
  { effort: "1 email",item: "Confirm whether the L-theanine is Suntheanine or generic. If generic, make sure no copy cites Suntheanine trial data." },
  { effort: "5 min",  item: "Reconcile Rêve colourway names before any print run: canon says Midnight and Mist, Shopify says Fathom and Sky Blue." },
  { effort: "5 min",  item: "Supply the isolated logo mark for @image_1 and put it on the Shopify CDN, then fill REFERENCE_IMAGES.logoMark." },
  { effort: "half day",item: "Reconcile the magnesium oxide blog framing before publishing further comparison content." },
  { effort: "5 min",  item: "Verify the $99.30 three-pack against the live bundle before quoting it anywhere." },
  { effort: "half day",item: "Wire BANNED_PHRASES and BANNED_PATTERNS into a pre-publish lint. Every item above that is a copy error would have been caught automatically." },
];
