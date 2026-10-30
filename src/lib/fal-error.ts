// fal's client throws an ApiError whose `message` is only the HTTP status text
// ("Forbidden", "Unprocessable Entity"). The reason sits in `body.detail`: for a
// locked account it reads "User is locked. Reason: Exhausted balance. Top up
// your balance at fal.ai/dashboard/billing." Routes that return `err.message`
// show the person just "Forbidden" and hide the one sentence that says what to
// do. Not server-only on purpose, so it can be unit tested.

type FalLike = { status?: number; body?: { detail?: unknown } };

/** The most useful sentence fal gave us, falling back to the error's own message. */
export function falErrorMessage(err: unknown): string {
  const detail = (err as FalLike | null)?.body?.detail;
  if (typeof detail === "string" && detail.trim()) return detail.trim();
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((d) => (typeof d === "string" ? d : (d as { msg?: unknown } | null)?.msg))
      .filter((m): m is string => typeof m === "string" && m.trim().length > 0);
    if (msgs.length > 0) return msgs.join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

/** 401, 402 and 403 from fal are about the key or the balance, not the request.
 *  Retrying on another model cannot help, so callers should not. */
export function isFalAccountError(err: unknown): boolean {
  const status = (err as FalLike | null)?.status;
  return status === 401 || status === 402 || status === 403;
}
