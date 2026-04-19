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

const RED_PATTERNS: { rule: string; pattern: RegExp }[] = [
  { rule: "drug claim: cure", pattern: /\bcures?\b/i },
  { rule: "drug claim: cured", pattern: /\bcured\b/i },
  { rule: "drug claim: treat", pattern: /\btreats?\b/i },
  { rule: "drug claim: treated", pattern: /\btreated\b/i },
  { rule: "drug claim: prevent", pattern: /\bprevents?\b/i },
  { rule: "drug claim: prevented", pattern: /\bprevented\b/i },
  { rule: "drug claim: diagnose", pattern: /\bdiagnoses?\b/i },
  { rule: "drug claim: diagnosed", pattern: /\bdiagnosed\b/i },
];

const AMBER_PATTERNS: { rule: string; pattern: RegExp }[] = [
  { rule: "em dash", pattern: /—/ },
];

export function scanCompliance(text: string): ComplianceResult {
  const violations: ComplianceViolation[] = [];

  for (const { rule, pattern } of RED_PATTERNS) {
    const m = text.match(pattern);
    if (m) violations.push({ severity: "red", rule, match: m[0] });
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
