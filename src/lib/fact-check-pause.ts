/**
 * Kill switch for the calls that spend Opus and web search on claim checking:
 * the per-slide fact check and its suggest-fix.
 *
 * Paused 2026-09-05. Two carousel sessions took a quarter of the month's API
 * credits, and the fact paths were most of it.
 *
 * What changed on 2026-09-22: the claims ledger this used to feed is gone,
 * along with the subject library. A deck built from a library row carries the
 * sources the sheet reviewed, printed on the slides, so there is less for a
 * check to find. Turning this back on is still one constant.
 */
export const FACT_CHECKS_PAUSED = true;

export const FACT_CHECKS_PAUSED_MESSAGE =
  "Fact checks are paused. A deck built from a library row already carries the sources its sheet row was reviewed against.";

/** The one response every paused route returns. 503 so callers read it as
 *  temporary, not as a bad request on their side. */
export function factChecksPausedResponse(): Response {
  return Response.json({ error: FACT_CHECKS_PAUSED_MESSAGE, paused: true }, { status: 503 });
}
