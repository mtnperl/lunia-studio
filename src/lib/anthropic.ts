import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming, TextBlock } from "@anthropic-ai/sdk/resources/messages";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Create a Message via the streaming API and return the final assembled Message.
 * Streaming is required because long Opus generations can exceed the SDK's
 * 10-minute non-streaming estimate.
 */
export async function createContentMessage(params: MessageCreateParamsNonStreaming): Promise<Message> {
  return anthropic.messages.stream(params).finalMessage();
}

// Centralized model + thinking config for content-generation routes.
// Bumping the version here flips every route at once.
export const CONTENT_MODEL = "claude-opus-4-7";
export const CONTENT_THINKING = { type: "adaptive" as const };

// max_tokens must exceed the thinking budget. Use these defaults so the
// caller never has to do the math.
export const CONTENT_MAX_TOKENS_SHORT = 20_000;   // tight one-shot output (≤4k visible)
export const CONTENT_MAX_TOKENS_LONG  = 24_000;   // full-carousel / multi-section JSON (≤8k visible)

// ─── Draft tier (carousel-v2) ─────────────────────────────────────────────
// Haiku 4.5 is ~2× faster and ~5× cheaper than Sonnet 4.6. v2 routes use it
// for hook variants, slide rewrites, and image-prompt drafting. Final-pass
// generation stays on Opus 4.7 with adaptive thinking.
export const DRAFT_MODEL = "claude-haiku-4-5-20251001";
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
