import { getFacts, getSubjects } from "./kv";
import { matchFacts, factsPromptBlock, normalizeText } from "./facts";
import { researchSubject, getResearchAttempts } from "./facts-research";

/**
 * The gate every generation passes through. Nothing on file for the subject
 * means research runs first, so figures arrive with sources instead of from
 * memory. Only subjects in the library are researched here; a free-typed
 * topic is not, because it is not a subject yet.
 */
export async function ledgerBlockFor(topic: string, subjectId?: string): Promise<string> {
  try {
    let ledger = await getFacts();
    let matched = matchFacts(ledger, topic, subjectId);
    if (matched.length === 0) {
      const subjects = await getSubjects().catch(() => []);
      const subject = subjects.find((s) => s.id === subjectId) ?? subjects.find((s) => normalizeText(s.text) === normalizeText(topic));
      if (subject) {
        const attempts = await getResearchAttempts();
        const last = attempts[subject.id];
        const recently = last && Date.now() - new Date(last).getTime() < 7 * 86_400_000;
        if (!recently) {
          console.log(`[facts] nothing on file for "${subject.text.slice(0, 50)}", researching before writing`);
          await researchSubject(subject).catch((err) => console.warn("[facts] research before writing failed:", err));
          ledger = await getFacts();
          matched = matchFacts(ledger, topic, subject.id);
        }
      }
    }
    const block = factsPromptBlock(matched);
    if (block) console.log(`[facts] ${matched.filter((f) => f.status === "verified").length} verified, ${matched.filter((f) => f.status === "pending").length} pending facts attached`);
    return block;
  } catch (err) {
    console.warn("[facts] ledger unavailable, writing without it:", err);
    return "";
  }
}
