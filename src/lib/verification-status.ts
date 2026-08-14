// Pure, dependency-free half of content verification.
//
// Split out from verification.ts for one hard reason: verification.ts imports
// the Anthropic SDK to run grounded checks, and the verification UI is a client
// component. Importing the server module from the browser would ship the whole
// SDK in the client bundle.
//
// Everything here is synchronous logic or Web Crypto — safe on both sides.
// Nothing here makes a network call.

import { scanBannedTerms } from "./banned-terms";
import type {
  CarouselContent,
  ClaimVerdict,
  Script,
  VerificationRecord,
  VerificationStatus,
  VerifiedClaim,
  VerifiedUnit,
  VerifiedUnitKind,
} from "./types";
import { effectiveVerdict } from "./types";

export type { ClaimVerdict };

// ─── Hashing ──────────────────────────────────────────────────────────────────

/**
 * SHA-256 of a unit's text, used to detect edits after verification.
 *
 * Web Crypto rather than node:crypto, matching the house pattern in auth.ts, so
 * the same function works server-side and in the browser without a polyfill.
 *
 * Text is normalized first: whitespace collapsed and trimmed. A trailing space
 * or a re-wrapped line is not a content change and must not invalidate a verdict.
 */
export async function hashUnitText(text: string): Promise<string> {
  const normalized = (text ?? "").replace(/\s+/g, " ").trim();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Unit extraction (pure) ───────────────────────────────────────────────────

export type ExtractedUnit = {
  id: string;
  label: string;
  kind: VerifiedUnitKind;
  text: string;
};

/**
 * Flatten a carousel into verifiable units.
 *
 * Only the SELECTED hook is extracted, not all three. Verification runs after
 * the user picks a variant, so checking hooks they discarded is pure waste.
 * Pass `allHooks` to override (the library re-verify path has no selection
 * context and checks whatever is stored).
 */
export function extractCarouselUnits(
  content: CarouselContent | undefined | null,
  selectedHook = 0,
  allHooks = false,
): ExtractedUnit[] {
  if (!content || typeof content !== "object") return [];
  const units: ExtractedUnit[] = [];

  const hooks = Array.isArray(content.hooks) ? content.hooks : [];
  const hookIndices = allHooks
    ? hooks.map((_, i) => i)
    : hooks[selectedHook]
      ? [selectedHook]
      : hooks.length > 0
        ? [0]
        : [];

  for (const i of hookIndices) {
    const h = hooks[i];
    if (!h) continue;
    // sourceNote is joined in deliberately: an unsourced hook should surface as
    // unverifiable, and a hook citing a journal makes that citation checkable.
    const text = [h.headline, h.subline, h.sourceNote].filter(Boolean).join(". ").trim();
    if (text) units.push({ id: `hook-${i}`, label: `Hook ${i + 1}`, kind: "hook", text });
  }

  const slides = Array.isArray(content.slides) ? content.slides : [];
  slides.forEach((s, i) => {
    const text = [s?.headline, s?.body, s?.citation].filter(Boolean).join(". ").trim();
    if (text) units.push({ id: `slide-${i}`, label: `Slide ${i + 1}`, kind: "slide", text });
  });

  const tk = content.takeaway;
  if (tk?.headline || (Array.isArray(tk?.points) && tk.points.length > 0)) {
    const text = [tk?.headline, ...(tk?.points ?? [])].filter(Boolean).join(". ").trim();
    if (text) units.push({ id: "takeaway", label: "Takeaway", kind: "takeaway", text });
  }

  if (content.caption && content.caption.trim()) {
    units.push({ id: "caption", label: "Caption", kind: "caption", text: content.caption.trim() });
  }

  return units;
}

/** Flatten an email flow's generated sections. */
export function extractEmailUnits(email: {
  subjectLines?: string[];
  preheader?: string;
  sections?: { id: string; heading?: string; body: string }[];
  ps?: string;
} | undefined | null): ExtractedUnit[] {
  if (!email || typeof email !== "object") return [];
  const units: ExtractedUnit[] = [];

  (email.sections ?? []).forEach((s, i) => {
    const text = [s?.heading, s?.body].filter(Boolean).join(". ").trim();
    if (text) {
      units.push({
        id: `section-${s?.id ?? i}`,
        label: s?.heading?.trim() || `Section ${i + 1}`,
        kind: "section",
        text,
      });
    }
  });

  if (email.ps && email.ps.trim()) {
    units.push({ id: "ps", label: "PS line", kind: "section", text: email.ps.trim() });
  }

  return units;
}

/**
 * Flatten a script into units.
 *
 * Lines are grouped into blocks of 4 rather than checked individually: a single
 * spoken line is usually a sentence fragment with no standalone claim, and
 * one model call per line would be both slower and worse at judging context.
 */
export function extractScriptUnits(script: Pick<Script, "hook" | "lines"> | undefined | null): ExtractedUnit[] {
  if (!script || typeof script !== "object") return [];
  const units: ExtractedUnit[] = [];

  if (script.hook && script.hook.trim()) {
    units.push({ id: "hook", label: "Hook", kind: "hook", text: script.hook.trim() });
  }

  const lines = (Array.isArray(script.lines) ? script.lines : []).filter(
    (l) => typeof l === "string" && l.trim().length > 0,
  );
  const BLOCK = 4;
  for (let i = 0; i < lines.length; i += BLOCK) {
    const chunk = lines.slice(i, i + BLOCK);
    const first = i + 1;
    const last = Math.min(i + BLOCK, lines.length);
    units.push({
      id: `lines-${first}-${last}`,
      label: first === last ? `Line ${first}` : `Lines ${first}-${last}`,
      kind: "line",
      text: chunk.join(" ").trim(),
    });
  }

  return units;
}

// ─── Unit ↔ content field mapping (pure) ──────────────────────────────────────
//
// A unit id is a flattened view of the carousel; applying a fix means writing
// back into the real fields it came from. Both directions live here so the
// suggest route and the apply button cannot drift out of sync.

/** The editable fields behind a unit. Arrays are used for takeaway points. */
export type UnitFields = Record<string, string | string[]>;

export function getUnitFields(
  content: CarouselContent | undefined | null,
  unitId: string,
): UnitFields | null {
  if (!content) return null;

  const hookMatch = /^hook-(\d+)$/.exec(unitId);
  if (hookMatch) {
    const h = content.hooks?.[Number(hookMatch[1])];
    if (!h) return null;
    return { headline: h.headline ?? "", subline: h.subline ?? "", sourceNote: h.sourceNote ?? "" };
  }

  const slideMatch = /^slide-(\d+)$/.exec(unitId);
  if (slideMatch) {
    const s = content.slides?.[Number(slideMatch[1])];
    if (!s) return null;
    return { headline: s.headline ?? "", body: s.body ?? "", citation: s.citation ?? "" };
  }

  if (unitId === "takeaway" && content.takeaway) {
    return { headline: content.takeaway.headline ?? "", points: content.takeaway.points ?? [] };
  }

  if (unitId === "caption") return { caption: content.caption ?? "" };

  return null;
}

/**
 * Return a new CarouselContent with `fields` written into `unitId`.
 *
 * Never mutates the input: the editor holds the previous content for undo, and
 * mutating in place would corrupt that history. Unknown keys are ignored so a
 * model returning an extra field cannot inject anything into the content.
 */
export function applyUnitFields(
  content: CarouselContent,
  unitId: string,
  fields: UnitFields,
): CarouselContent {
  const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

  const hookMatch = /^hook-(\d+)$/.exec(unitId);
  if (hookMatch) {
    const i = Number(hookMatch[1]);
    const hooks = [...(content.hooks ?? [])];
    if (!hooks[i]) return content;
    hooks[i] = {
      ...hooks[i],
      headline: str(fields.headline) ?? hooks[i].headline,
      subline: str(fields.subline) ?? hooks[i].subline,
      // An empty sourceNote is a legitimate value, so only `undefined` means
      // "leave it alone". Never re-fabricate a source here.
      sourceNote: str(fields.sourceNote) ?? hooks[i].sourceNote,
    };
    return { ...content, hooks };
  }

  const slideMatch = /^slide-(\d+)$/.exec(unitId);
  if (slideMatch) {
    const i = Number(slideMatch[1]);
    const slides = [...(content.slides ?? [])];
    if (!slides[i]) return content;
    slides[i] = {
      ...slides[i],
      headline: str(fields.headline) ?? slides[i].headline,
      body: str(fields.body) ?? slides[i].body,
      citation: str(fields.citation) ?? slides[i].citation,
    };
    return { ...content, slides };
  }

  if (unitId === "takeaway" && content.takeaway) {
    const points = Array.isArray(fields.points)
      ? fields.points.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : content.takeaway.points;
    return {
      ...content,
      takeaway: {
        ...content.takeaway,
        headline: str(fields.headline) ?? content.takeaway.headline,
        points,
      },
    };
  }

  if (unitId === "caption") {
    return { ...content, caption: str(fields.caption) ?? content.caption };
  }

  return content;
}

// ─── Compliance pre-pass (pure) ───────────────────────────────────────────────

/**
 * Banned-term violations are decided locally, never by the model. They are
 * deterministic, they cost nothing, and routing them through a web search would
 * be both slower and less reliable than a word-boundary match.
 */
export function complianceClaims(unit: ExtractedUnit): VerifiedClaim[] {
  const productMentions = false; // only did-you-know forbids naming the product
  const hits = scanBannedTerms(unit.text, { productMentions });
  const seen = new Set<string>();
  const claims: VerifiedClaim[] = [];
  for (const hit of hits) {
    if (seen.has(hit.term)) continue;
    seen.add(hit.term);
    claims.push({
      id: `${unit.id}-compliance-${hit.term.replace(/\s+/g, "-").toLowerCase()}`,
      text: `Uses banned term "${hit.matched}"`,
      category: "product_compliance",
      verdict: "fail",
      reasoning:
        hit.category === "drug_claim"
          ? "Drug claims turn a supplement into an unapproved medicine."
          : hit.category === "absolute"
            ? "Absolute certainty language is not permissible for a supplement."
            : "Banned trust badge. Use \"FDA Registered Facility\" or remove.",
    });
  }
  return claims;
}

// ─── Status derivation (pure) ─────────────────────────────────────────────────

/**
 * A unit's status from its claims.
 *
 *   red    any effective verdict is "fail"
 *   amber  any "unverifiable", or the unit errored
 *   green  everything checkable passed
 *
 * A unit with no claims at all is green: there was nothing to check. The UI
 * must label that case explicitly rather than showing a bare tick, or green
 * silently comes to mean two different things.
 */
export function deriveUnitStatus(unit: VerifiedUnit): VerificationStatus {
  const verdicts = unit.claims.map(effectiveVerdict);
  if (verdicts.includes("fail")) return "red";
  if (unit.error) return "amber";
  if (verdicts.includes("unverifiable")) return "amber";
  return "green";
}

/** True when the unit passed only because it had nothing checkable in it. */
export function isVacuouslyGreen(unit: VerifiedUnit): boolean {
  return (
    !unit.error &&
    unit.claims.every((c) => c.category === "subjective_framing") &&
    deriveUnitStatus(unit) !== "red"
  );
}

/** Overall status is the worst unit, with conflicts forcing at least amber. */
export function deriveRecordStatus(record: VerificationRecord): VerificationStatus {
  const statuses = record.units.map(deriveUnitStatus);
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber") || record.conflicts.length > 0 || record.partial) return "amber";
  return statuses.length === 0 ? "amber" : "green";
}

/** Counts for the summary line. */
export function summarize(record: VerificationRecord): {
  green: number;
  amber: number;
  red: number;
  total: number;
  overridden: number;
} {
  let green = 0;
  let amber = 0;
  let red = 0;
  let overridden = 0;
  for (const u of record.units) {
    const s = deriveUnitStatus(u);
    if (s === "green") green += 1;
    else if (s === "amber") amber += 1;
    else red += 1;
    overridden += u.claims.filter((c) => c.overriddenTo).length;
  }
  return { green, amber, red, total: record.units.length, overridden };
}

// ─── Staleness ────────────────────────────────────────────────────────────────

/**
 * Which units have been edited since they were verified.
 *
 * Per-unit rather than whole-content: editing slide 3 must not throw away the
 * verdicts on slides 1, 2, 4 and 5 and make you pay to check them again.
 */
export async function findStaleUnits(
  record: VerificationRecord,
  current: ExtractedUnit[],
): Promise<string[]> {
  const byId = new Map(current.map((u) => [u.id, u]));
  const stale: string[] = [];
  for (const verified of record.units) {
    const live = byId.get(verified.id);
    if (!live) {
      stale.push(verified.id); // unit was deleted or renumbered
      continue;
    }
    const hash = await hashUnitText(live.text);
    if (hash !== verified.contentHash) stale.push(verified.id);
  }
  // A unit that exists now but wasn't in the record has never been checked.
  for (const live of current) {
    if (!record.units.some((v) => v.id === live.id)) stale.push(live.id);
  }
  return stale;
}

