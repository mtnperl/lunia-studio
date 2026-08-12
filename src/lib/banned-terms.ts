// Single source of truth for banned terminology across all Lunia copy checks.
//
// Before this module, three linters each carried their own list and had already
// drifted apart:
//
//   compliance.ts        cure/treat/prevent/diagnose + their -ed forms
//   did-you-know-lint.ts the base + -s forms, plus heal/guaranteed/miracle/lunia,
//                        but NOT the -ed forms
//   lunia-linter.ts      trust badges only
//
// So "cured" violated compliance.ts but passed did-you-know, and "miracle"
// violated did-you-know but passed compliance.ts. Same brand, same rules, two
// answers depending on which screen you were on.
//
// This module owns the WORD LISTS and a low-level matcher. It deliberately does
// NOT own the result shapes — each caller has its own contract (severity levels,
// character ranges, plain-string violations) and those stay put. Share the data,
// not the presentation.
//
// ─── Inflection rule ──────────────────────────────────────────────────────────
// Drug-claim stems are regularized to base / -s / -ed. That is a deliberate
// widening over the old union: did-you-know now catches "cured", and
// compliance.ts now catches "miracle". Both widenings are intentional and are
// asserted in banned-terms.test.ts so a future edit can't silently narrow them.

export type BannedTermCategory =
  | "drug_claim"
  | "absolute"
  | "badge"
  | "product_mention";

export type BannedTermMatch = {
  category: BannedTermCategory;
  /** The canonical list entry that matched (e.g. "cure", "FDA Approved"). */
  term: string;
  /** The text as it actually appeared, preserving the author's casing. */
  matched: string;
  /** [startIndex, endIndex) into the scanned string. */
  range: [number, number];
};

/** Verbs that turn a supplement into an unapproved drug claim. */
const DRUG_CLAIM_STEMS = ["cure", "treat", "prevent", "diagnose", "heal"] as const;

/**
 * base / -s / -ed for each stem. Handles the silent-e stems (cure, diagnose)
 * so we get "cured" and "diagnosed" rather than "cureed" / "diagnoseed".
 */
function inflect(stem: string): string[] {
  const endsInE = stem.endsWith("e");
  return [
    stem,
    endsInE ? `${stem}s` : `${stem}s`,
    endsInE ? `${stem}d` : `${stem}ed`,
  ];
}

export const DRUG_CLAIMS: string[] = DRUG_CLAIM_STEMS.flatMap(inflect);

/** Certainty language no supplement may use. */
export const ABSOLUTES: string[] = ["guaranteed", "miracle"];

/**
 * Trust badges Lunia may not display. "FDA Registered Facility" is the
 * permitted alternative — it describes the facility, not the product.
 */
export const BANNED_BADGES: string[] = [
  "FDA Approved",
  "FDA-Approved",
  "Doctor Recommended",
  "Doctor-Recommended",
  "Clinically Proven",
  "Clinically-Proven",
];

/**
 * Product-name mentions. Opt-in per caller: banned in did-you-know carousels
 * (which must read as neutral education, not advertising) but perfectly fine
 * in campaign emails and CTAs.
 */
export const PRODUCT_MENTIONS: string[] = ["lunia"];

export type ScanOptions = {
  /** Default true. */
  drugClaims?: boolean;
  /** Default true. */
  absolutes?: boolean;
  /** Default true. */
  badges?: boolean;
  /** Default FALSE — only did-you-know forbids naming the product. */
  productMentions?: boolean;
};

const MAX_INPUT_CHARS = 50_000;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find every banned term in `text`, word-bounded and case-insensitive.
 * Returns matches sorted by position so renderers can walk them linearly.
 *
 * Word-bounded matters: without it "treat" fires inside "treatment" and
 * "retreat", and "heal" inside "health" — which would flag most of the
 * brand's own vocabulary.
 */
export function scanBannedTerms(
  input: string,
  opts: ScanOptions = {},
): BannedTermMatch[] {
  if (!input || typeof input !== "string") return [];
  const text = input.length > MAX_INPUT_CHARS ? input.slice(0, MAX_INPUT_CHARS) : input;

  const groups: { category: BannedTermCategory; terms: string[]; enabled: boolean }[] = [
    { category: "drug_claim", terms: DRUG_CLAIMS, enabled: opts.drugClaims !== false },
    { category: "absolute", terms: ABSOLUTES, enabled: opts.absolutes !== false },
    { category: "badge", terms: BANNED_BADGES, enabled: opts.badges !== false },
    { category: "product_mention", terms: PRODUCT_MENTIONS, enabled: opts.productMentions === true },
  ];

  const matches: BannedTermMatch[] = [];

  for (const { category, terms, enabled } of groups) {
    if (!enabled) continue;
    for (const term of terms) {
      // Badges contain spaces/hyphens, so \b at both ends still behaves.
      const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        matches.push({
          category,
          term,
          matched: m[0],
          range: [m.index, m.index + m[0].length],
        });
        if (m.index === re.lastIndex) re.lastIndex += 1;
      }
    }
  }

  matches.sort((a, b) => a.range[0] - b.range[0]);
  return matches;
}

/** Convenience: does this text contain any banned term at all? */
export function hasBannedTerm(input: string, opts?: ScanOptions): boolean {
  return scanBannedTerms(input, opts).length > 0;
}
