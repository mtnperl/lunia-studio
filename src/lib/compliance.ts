import { scanBannedTerms } from "./banned-terms";

export type ComplianceLevel = "green" | "amber" | "red";

export type ComplianceViolation = {
  severity: "amber" | "red";
  rule: string;
  match: string;
};

export type ComplianceResult = {
  level: ComplianceLevel;
  violations: ComplianceViolation[];
};

// Drug claims and banned badges are RED; they now come from banned-terms.ts
// rather than a local list, so this file can no longer disagree with
// did-you-know-lint.ts about what a drug claim is. Absolutes ("guaranteed",
// "miracle") arrive with them — new here, and intentional.

const AMBER_PATTERNS: { rule: string; pattern: RegExp }[] = [
  { rule: "em dash", pattern: /—/ },
  { rule: "influencer phrase: game changer", pattern: /\bgame[- ]?changer\b/i },
  { rule: "influencer phrase: life changing", pattern: /\blife[- ]?changing\b/i },
  { rule: "influencer phrase: obsessed", pattern: /\bobsessed\b/i },
  { rule: "influencer phrase: holy grail", pattern: /\bholy grail\b/i },
  { rule: "influencer phrase: click the link", pattern: /\bclick the link\b/i },
  { rule: "influencer phrase: use my code", pattern: /\buse my code\b/i },
  // "X is not Y, it is Z" construction — stale influencer framing
  { rule: "influencer framing: 'not X, it's Y'", pattern: /\bis not [^.!?,]+,?\s*(it('| i)?s|but)\s+\w+/i },
];

const RED_RULE_LABEL: Record<string, string> = {
  drug_claim: "drug claim",
  absolute: "absolute claim",
  badge: "banned trust badge",
};

export function scanCompliance(text: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];

  // One violation per distinct term, matching the previous behaviour of
  // reporting each RED_PATTERNS rule at most once regardless of repeats.
  const seenTerms = new Set<string>();
  for (const hit of scanBannedTerms(text)) {
    if (seenTerms.has(hit.term)) continue;
    seenTerms.add(hit.term);
    violations.push({
      severity: "red",
      rule: `${RED_RULE_LABEL[hit.category] ?? hit.category}: ${hit.term}`,
      match: hit.matched,
    });
  }

  for (const { rule, pattern } of AMBER_PATTERNS) {
    const m = text.match(pattern);
    if (m) violations.push({ severity: "amber", rule, match: m[0] });
  }

  const exclamations = (text.match(/!/g) ?? []).length;
  if (exclamations > 1) {
    violations.push({
      severity: "amber",
      rule: `${exclamations} exclamation marks (max 1)`,
      match: "!",
    });
  }

  const level: ComplianceLevel = violations.some((v) => v.severity === "red")
    ? "red"
    : violations.length > 0
      ? "amber"
      : "green";

  return { level, violations };
}

// Strip em dashes by replacing with ", ". Idempotent. Does not rewrite
// forbidden phrases — those are surfaced as flags only so the human can rewrite.
export function stripEmDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",")
    .trim();
}

export type PostProcessResult = {
  cleaned: string;
  result: ComplianceResult;
};

export function postProcess(text: string): PostProcessResult {
  const cleaned = stripEmDashes(text);
  return { cleaned, result: scanCompliance(cleaned) };
}
