// Em/en dashes are a hard brand rule: the Lunia voice never uses them, and
// every LLM in this app reaches for them constantly. This is the one
// implementation.
//
// It lived as TEN divergent private copies before this module existed, and
// they had already drifted: nine collapsed the double space an em-dash
// replacement leaves behind and trimmed the result, while the Klaviyo importer
// did neither, so imported copy kept "word,  word" with a double space. That
// is exactly the failure mode logged as `three-banned-phrase-lists-drift`.
//
// Isomorphic on purpose. Most callers are server routes, but block sample data
// is a client-side constant and has to strip dashes too — PRODUCT.dose ships
// an en dash ("30–60 minutes"), so a single click could otherwise put one into
// an email.

/** Replace em dashes with a comma and en dashes with a hyphen, then tidy the
 *  whitespace those substitutions leave behind. */
export function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ") // em dash → comma + space
    .replace(/\s*–\s*/g, "-") // en dash → hyphen
    .replace(/\s{2,}/g, " ") // collapse the double space that can leave
    .trim();
}

/** True when a string still contains a dash the brand rule forbids. Useful in
 *  tests to assert generated or sample copy is clean. */
export function hasForbiddenDash(s: string): boolean {
  return /[—–]/.test(s);
}
