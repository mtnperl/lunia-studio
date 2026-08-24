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
  ClaimCategory,
  ClaimRisk,
  ClaimVerdict,
  Script,
  VerificationRecord,
  VerificationStatus,
  VerificationSummary,
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
 * The hook and the caption are deliberately NOT extracted. Both are framing
 * rather than fact — a hook exists to earn the swipe and a caption to earn the
 * comment — so they returned "unverifiable" almost every time and spent a
 * model call to say nothing. The body of the deck is where a wrong number
 * actually reaches the reader, so that is what gets checked.
 */
export function extractCarouselUnits(
  content: CarouselContent | undefined | null,
): ExtractedUnit[] {
  if (!content || typeof content !== "object") return [];
  const units: ExtractedUnit[] = [];

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

// ─── Risk scoring (pure) ──────────────────────────────────────────────────────

/**
 * Code-side backstop on the model's risk score.
 *
 * Same philosophy as the evidence rule in verifyUnit: the prompt is a request,
 * this is a guarantee. A claim carrying a specific figure or a named source is
 * high-risk whatever the model called it, because those are precisely the
 * claims that caused the incident. Mis-scoring in the safe direction (low → high)
 * costs one extra row; mis-scoring the other way hides an invented dosage.
 */
const SPECIFIC_PATTERNS: RegExp[] = [
  /\d/,                                                   // any figure at all
  /\b(?:study|studies|trial|trials|research|journal|meta-analysis|review)\b/i,
  /\b(?:mg|mcg|gram|grams|ml|dose|dosage)\b/i,
  /\b(?:percent|percentage)\b/i,
  /%/,
];

export function scoreClaimRisk(text: string, category: ClaimCategory, modelRisk?: ClaimRisk): ClaimRisk {
  // Compliance findings are never negotiable.
  if (category === "product_compliance") return "high";
  if (SPECIFIC_PATTERNS.some((re) => re.test(text))) return "high";
  return modelRisk ?? "high"; // absent score defaults to high, never to hidden
}

/**
 * Whether a claim should ever appear as a finding.
 *
 * Framing is not a claim. "YOUR 3AM WAKE-UP ISN'T RANDOM" and "follow
 * @lunia_life" cannot be true or false, so reporting them as unverified was
 * noise dressed as diligence. They are still classified (that is how the
 * checker knows to skip them) and still stored, they just never surface.
 */
export function isReportable(claim: VerifiedClaim): boolean {
  return claim.category !== "subjective_framing";
}

/** Reportable claims that are not resolved, split by consequence. */
export function partitionFindings(unit: VerifiedUnit): {
  high: VerifiedClaim[];
  low: VerifiedClaim[];
  resolved: VerifiedClaim[];
  framing: VerifiedClaim[];
} {
  const high: VerifiedClaim[] = [];
  const low: VerifiedClaim[] = [];
  const resolved: VerifiedClaim[] = [];
  const framing: VerifiedClaim[] = [];

  for (const c of unit.claims) {
    if (!isReportable(c)) { framing.push(c); continue; }
    if (effectiveVerdict(c) === "pass") { resolved.push(c); continue; }
    const risk = scoreClaimRisk(c.text, c.category, c.risk);
    (risk === "high" ? high : low).push(c);
  }
  return { high, low, resolved, framing };
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
 * Coerce a model-supplied field value to the shape the content actually holds.
 *
 * `points` is a string[] in the carousel, and applyUnitFields ignores anything
 * else — so a drafter that returned "One. Two. Three" as a single string
 * produced a fix that rendered a diff, accepted the click, and silently changed
 * nothing. That was the "apply does not work" bug on the takeaway unit. Coerce
 * at the boundary, where the current shape is known, rather than loosening
 * applyUnitFields and letting a string reach a field the renderer maps over.
 */
export function coerceToCurrentShape(
  value: string | string[],
  current: string | string[] | undefined,
): string | string[] {
  if (Array.isArray(current) && !Array.isArray(value)) {
    return value
      .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z])/)
      .map((p) => p.replace(/^\s*[-•*\d.)]+\s*/, "").trim())
      .filter((p) => p.length > 0);
  }
  if (!Array.isArray(current) && Array.isArray(value)) return value.join(" ");
  return value;
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
 * Claims the panel RAISES, as opposed to merely records.
 *
 * Only a contradiction qualifies: the sources say something incompatible with
 * what the copy says. That includes banned-term compliance hits, which are
 * decided locally and are always "fail".
 *
 * "No source found" is deliberately NOT a finding. It is the single most common
 * outcome of a real run — most true, uncontroversial sentences have no paper
 * attached to them — and raising it turned the panel into a list of things that
 * were fine. Those claims are still checked, still stored, and still visible
 * behind the quiet fold; they just do not ask anything of the reader.
 */
