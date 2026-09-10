import { checkRateLimit } from "@/lib/kv";

/** The carousel rate limit, keyed by caller IP. Returns the 429 to send, or
 *  null when the call may go ahead. */
export async function rateLimitedResponse(req: Request): Promise<Response | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (allowed) return null;
  return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
}

/** Convert any failure (Anthropic SDK error, JSON parse, Zod validation)
 *  into a label that is safe to show. The raw error stays in the server log. */
export function describeGenerateError(err: unknown, context: string): string {
  const status = (err as { status?: number })?.status;
  const message = err instanceof Error ? err.message : String(err);
  if (status === 401 || status === 403) return "Anthropic API key invalid or revoked";
  if (status === 429) return "Anthropic rate limited — wait a moment and try again";
  if (status === 404) return "Anthropic model unavailable — check model access";
  if (status && status >= 500) return `Anthropic service error (${status}) — try again`;
  if (message.startsWith("Invalid response shape")) return `${context}: ${message}`;
  // parseModelJson already prefixes its own context and says which of the
  // three failures it was (no text, cut off, unparseable), so pass it through.
  if (message.includes("ran out of output room") || message.includes("no parseable JSON") || message.includes("returned no text")) return message;
  if (message.includes("JSON")) return `${context}: model returned malformed JSON — try again`;
  return `${context}: ${message.slice(0, 160)}`;
}
