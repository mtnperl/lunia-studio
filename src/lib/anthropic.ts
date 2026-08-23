import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming, TextBlock } from "@anthropic-ai/sdk/resources/messages";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Create a Message via the streaming API and return the final assembled Message.
 *
 * Streaming is required because long Opus generations can exceed the SDK's
 * 10-minute non-streaming estimate, and it is what makes output above ~32K
 * tokens safe to ask for at all.
 *
 * Applies the default effort centrally. A caller that passes its own
 * `output_config` keeps it untouched, and the draft tier never receives one —
 * Haiku 4.5 rejects `effort`, so injecting it there would turn every cheap
 * route into a 400.
 */
export async function createContentMessage(params: MessageCreateParamsNonStreaming): Promise<Message> {
  const usesDraftTier = params.model === DRAFT_MODEL;
  const withEffort: MessageCreateParamsNonStreaming =
    usesDraftTier || params.output_config
      ? params
      : { ...params, output_config: { effort: EFFORT_STANDARD } };
  return anthropic.messages.stream(withEffort).finalMessage();
}

// ─── Model tiers ──────────────────────────────────────────────────────────
//
// Three tiers, and — unlike the comment that used to sit here — changing a
// value really does change every route. It previously claimed to "flip every
// route at once" while twenty-one routes hardcoded their own string past it:
// eight UGC routes on Opus 4.7, six email routes on Opus 4.6, six video and
// research routes on Sonnet 4.5, one on Sonnet 4.6. A model constant nobody
// is obliged to use is a comment, not a control.
//
// If you add a route, pick a tier. Do not write a model string inline.

/** Quality is the product. Full decks, email bodies, review, verification,
 *  anything where a human reads the output and judges the brand by it. */
export const CONTENT_MODEL = "claude-opus-5";

/** Shaped work that either feeds a much larger spend downstream (image
 *  prompts, where the picture costs more than the prompt that asked for it)
 *  or is long without being subtle (video scripts, research summaries). */
export const CRAFT_MODEL = "claude-sonnet-5";

/** Mechanical. Rewrites with the answer already on screen, picks from a fixed
 *  set, one-line drafts. Fast and cheap, and correct for the job. */
export const DRAFT_MODEL = "claude-haiku-4-5-20251001";

export const CONTENT_THINKING = { type: "adaptive" as const };

// ─── Effort ───────────────────────────────────────────────────────────────
//
// `output_config.effort` controls how much thinking and token spend a request
// is worth. It defaults to "high", so before this existed every call in the
// app ran at the same depth — "suggest four icons" and "write a full carousel"
// cost the same thought. The default below is applied centrally in
// createContentMessage rather than per route, so a new route gets sensible
// spend without remembering to ask for it.
//
// NOT VALID ON THE DRAFT TIER. Haiku 4.5 rejects `effort` outright, which is
// why createContentMessage skips it for that model rather than trusting each
// caller to remember.
//
// The installed SDK (0.80.0) types effort as low | medium | high | max. Newer
// SDKs add "xhigh", which is the recommended setting for the hardest
// generation work on Opus 5 — worth picking up whenever the SDK is upgraded.
export type Effort = "low" | "medium" | "high" | "max";

/** Correctness matters more than cost: fact-checking, anything that ships. */
export const EFFORT_PRECISE: Effort = "max";
/** The default. Real judgement, normal stakes. */
export const EFFORT_STANDARD: Effort = "high";
/** Shaped but not subtle — a rewrite, a summary, a prompt draft. */
export const EFFORT_LIGHT: Effort = "low";

// max_tokens must exceed the thinking budget. Use these defaults so the
// caller never has to do the math.
export const CONTENT_MAX_TOKENS_SHORT = 20_000;   // tight one-shot output
export const CONTENT_MAX_TOKENS_LONG  = 24_000;   // full-carousel / multi-section JSON
// Opus 5 supports up to 128K output tokens when streaming, and every call here
// streams. The previous value carried a comment claiming a hard 32,768 ceiling
// on thinking + visible text that the API would reject above — that is not a
// real limit on this family, and at least one design decision (verification
// running one model call per unit) was made to stay under it. Raised, but
// deliberately not to the ceiling: a route that genuinely needs more should
// say so rather than inherit it.
export const CONTENT_MAX_TOKENS_MAX   = 64_000;

export const DRAFT_MAX_TOKENS_SHORT = 4_000;
export const DRAFT_MAX_TOKENS_MED   = 8_000;

/**
 * Pull the visible text from a Message. With extended thinking enabled the
 * first content block is a `thinking` block, so callers must not read
 * `message.content[0].text` directly.
 */
export function extractText(message: Message): string {
  const block = message.content.find((b): b is TextBlock => b.type === "text");
  return block ? block.text : "";
}
