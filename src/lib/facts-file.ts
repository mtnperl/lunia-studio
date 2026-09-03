import { getCarouselById, getFacts, getSubjects, saveFacts } from "./kv";
import { factsFromVerification, mergeFacts, normalizeText } from "./facts";
import type { VerificationRecord } from "./types";

/** After a fact check, file every passed and sourced claim into the ledger.
 *  Best effort and fire-and-forget: a ledger failure never fails a verify. */
export async function fileVerifiedFacts(carouselId: string, record: VerificationRecord): Promise<void> {
  try {
    const carousel = await getCarouselById(carouselId);
    if (!carousel) return;
    const subjects = await getSubjects().catch(() => []);
    const subjectId = subjects.find((s) => normalizeText(s.text) === normalizeText(carousel.topic))?.id;
    const incoming = await factsFromVerification(carousel, record, subjectId);
    if (incoming.length === 0) return;
    const existing = await getFacts();
    const { facts, added, updated } = mergeFacts(existing, incoming);
    await saveFacts(facts);
    console.log(`[facts] filed from verify ${carouselId.slice(0, 8)}: +${added} ~${updated}`);
  } catch (err) {
    console.warn("[facts] filing skipped:", err);
  }
}
