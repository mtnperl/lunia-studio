import { getFacts } from "./kv";
import { matchFacts, factsPromptBlock } from "./facts";

/**
 * The gate every generation passes through: the facts already on file for
 * this subject, quoted with their sources.
 *
 * It used to research a subject with nothing on file before writing, and a
 * nightly job worked through the rest of the library. Both are gone. The
 * ledger holds thousands of facts with real citations, and a write is not
 * the moment to spend a minute and a web search filling a gap: it made a
 * generation unpredictably slow and unpredictably expensive, and the cost
 * arrived without anyone choosing it.
 *
 * Nothing here reaches the network. A subject with nothing on file is
 * written from what the writer knows, and the brief's material gate is what
 * decides whether that is good enough to publish. Filling a gap is a
 * deliberate act now: Research a subject, on the Facts screen.
 */
export async function ledgerBlockFor(topic: string, subjectId?: string): Promise<string> {
  try {
    const ledger = await getFacts();
    const matched = matchFacts(ledger, topic, subjectId);
    const block = factsPromptBlock(matched);
    if (block) {
      console.log(`[facts] ${matched.filter((f) => f.status === "verified").length} verified, ${matched.filter((f) => f.status === "pending").length} pending facts attached`);
    } else {
      console.log(`[facts] nothing on file for "${topic.slice(0, 60)}"; writing without a ledger`);
    }
    return block;
  } catch (err) {
    console.warn("[facts] ledger unavailable, writing without it:", err);
    return "";
  }
}
