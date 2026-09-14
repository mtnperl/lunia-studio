// Hook angles — the menu of ways into a deck.
//
// The builder used to write every hook under ONE "hook tone", so the three
// options it offered were three rewordings of a single idea. Choosing between
// them was choosing between synonyms, not between strategies, and when the
// tone did not fit the subject all three missed together.
//
// An angle is the ENTRY POINT into the topic: where the reader is standing
// when the hook reaches them. Tone is voice, angle is door. A spread writes
// one hook per angle, so the options on the table differ by strategy, are
// labelled with the job each does, and one bad angle costs one option instead
// of the whole set.

export type HookAngle = {
  id: string;
  /** Chip and tag text in the builder. Two words at most. */
  label: string;
  /** What this angle does to the reader, in the builder's own words. */
  job: string;
  /** The shape of the sentence, given to the model. */
  formula: string;
  /** The specific way this angle goes wrong, given to the model. */
  guard: string;
  /** Calibration. Sleep-domain, never reused verbatim. */
  examples: string[];
};

export const HOOK_ANGLES: HookAngle[] = [
  {
    id: "symptom",
    label: "Symptom",
    job: "Names something the reader already notices and tells them it means something else.",
    formula: `"[optional number] SIGNS YOUR [lived experience] IS ACTUALLY [real cause], NOT [what they blamed]". Second person. The experience has to be one they would describe the same way themselves.`,
    guard: "A plain fact with the word SIGNS bolted on is not this angle. The reframe (actually Y, not Z) has to be there, and Z has to be what a reasonable person would have assumed.",
    examples: [
      "SIGNS YOUR 3AM WAKING IS CORTISOL, NOT STRESS",
      "SIGNS YOUR TIREDNESS IS SLEEP QUALITY, NOT QUANTITY",
    ],
  },
  {
    id: "paradox",
    label: "Paradox",
    job: "Names a contradiction the reader lives with. They did the right thing and got the wrong result.",
    formula: `"Why are you [still experiencing X] when you [did Y]?" Y has to be something the reader genuinely does and feels should have earned the opposite.`,
    guard: "If Y is generic there is no paradox, only a complaint. Pair a real symptom with a real, earned behaviour.",
    examples: [
      "Why are you exhausted all day when you slept a full eight hours?",
      "Why do you wake at 3am when you went to bed early?",
    ],
  },
  {
    id: "tell",
    label: "Tell",
    job: "Describes one private, oddly specific habit the reader assumed only they had.",
    formula: `"If you [oddly specific private experience], here is what your body is doing." Specific enough to feel personal, common enough that many recognise it.`,
    guard: "Too general kills the recognition, too rare kills the reach. The second half promises physiology, never a diagnosis or a label.",
    examples: [
      "If you get a second wind at 11pm, your cortisol is on the wrong schedule",
      "If you can only fall asleep with noise on, here is why",
    ],
  },
  {
    id: "wrong-door",
    label: "Wrong door",
    job: "Tells the reader they have been treating the wrong thing. The effort was real, the target was not.",
    formula: "Name what they have been fixing, then name the thing that actually governs the outcome. The deck explains the real one.",
    guard: "This is not a myth bust. Nothing they believed is false, it is simply aimed at the wrong system. Do not scold.",
    examples: [
      "YOU HAVE BEEN FIXING YOUR BEDTIME, NOT YOUR BREATHING",
      "THE PROBLEM ISN'T YOUR MATTRESS, IT'S YOUR AIRWAY",
    ],
  },
  {
    id: "myth",
    label: "Myth bust",
    job: "Overturns a belief the reader holds and would defend.",
    formula: "State the widely held belief and negate it, or assert the corrected truth flatly. The reader should feel something they were sure of come loose.",
    guard: "Bust a belief people actually hold, not a strawman. Corrective, never smug.",
    examples: [
      "MELATONIN DOESN'T ACTUALLY MAKE YOU SLEEP",
      "YOU CAN'T REPAY SLEEP DEBT ON WEEKENDS",
    ],
  },
  {
    id: "mechanism",
    label: "Mechanism",
    job: "Teaches one precise thing about how the body works that the reader did not know.",
    formula: "State the mechanism plainly, then let the subline name what it means for the reader. Lead with the insight, never a question.",
    guard: "No hype, no urgency, no 'did you know'. If the line could open any sleep deck it is a stock line and fails.",
    examples: [
      "YOUR BRAIN CLEANS ITSELF ONLY DURING DEEP SLEEP",
      "DEEP SLEEP DROPS NEARLY 40% BY AGE FIFTY",
    ],
  },
  {
    id: "evidence",
    label: "Evidence",
    job: "Leads with the research for the reader who wants the receipt before the story.",
    formula: "Open with the evidence itself (studies show, trials link, research ties) and pair it with a figure you are sure of OR a named mechanism. The sourceNote carries the citation.",
    guard: "Use a figure only when it is real and correctly attributed. A named mechanism always beats an invented statistic.",
    examples: [
      "TRIALS SHOW L-THEANINE CALMS WITHOUT SEDATION",
      "RESEARCH TIES LOW MAGNESIUM TO POOR SLEEP",
    ],
  },
  {
    id: "stakes",
    label: "Stakes",
    job: "Names what this quietly costs, in a currency the reader already cares about.",
    formula: "Name the cost in something measurable and near: tomorrow's focus, blood pressure, the years, the daily energy. Calm and factual.",
    guard: "No fear-mongering, no mortality scare, no cure claim. The cost has to be defensible and specific, and the deck has to pay it off.",
    examples: [
      "UNTREATED, THIS RAISES YOUR BLOOD PRESSURE EVERY NIGHT",
      "YOU ARE LOSING AN HOUR OF DEEP SLEEP A NIGHT",
    ],
  },
  {
    id: "scale",
    label: "Scale",
    job: "Makes something invisible measurable by holding it against a thing the reader knows.",
    formula: "Compare the hidden quantity to a familiar one, so the size lands without a chart. The comparison has to be honest and checkable.",
    guard: "The comparison must be arithmetically true, not merely vivid. If you cannot verify both sides, use a different angle.",
    examples: [
      "THIS STOPS YOUR BREATHING MORE OFTEN THAN YOU BLINK",
      "THAT IS A FULL NIGHT OF SLEEP LOST EVERY WEEK",
    ],
  },
  {
    id: "relief",
    label: "Relief",
    job: "Takes the blame off the reader. It was never discipline, it was physiology.",
    formula: "Name the thing they have been blaming themselves for, then hand the cause to the body. Warm, never patronising.",
    guard: "Relief is not permission to stop trying. The deck still has to give them something to do.",
    examples: [
      "IT ISN'T WILLPOWER, YOUR AIRWAY IS CLOSING",
      "YOU ARE NOT A BAD SLEEPER, YOU ARE AN INTERRUPTED ONE",
    ],
  },
  {
    id: "threshold",
    label: "Threshold",
    job: "Draws the line between normal and not, for the reader quietly wondering which side they are on.",
    formula: "Name the point at which the thing stops being ordinary. A count, a frequency, a duration, taken from the piece.",
    guard: "Only usable when the piece actually contains the threshold. Never invent the number that defines the line.",
    examples: [
      "SNORING IS NORMAL, STOPPING BREATHING IS NOT",
      "WAKING ONCE IS FINE, THIS IS WHEN IT ISN'T",
    ],
  },
  {
    id: "confession",
    label: "Confession",
    job: "One person's account, told in first person, so the mechanism arrives through a life.",
    formula: `"I" or "MY" voice on the struggle or the turning point. One specific symptom and one specific moment beat any claim.`,
    guard: "A real account, not a testimonial. No before-and-after miracle, no product in the headline.",
    examples: [
      "I WOKE AT 3AM EVERY NIGHT FOR YEARS",
      "MY PARTNER NOTICED IT BEFORE I DID",
    ],
  },
];