export function isMajorFinding(claim: VerifiedClaim): boolean {
  return effectiveVerdict(claim) === "fail";
}

/**
 * A unit's status from its claims.
 *
 *   red    the sources contradict something in it
 *   amber  the check did not complete for this unit
 *   green  nothing was contradicted
 *
 * Note what amber is NOT: an unsourced claim. Amber means "we do not know",
 * which is true of an errored unit and untrue of a unit we checked and found
 * nothing against. A unit with no claims at all is green — there was nothing to
 * check. The UI must label that case explicitly rather than showing a bare tick,
 * or green silently comes to mean two different things.
 */
export function deriveUnitStatus(unit: VerifiedUnit): VerificationStatus {
  if (unit.claims.some(isMajorFinding)) return "red";
  if (unit.error) return "amber";
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
export function summarize(record: VerificationRecord): VerificationSummary {
  let green = 0;
  let amber = 0;
  let red = 0;
  let overridden = 0;
  let findings = 0;
  let quiet = 0;
  for (const u of record.units) {
    const s = deriveUnitStatus(u);
    if (s === "green") green += 1;
    else if (s === "amber") amber += 1;
    else red += 1;
    overridden += u.claims.filter((c) => c.overriddenTo).length;

    const p = partitionFindings(u);
    // Findings = contradictions, and only contradictions. Unsourced claims are
    // counted as quiet: recorded and readable, never raised.
    findings += u.claims.filter(isMajorFinding).length;
    quiet += p.high.filter((c) => !isMajorFinding(c)).length + p.low.length;
  }
  return { green, amber, red, total: record.units.length, overridden, findings, quiet };
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


// ─── Triage grouping (pure) ───────────────────────────────────────────────────
//
// The panel used to list units and hide the findings one accordion at a time,
// which put the work you actually have to do behind six clicks. Grouping by
// consequence instead lets the panel open on the contradictions and fold the
// clean units away. Derivation lives here with the rest of the status logic so
// the panel stays a renderer.

export type UnitTriage = "decide" | "look" | "clean";

/**
 * What a unit demands of the reader.
 *   • decide — a claim the sources contradict. Someone has to change it or own it.
 *   • look   — the check did not complete, so this unit is simply unknown.
 *   • clean  — checked, nothing contradicted.
 *
 * A stale unit keeps its verdict's triage: the text moved on, but the last thing
 * we knew about it is still the most useful thing to show.
 */
export function triageUnit(unit: VerifiedUnit): UnitTriage {
  const status = deriveUnitStatus(unit);
  if (status === "red") return "decide";
  return status === "amber" ? "look" : "clean";
}

/** The units of a record bucketed by what they demand, order preserved. */
export function groupUnitsByTriage(record: VerificationRecord): Record<UnitTriage, VerifiedUnit[]> {
  const groups: Record<UnitTriage, VerifiedUnit[]> = { decide: [], look: [], clean: [] };
  for (const unit of record.units) groups[triageUnit(unit)].push(unit);
  return groups;
}

/** Claims the reader must act on. Contradictions only — see isMajorFinding. */
export function actionableClaims(unit: VerifiedUnit): VerifiedClaim[] {
  return unit.claims.filter(isMajorFinding);
}

/** True when the sources actively contradict something in this unit. */
export function hasContradiction(unit: VerifiedUnit): boolean {
  return unit.claims.some(isMajorFinding);
}
