/**
 * Claims ledger: sourced facts keyed by subject.
 *
 * Every number the studio publishes should come from here, or end up here.
 * Three flows write to it: the fact check (a claim that passed with a source
 * and is not stale), on-demand research for a subject, and manual edits. One
 * flow reads it: generation, which quotes ledger facts instead of recalling
 * numbers. Corrections carry a history so the old value can be hunted down
 * across saved documents (see `findCarriers`).
 *
 * Pure functions only; storage lives in kv.ts and the routes.
 */
import type { Fact, SavedCarousel, SavedCampaign, VerificationRecord } from "./types";
import { effectiveVerdict } from "./types";
import { extractCarouselUnits, hashUnitText } from "./verification-status";

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "how", "why", "what", "when", "into", "than", "then", "does", "can", "not", "its", "of", "in", "on", "to", "a", "an", "is", "it", "as", "by", "or", "at", "be", "we", "our", "most", "more", "less", "about", "after", "before", "study", "research", "sleep"]);

export function normalizeText(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9%. ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function tokens(s: string): string[] {
  return normalizeText(s).split(" ").filter((t) => t.length >= 4 && !STOP.has(t));
}

/** Facts relevant to a topic: same subject id, same subject text, or enough
 *  shared significant words. Verified first, then pending; retracted never. */
export function matchFacts(facts: Fact[], topic: string, subjectId?: string): Fact[] {
  const nt = normalizeText(topic);
  const tt = new Set(tokens(topic));
  const scored = facts
    .filter((f) => f.status !== "retracted")
    .map((f) => {
      let score = 0;
      if (subjectId && f.subjectId === subjectId) score = 100;
      else if (normalizeText(f.subjectText) === nt) score = 90;
      else {
        const shared = tokens(f.subjectText + " " + f.statement).filter((t) => tt.has(t));
        const distinct = new Set(shared).size;
        if (distinct >= 3 || (distinct >= 2 && tt.size <= 4)) score = 10 + distinct;
      }
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.f.status === "verified" ? -1 : 1));
  return scored.map((x) => x.f).slice(0, 12);
}

/** The block appended to a generation prompt. Empty string when nothing matches. */
export function factsPromptBlock(facts: Fact[]): string {
  const verified = facts.filter((f) => f.status === "verified");
  if (verified.length === 0) return "";
  const lines = verified.map((f) => {
    const src = f.source.citation || f.source.title || f.source.url || "source on file";
    return `- ${f.statement}${f.value ? ` (${f.value})` : ""} [Source: ${src}]`;
  });
  return `\n\nVERIFIED FACTS FOR THIS TOPIC. These figures and attributions were checked against their sources. Use them exactly as written where they apply, and cite the source given. Do not substitute a number from memory for one listed here. If you need a figure that is not listed, say so in the citation rather than inventing one.\n${lines.join("\n")}\n`;
}

/** Numbers and units inside a statement, for hunting an old value in other
 *  documents: "5 to 25 mg" -> ["5 to 25 mg", "25 mg", "25mg"]. */
export function numericSignatures(statement: string): string[] {
  const out = new Set<string>();
  const s = statement ?? "";
  const re = /(\d+(?:[.,]\d+)?)(?:\s*(?:to|–|-|and)\s*(\d+(?:[.,]\d+)?))?\s*(mg|g|ml|%|percent|minutes?|hours?|mins?|hrs?|x|times|years?|days?|weeks?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const [whole, a, b, unit] = m;
    if (!unit && !b) continue; // a bare number is too common to hunt
    out.add(whole.trim());
    if (unit) { out.add(`${b ?? a} ${unit}`.trim()); out.add(`${b ?? a}${unit}`.trim()); }
  }
  return [...out].filter((x) => x.length >= 3);
}

export type Carrier = { kind: "carousel" | "email"; id: string; title: string; snippets: string[] };

/** Saved documents that still carry any of the given signatures. */
export function findCarriers(signatures: string[], carousels: SavedCarousel[], emails: SavedCampaign[]): Carrier[] {
  if (signatures.length === 0) return [];
  const needles = signatures.map((s) => s.toLowerCase());
  const hunt = (kind: Carrier["kind"], id: string, title: string, obj: unknown): Carrier | null => {
    const json = JSON.stringify(obj).toLowerCase();
    const snippets: string[] = [];
    for (const n of needles) {
      let idx = json.indexOf(n);
      while (idx >= 0 && snippets.length < 4) {
        snippets.push(json.slice(Math.max(0, idx - 70), idx + n.length + 70).replace(/\\n|\\"/g, " "));
        idx = json.indexOf(n, idx + n.length);
      }
    }
    return snippets.length ? { kind, id, title, snippets } : null;
  };
  const out: Carrier[] = [];
  for (const c of carousels) { const { verification: _v, ...rest } = c as SavedCarousel & { verification?: unknown }; void _v; const h = hunt("carousel", c.id, c.topic, rest); if (h) out.push(h); }
  for (const e of emails) { const h = hunt("email", e.id, e.content?.subjectLines?.[e.content.selectedSubject] ?? e.topic, e.content); if (h) out.push(h); }
  return out;
}

/** Facts a carousel's verification record vouches for: passed, sourced,
 *  checkable, and not stale against the carousel's current text. */
export async function factsFromVerification(carousel: SavedCarousel, record: VerificationRecord, subjectId?: string): Promise<Fact[]> {
  const live = extractCarouselUnits(carousel.content);
  const liveById = new Map(live.map((u) => [u.id, u]));
  const now = new Date().toISOString();
  const out: Fact[] = [];
  for (const unit of record.units) {
    const cur = liveById.get(unit.id);
    if (!cur) continue;
    if ((await hashUnitText(cur.text)) !== unit.contentHash) continue; // edited since: do not trust
    for (const claim of unit.claims) {
      if (effectiveVerdict(claim) !== "pass") continue;
      if (claim.category !== "checkable_factual") continue;
      if ((claim.risk ?? "high") !== "high") continue;
      if (!claim.sourceUrl || !claim.supportingQuote) continue;
      out.push({
        id: `fact-${carousel.id.slice(0, 8)}-${unit.id}-${claim.id}`,
        subjectId,
        subjectText: carousel.topic,
        statement: claim.text,
        source: { url: claim.sourceUrl, title: claim.sourceTitle, quote: claim.supportingQuote },
        status: "verified",
        origin: "verification",
        contentId: carousel.id,
        createdAt: now,
        updatedAt: now,
        verifiedAt: record.verifiedAt,
      });
    }
  }
  return out;
}

/** Upsert by id, or by normalized statement when the id is new. */
export function mergeFacts(existing: Fact[], incoming: Fact[]): { facts: Fact[]; added: number; updated: number } {
  const byId = new Map(existing.map((f) => [f.id, f]));
  const byStatement = new Map(existing.map((f) => [normalizeText(f.statement), f]));
  let added = 0, updated = 0;
  for (const f of incoming) {
    const hit = byId.get(f.id) ?? byStatement.get(normalizeText(f.statement));
    if (hit) { byId.set(hit.id, { ...hit, ...f, id: hit.id, createdAt: hit.createdAt, previous: hit.previous }); updated++; }
    else { byId.set(f.id, f); added++; }
  }
  return { facts: [...byId.values()], added, updated };
}