/** The six that carry most decks. Preselected in the builder. */
export const DEFAULT_SPREAD: string[] = ["symptom", "paradox", "tell", "wrong-door", "mechanism", "stakes"];

export const HOOK_ANGLE_IDS: string[] = HOOK_ANGLES.map((a) => a.id);

export function isHookAngle(id: unknown): id is string {
  return typeof id === "string" && HOOK_ANGLE_IDS.includes(id);
}

export function getHookAngle(id: string | undefined | null): HookAngle | null {
  return HOOK_ANGLES.find((a) => a.id === id) ?? null;
}

/** The label shown on a hook card, for a hook that carries an angle. */
export function hookAngleLabel(id: string | undefined | null): string | null {
  return getHookAngle(id)?.label ?? null;
}

/** Normalise a requested spread: known ids, no duplicates, in library order,
 *  falling back to the default six. Capped so one call stays short. */
export function normalizeSpread(ids: unknown, max = 8): string[] {
  const asked = Array.isArray(ids) ? ids.filter(isHookAngle) : [];
  const set = new Set(asked.length > 0 ? asked : DEFAULT_SPREAD);
  return HOOK_ANGLE_IDS.filter((id) => set.has(id)).slice(0, max);
}

/** The angle briefs handed to the model, one block per requested angle. */
export function anglePromptBlock(ids: string[]): string {
  return ids
    .map((id) => {
      const a = getHookAngle(id);
      if (!a) return "";
      return `ANGLE "${a.id}" (${a.label})
  Job: ${a.job}
  Shape: ${a.formula}
  Fails when: ${a.guard}
  Calibration, never copied: ${a.examples.map((e) => `"${e}"`).join(" / ")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
