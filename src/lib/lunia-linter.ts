// Brand-voice linter for Lunia copy. Pure function, zero deps. Used both
// client-side (highlight as user types) and server-side (folded into the
// analyze prompt context so Claude doesn't have to re-detect).
//
// Rules sourced from Lunia_Email_Flow_Review_Framework.docx v1.0:
//
// 1. No em dashes anywhere. Banned across all Lunia copy.
// 2. Maximum one exclamation mark per piece. Zero is better.
// 3. No "X is not Y, it is Z" sentence structure.
// 4. Banned trust badges: FDA Approved, Doctor Recommended, Clinically Proven.
//
// The linter is conservative — it errs toward false positives for em dashes
// and exclamations because those are easy for the user to accept/dismiss.
// Banned phrase detection is also intentionally narrow to avoid bombing on
// accidental matches in long bodies.

export type LintFindingType =
  | "em_dash"
  | "exclamation_excess"
  | "banned_phrase"
  | "banned_badge";

export type LintFinding = {
  type: LintFindingType;
  range: [number, number];      // [startIndex, endIndex] in the input text
  message: string;
};

export type LintResult = {
  findings: LintFinding[];
};

const MAX_INPUT_CHARS = 50_000;

const BANNED_BADGES = [
  "FDA Approved",
  "FDA-Approved",
  "Doctor Recommended",
  "Doctor-Recommended",
  "Clinically Proven",
  "Clinically-Proven",
];

// Matches "X is not Y, it is Z" / "isn't Y, it's Z" / contracted variants.
// Conservative: requires the connecting comma + "it is/it's" pattern within a
// short window so we don't catch accidentally negated clauses.
const BANNED_PHRASE_RE = /\b(?:is\s+not|isn['’]t|are\s+not|aren['’]t|wasn['’]t|weren['’]t)\s+\S+(?:\s+\S+){0,4}\s*,\s*it[''’]s\s+/gi;

export function lintLuniaCopy(input: string): LintResult {
  if (!input || typeof input !== "string") return { findings: [] };
  const text = input.length > MAX_INPUT_CHARS ? input.slice(0, MAX_INPUT_CHARS) : input;
  const findings: LintFinding[] = [];

  // 1. Em dashes
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 0x2014 /* — */) {
      findings.push({
        type: "em_dash",
        range: [i, i + 1],
        message: "Em dash banned across all Lunia copy. Use a period, comma, or parentheses.",
      });
    }
  }

  // 2. Exclamation excess — flag from the second exclamation onward
  let exclamationCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "!") {
      exclamationCount += 1;
      if (exclamationCount > 1) {
        findings.push({
          type: "exclamation_excess",
          range: [i, i + 1],
          message: "Maximum one exclamation per piece. Zero is better.",
        });
      }
    }
  }

  // 3. Banned phrase: "X is not Y, it is Z"
  let phraseMatch: RegExpExecArray | null;
  BANNED_PHRASE_RE.lastIndex = 0;
  while ((phraseMatch = BANNED_PHRASE_RE.exec(text)) !== null) {
    findings.push({
      type: "banned_phrase",
      range: [phraseMatch.index, phraseMatch.index + phraseMatch[0].length],
      message: "\"X is not Y, it is Z\" is a banned construction across Lunia copy.",
    });
    if (phraseMatch.index === BANNED_PHRASE_RE.lastIndex) BANNED_PHRASE_RE.lastIndex += 1;
  }

  // 4. Banned trust badges
  const lower = text.toLowerCase();
  for (const badge of BANNED_BADGES) {
    const needle = badge.toLowerCase();
    let idx = 0;
    while ((idx = lower.indexOf(needle, idx)) !== -1) {
      findings.push({
        type: "banned_badge",
        range: [idx, idx + badge.length],
        message: `Banned trust badge: "${badge}". Replace with "FDA Registered Facility" or remove.`,
      });
      idx += badge.length;
    }
  }

  // Sort by start index so renderers can walk linearly
  findings.sort((a, b) => a.range[0] - b.range[0]);

  return { findings };
}

// Convenience: flatten lint findings into a short string for prompts so the
// analyze endpoint can include them as context without us paying tokens to
// re-detect.
export function lintFindingsToPromptHint(result: LintResult): string {
  if (!result.findings.length) return "Linter: no findings.";
  const counts: Record<LintFindingType, number> = {
    em_dash: 0,
    exclamation_excess: 0,
    banned_phrase: 0,
    banned_badge: 0,
  };
  for (const f of result.findings) counts[f.type] += 1;
  const parts: string[] = [];
  if (counts.em_dash) parts.push(`${counts.em_dash} em dash${counts.em_dash > 1 ? "es" : ""}`);
  if (counts.exclamation_excess) parts.push(`${counts.exclamation_excess} extra exclamation${counts.exclamation_excess > 1 ? "s" : ""}`);
  if (counts.banned_phrase) parts.push(`${counts.banned_phrase} \"X is not Y, it is Z\" instance${counts.banned_phrase > 1 ? "s" : ""}`);
  if (counts.banned_badge) parts.push(`${counts.banned_badge} banned trust badge${counts.banned_badge > 1 ? "s" : ""}`);
  return `Linter pre-flagged: ${parts.join("; ")}. Surface every instance in the review (Section 5).`;
}
