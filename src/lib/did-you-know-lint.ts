import type { DidYouKnowContent, DidYouKnowSlideContent, DidYouKnowToken } from "./types";

const BANNED_PHRASES = [
  "cures", "cure", "treats", "treat", "heals", "heal",
  "prevents", "prevent", "diagnose", "diagnoses",
  "guaranteed", "miracle", "fda-approved",
  "lunia", // no product mentions
];

const NON_HIGHLIGHTABLE = new Set([
  "a","an","the","of","in","on","at","to","for","by","with","and","or","but","as","is","are","was","were","be","been","being","it","its","this","that","these","those","you","your","we","our","i","my",
]);

const MIN_BODY_CHARS = 280;
const MAX_BODY_CHARS = 340;
const MIN_HIGHLIGHTS_PER_PARA = 2;
const MAX_HIGHLIGHTS_PER_PARA = 4;

export type LintResult = { ok: boolean; violations: string[] };

function tokensToString(tokens: DidYouKnowToken[]): string {
  return tokens.map((t) => t.text).join("");
}

function lintSlide(label: string, slide: DidYouKnowSlideContent | undefined | null): string[] {
  const v: string[] = [];
  if (!slide || typeof slide !== "object") {
    v.push(`${label}: missing slide`);
    return v;
  }
  if (!slide.header || slide.header.trim().length === 0) {
    v.push(`${label}: missing header`);
  }
  for (const [name, tokens] of [["body1", slide.body1], ["body2", slide.body2]] as const) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      v.push(`${label}.${name}: empty`);
      continue;
    }
    const text = tokensToString(tokens);
    if (text.includes("—") || text.includes("–")) {
      v.push(`${label}.${name}: contains em/en dash`);
    }
    const lower = text.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      const re = new RegExp(`\\b${phrase}\\b`, "i");
      if (re.test(lower)) v.push(`${label}.${name}: banned phrase "${phrase}"`);
    }
    const highlights = tokens.filter((t) => t.highlight);
    if (highlights.length < MIN_HIGHLIGHTS_PER_PARA) {
      v.push(`${label}.${name}: needs at least ${MIN_HIGHLIGHTS_PER_PARA} highlights (has ${highlights.length})`);
    }
    if (highlights.length > MAX_HIGHLIGHTS_PER_PARA) {
      v.push(`${label}.${name}: too many highlights (${highlights.length}, max ${MAX_HIGHLIGHTS_PER_PARA})`);
    }
    for (const h of highlights) {
      const word = h.text.trim().toLowerCase().replace(/^[("'\[]+|[.,!?;:)"'\]]+$/g, "");
      if (NON_HIGHLIGHTABLE.has(word)) {
        v.push(`${label}.${name}: highlight on filler word "${h.text.trim()}"`);
      }
    }
  }
  const total = tokensToString(slide.body1).length + tokensToString(slide.body2).length;
  if (total < MIN_BODY_CHARS) {
    v.push(`${label}: body too short (${total} chars, min ${MIN_BODY_CHARS})`);
  }
  if (total > MAX_BODY_CHARS) {
    v.push(`${label}: body too long (${total} chars, max ${MAX_BODY_CHARS})`);
  }
  return v;
}

export function lintDidYouKnowContent(content: DidYouKnowContent | null | undefined): LintResult {
  if (!content || typeof content !== "object") {
    return { ok: false, violations: ["content: missing or malformed"] };
  }
  const violations = [
    ...lintSlide("slide1", content.slide1),
    ...lintSlide("slide2", content.slide2),
  ];
  if (!content.caption || content.caption.trim().length < 80) {
    violations.push("caption: too short or missing");
  }
  return { ok: violations.length === 0, violations };
}
