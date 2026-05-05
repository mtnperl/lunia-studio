import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming, TextBlock } from "@anthropic-ai/sdk/resources/messages";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Create a Message via the streaming API and return the final assembled Message.
 *
 * The SDK refuses `messages.create()` when it estimates the request may exceed
 * 10 minutes — which our Opus 4.7 + 16K-thinking + 20–24K-max-tokens config
 * routinely trips. Streaming is required, but most callers don't actually want
 * incremental output; they want the same `Message` shape back. This helper
 * does that.
 */
export async function createContentMessage(params: MessageCreateParamsNonStreaming): Promise<Message> {
  return anthropic.messages.stream(params).finalMessage();
}

// Centralized model + thinking config for content-generation routes.
// Bumping the version here flips every route at once.
export const CONTENT_MODEL = "claude-opus-4-7";
export const CONTENT_THINKING_BUDGET = 16_000;
export const CONTENT_THINKING = { type: "enabled" as const, budget_tokens: CONTENT_THINKING_BUDGET };

// max_tokens must exceed the thinking budget. Use these defaults so the
// caller never has to do the math.
export const CONTENT_MAX_TOKENS_SHORT = 20_000;   // tight one-shot output (≤4k visible)
export const CONTENT_MAX_TOKENS_LONG  = 24_000;   // full-carousel / multi-section JSON (≤8k visible)

/**
 * Pull the visible text from a Message. With extended thinking enabled the
 * first content block is a `thinking` block, so callers must not read
 * `message.content[0].text` directly.
 */
export function extractText(message: Message): string {
  const block = message.content.find((b): b is TextBlock => b.type === "text");
  return block ? block.text : "";
}
