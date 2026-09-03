import { getCarousels, getFacts, saveFacts, getSubjects } from "@/lib/kv";
import { factsFromVerification, mergeFacts, normalizeText } from "@/lib/facts";
import type { Fact, SavedCarousel, VerificationRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Build ledger entries from every carousel fact check already on file.
 *  Idempotent: reruns update rather than duplicate. Stale units (edited after
 *  the check) are skipped, so a corrected slide never re-seeds its old claim. */
export async function POST(): Promise<Response> {
  try {
    const [carousels, subjects, existing] = await Promise.all([getCarousels(), getSubjects(), getFacts()]);
    const subjectByText = new Map(subjects.map((s) => [normalizeText(s.text), s.id]));
    const incoming: Fact[] = [];
    let scanned = 0;
    for (const c of carousels as (SavedCarousel & { verification?: VerificationRecord })[]) {
      if (!c.verification) continue;
      scanned++;
      const facts = await factsFromVerification(c, c.verification, subjectByText.get(normalizeText(c.topic)));
      incoming.push(...facts);
    }
    const { facts, added, updated } = mergeFacts(existing, incoming);
    await saveFacts(facts);
    return Response.json({ ok: true, scanned, added, updated, total: facts.length });
  } catch (err) {
    console.error("[api/facts/seed] POST", err);
    return Response.json({ error: "Seeding failed" }, { status: 500 });
  }
}
