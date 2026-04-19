export interface AngleConcept {
  id: string;
  label: string;
  videoHook: string;
  textHook: string;
  narrativeArc: string;
}

export interface Angle {
  key: string;
  label: string;
  description: string;
  concepts: AngleConcept[];
}

export const ANGLE_LIBRARY: Angle[] = [
  {
    key: "perimenopause",
    label: "Perimenopause",
    description: "Women in their late 30s to early 50s noticing early hormonal shifts. Lead with the symptom, not the label.",
    concepts: [
      {
        id: "perimenopause-wtf",
        label: "Wait, this is perimenopause?",
        videoHook: "Hold up a pill, look at camera. \"I thought I was losing my mind. Turns out I was just 42.\"",
        textHook: "Nobody told me mood swings at 42 were a hormone thing.",
        narrativeArc: "Symptom first (brain fog, irritability, sleep). Doctor or friend connects it to perimenopause. Found Lunia. Three weeks in, the fog lifted. Specific number: went from waking up 4x a night to once.",
      },
      {
        id: "perimenopause-sleep",
        label: "The 3am wake-up fix",
        videoHook: "In bed, dim light. \"If you're watching this at 3am, same.\"",
        textHook: "Every night. 3:17am. Eyes open. Then I started taking this.",
        narrativeArc: "Open on the nightly wake-up pattern. Name the hormone shift that causes it. Show the supplement as part of evening routine. After two weeks, sleeping through. No claim of cure, just \"may support sleep quality.\"",
      },
      {
        id: "perimenopause-brain-fog",
        label: "Word you can't find",
        videoHook: "Mid-sentence pause. \"You know when you can't find the word? Yeah.\"",
        textHook: "I forgot the word for refrigerator. That was the day I started looking into this.",
        narrativeArc: "Specific moment of cognitive slip. Doctor visit or self-research. Connect estrogen drop to memory. Three ingredients in Lunia that may support cognitive function. Numbers: forgetting 3+ words a day, down to almost none.",
      },
    ],
  },
  {
    key: "menopause",
    label: "Menopause",
    description: "Post-period women managing hot flashes, sleep, mood, bone density. Direct, no euphemisms.",
    concepts: [
      {
        id: "menopause-hot-flash",
        label: "Hot flash at the meeting",
        videoHook: "Fanning face with a notebook. \"The meeting was 20 minutes. I had 4 hot flashes.\"",
        textHook: "I'm not nervous. I'm 54.",
        narrativeArc: "Specific work scenario. Describe the physiological spike. Mention Lunia ingredients that may support thermoregulation. Outcome: \"went from 4-5 a day to maybe one.\" Real number, no miracle framing.",
      },
      {
        id: "menopause-mood",
        label: "Snapping at my husband",
        videoHook: "Half-smile. \"My husband asked what he did wrong. He did nothing.\"",
        textHook: "It's not you. It's my estrogen.",
        narrativeArc: "Confess the mood swings. Frame it as physiological, not character. Lunia supports hormone balance. After a month: still human, but more in control.",
      },
      {
        id: "menopause-bone",
        label: "My mom had osteoporosis",
        videoHook: "Mom's photo on wall. \"She broke her hip at 68. I'm 56. I'm not doing that.\"",
        textHook: "Menopause accelerates bone loss. I'm getting ahead of it.",
        narrativeArc: "Family history as motivation. Science moment: estrogen and bone density. Lunia's role in a daily routine alongside weight training and calcium. Proactive framing, not fear.",
      },
    ],
  },
  {
    key: "skeptic",
    label: "Skeptic",
    description: "For viewers allergic to supplement hype. Lead with the doubt, end with specifics.",
    concepts: [
      {
        id: "skeptic-1",
        label: "I don't do supplements",
        videoHook: "Arms crossed. \"I don't do supplements. I did this one.\"",
        textHook: "Skeptic. Converted. Here's why.",
        narrativeArc: "Open with the skeptical posture. Explain the bar (peer-reviewed ingredients, no proprietary blends). Walk through one or two mechanisms in plain language. End with a small observable change, not a transformation.",
      },
      {
        id: "skeptic-ingredients",
        label: "Reading the label",
        videoHook: "Rotating the bottle. \"Let me show you what's actually in this.\"",
        textHook: "Most supplements hide behind \"proprietary blend.\" This one doesn't.",
        narrativeArc: "Show the label. Name three ingredients, what each does, and the dose. Contrast with a typical blend that hides dosage. Mention may support claims, not cures. Trust built through transparency.",
      },
      {
        id: "skeptic-doctor",
        label: "What my doctor said",
        videoHook: "\"I brought this to my doctor. She had notes.\"",
        textHook: "My doctor reviewed the label. This is what she said.",
        narrativeArc: "Doctor authority without claiming endorsement. Doctor confirmed the ingredients are evidence-backed at these doses. Acknowledge what it won't do. End with: \"she said it's reasonable. Not magic, but reasonable.\"",
      },
    ],
  },
  {
    key: "science",
    label: "Science-backed",
    description: "Mechanism-first. Show the study. For viewers who read PubMed.",
    concepts: [
      {
        id: "science-mechanism",
        label: "The mechanism",
        videoHook: "Whiteboard sketch of estrogen curve. \"This is what happens at 45.\"",
        textHook: "Estrogen drops. GABA drops. Sleep drops. Here's what helps.",
        narrativeArc: "Draw the hormone curve. Explain the cascade. Show the ingredient that targets one specific step. Cite a study (journal + year). Limit one claim per video. End with: \"this is one piece of the puzzle.\"",
      },
      {
        id: "science-dose",
        label: "Why dose matters",
        videoHook: "Two bottles side by side. \"Same ingredient. 10x the dose.\"",
        textHook: "The study used 500mg. Most supplements give you 50.",
        narrativeArc: "Compare competitor doses. Explain why clinical dose matters. Show Lunia's dose matches the study. Acknowledge: more isn't always better, but under-dosed is useless. Trust through specificity.",
      },
      {
        id: "science-mineral",
        label: "Magnesium isn't magnesium",
        videoHook: "Three bottles labeled magnesium. \"These are not the same.\"",
        textHook: "Magnesium oxide. Glycinate. Citrate. They do different things.",
        narrativeArc: "Walk through forms of a mineral and bioavailability. Name which form Lunia uses and why. Mention which symptoms each form may support. Educator energy, not salesperson.",
      },
    ],
  },
  {
    key: "ritual",
    label: "Daily ritual",
    description: "Integration into an existing morning or evening routine. Soft, observational.",
    concepts: [
      {
        id: "ritual-morning",
        label: "Coffee + this",
        videoHook: "Pouring coffee. \"Two things before I talk to anyone.\"",
        textHook: "My morning stack. Three items. That's it.",
        narrativeArc: "Minimal morning scene. Coffee, water, Lunia. Narrate why you added it. Visual rhythm of a habit, not a pitch. End with: \"six weeks in. Still here.\"",
      },
      {
        id: "ritual-evening",
        label: "Wind-down",
        videoHook: "Dim bedroom. \"The last thing I do at night.\"",
        textHook: "Evening routine got one new addition.",
        narrativeArc: "Bath or book scene. Take Lunia with water. Talk about why evening dosing made sense. Subtle cue to the sleep-support ingredients. Calm voice, slow cuts.",
      },
      {
        id: "ritual-gym",
        label: "Before the workout",
        videoHook: "Gym bag zipping. \"This is in the bag now.\"",
        textHook: "40 and lifting heavier than at 30. Here's the stack.",
        narrativeArc: "Pre-workout scene. Mention hormones and muscle retention post-40. Lunia's role alongside protein and training. Specific number: up from 95 to 115lb deadlift. No hype.",
      },
    ],
  },
  {
    key: "community",
    label: "Community + family",
    description: "Not my story — my mom's, my sister's, my friend's. Authentic referral energy.",
    concepts: [
      {
        id: "community-mom",
        label: "My mom tried it",
        videoHook: "Holding a bottle. \"I gave this to my mom. She's 58.\"",
        textHook: "Bought it for me. Ended up buying one for my mom too.",
        narrativeArc: "Frame as a gift/share. Mom's specific symptoms. What changed for her after three weeks. Return to how that felt — helping someone you love. Warm, not performative.",
      },
      {
        id: "community-sister",
        label: "Sister group chat",
        videoHook: "Phone on table. \"My sister texted me about this at 2am.\"",
        textHook: "Three sisters. One group chat. This came up.",
        narrativeArc: "Relate sharing in a family group chat. Different symptoms, same hormonal root cause. Recommendation spread without marketing. End with: \"we all take it now. Different reasons.\"",
      },
      {
        id: "community-friend",
        label: "Friend's recommendation",
        videoHook: "Friend FaceTime screenshot. \"She doesn't recommend anything. She recommended this.\"",
        textHook: "My most picky friend sent me this link.",
        narrativeArc: "The friend's credibility sets up the recommendation. Why she trusted it. What convinced you. First impression + three-week check-in. Natural word-of-mouth rhythm.",
      },
    ],
  },
  {
    key: "financial",
    label: "Cost + value",
    description: "For viewers questioning the price. Frame it against specific alternatives.",
    concepts: [
      {
        id: "financial-breakdown",
        label: "$2 a day",
        videoHook: "Calculator visible. \"Let's do the math. $2 a day.\"",
        textHook: "Cheaper than my coffee. More useful than my coffee.",
        narrativeArc: "Math the daily cost. Compare to a latte, a drugstore multivitamin. Honest framing: not the cheapest, priced for clinical doses. Subscribe-and-save mention. End with: \"worth it to me. Decide for yourself.\"",
      },
      {
        id: "financial-replacement",
        label: "Replaced three bottles",
        videoHook: "Three old supplement bottles. \"These were on my shelf. Now it's one.\"",
        textHook: "I was stacking 3 supplements. Now it's just this one.",
        narrativeArc: "Show the before (cluttered shelf). List what you were taking and what each targeted. Explain Lunia's formulation consolidates three functions. Do the math on cost savings. End with: \"less stuff, same goals.\"",
      },
      {
        id: "financial-tried-cheaper",
        label: "I tried the cheap one first",
        videoHook: "Cheap bottle in trash. \"I learned the hard way.\"",
        textHook: "Paid $15 at the drugstore. Paid for it in other ways.",
        narrativeArc: "Describe the cheap alternative. Under-dosed ingredient, proprietary blend, no noticeable change after a month. Switched to Lunia. First week felt a difference. Frame the lesson on dose and transparency.",
      },
    ],
  },
];

export function findAngle(key: string): Angle | null {
  return ANGLE_LIBRARY.find((a) => a.key === key) ?? null;
}

export function findConcept(angleKey: string, conceptId: string): AngleConcept | null {
  const angle = findAngle(angleKey);
  if (!angle) return null;
  return angle.concepts.find((c) => c.id === conceptId) ?? null;
}
