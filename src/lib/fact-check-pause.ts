/**
 * Kill switch for every call that spends Opus and web search on facts: the
 * per-slide fact check, its suggest-fix, and subject research (on demand, in
 * batch, and the silent run before a generation).
 *
 * Paused 2026-09-05. Two carousel sessions took a quarter of the month's API
 * credits, and the fact paths were most of it. Facts are being uploaded by
 * hand for now; the claims ledger still attaches whatever is on file to every
 * generation, so flipping this back on is the only step to resume.
 */
export const FACT_CHECKS_PAUSED = true;

export const FACT_CHECKS_PAUSED_MESSAGE =
  "Fact checks are paused while facts are uploaded by hand. Uploaded facts still reach every generation through the claims ledger.";

/** The one response every paused route returns. 503 so callers read it as
 *  temporary, not as a bad request on their side. */
export function factChecksPausedResponse(): Response {
  return Response.json({ error: FACT_CHECKS_PAUSED_MESSAGE, paused: true }, { status: 503 });
}
