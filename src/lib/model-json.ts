import type { Message } from "@anthropic-ai/sdk/resources/messages";

/**
 * Pull one JSON object out of a model reply, tolerantly.
 *
 * `JSON.parse(extractText(msg))` fails three ways that all surfaced to the
 * user as "malformed JSON". The first chartbook run in production hit one of
 * them: "Unexpected end of JSON input", which is not malformed JSON at all.
 * It is either no text (the reply was thinking blocks only, because thinking
 * used the whole max_tokens budget) or text cut off mid-object at the
 * ceiling. Neither is fixed by trying again at the same ceiling, so the error
 * says which it was and names stop_reason.
 *
 * Strategy, in order: join every text block; strip fences; try the whole
 * thing; then scan for balanced top-level {...} candidates (string-aware, so
 * braces inside quoted text do not end an object early) and return the last
 * one that parses. That covers a preface sentence, a trailing note, and a
 * fenced block in the middle of prose.
 */
export function parseModelJson(message: Message, context: string): unknown {
  const joined = (message.content ?? [])
    .filter((b): b is Extract<Message["content"][number], { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const stop = message.stop_reason ?? "unknown";

  if (!joined) {
    throw new Error(
      stop === "max_tokens"
        ? `${context}: model ran out of output room before writing any JSON (stop_reason=max_tokens; thinking used the whole budget)`
        : `${context}: model returned no text (stop_reason=${stop})`,
    );
  }

  const stripped = joined.replace(/```(?:json)?/gi, "").trim();

  try {
    return JSON.parse(stripped);
  } catch {
    /* fall through to scanning */
  }

  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        candidates.push(stripped.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(candidates[i]);
    } catch {
      /* try the next candidate outward */
    }
  }

  if (stop === "max_tokens") {
    throw new Error(`${context}: model ran out of output room mid-JSON (stop_reason=max_tokens; ${stripped.length} chars written)`);
  }
  throw new Error(`${context}: no parseable JSON (stop_reason=${stop}). Response began: ${stripped.slice(0, 120)}`);
}
