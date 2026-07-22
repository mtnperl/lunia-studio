/** Deterministic, no-network subject-line quality checks. Runs on every
 *  keystroke client-side, no debounce needed since there's no LLM call. */
export type SubjectLineHint = { id: string; level: "warning" | "info"; text: string };

const SPAM_TRIGGER_WORDS = ["free", "act now", "limited time", "buy now", "click here", "guarantee", "risk free"];

export function getSubjectLineHints(subject: string): SubjectLineHint[] {
  const hints: SubjectLineHint[] = [];
  const trimmed = subject.trim();
  if (!trimmed) return hints;

  if (trimmed.length > 60) {
    hints.push({ id: "length", level: "warning", text: `${trimmed.length} chars, over the ~60 char practical limit` });
  }

  const lower = trimmed.toLowerCase();
  const hitWords = SPAM_TRIGGER_WORDS.filter((w) => lower.includes(w));
  if (hitWords.length > 0) {
    hints.push({ id: "spam-words", level: "warning", text: `Spam-trigger phrase: "${hitWords[0]}"` });
  }

  if (/!{2,}/.test(trimmed)) {
    hints.push({ id: "exclaim", level: "warning", text: "Multiple exclamation marks" });
  }

  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 6) {
    const capsRatio = (letters.replace(/[^A-Z]/g, "").length) / letters.length;
    if (capsRatio > 0.4) {
      hints.push({ id: "caps", level: "warning", text: `${Math.round(capsRatio * 100)}% caps, reads as shouting` });
    }
  }

  return hints;
}
