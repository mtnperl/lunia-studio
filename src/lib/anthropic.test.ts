import { describe, expect, it } from "vitest";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";
import {
  DEEPSEEK_FLASH_MODEL,
  DEEPSEEK_PRO_MODEL,
  DEEPSEEK_VISION_MODEL,
  deepseekModelFor,
  shouldUseDeepSeekFallback,
} from "./anthropic";

function request(
  model: string,
  content: MessageCreateParamsNonStreaming["messages"][number]["content"] = "hello",
): MessageCreateParamsNonStreaming {
  return {
    model,
    max_tokens: 100,
    messages: [{ role: "user", content }],
  };
}

describe("DeepSeek fallback routing", () => {
  it("maps Opus work to Pro and Sonnet work to Flash", () => {
    expect(deepseekModelFor(request("claude-opus-5"))).toBe(DEEPSEEK_PRO_MODEL);
    expect(deepseekModelFor(request("claude-sonnet-5"))).toBe(DEEPSEEK_FLASH_MODEL);
  });

  it("always maps image-bearing work to the vision model", () => {
    expect(deepseekModelFor(request("claude-opus-5", [
      { type: "image", source: { type: "url", url: "https://example.com/reference.png" } },
      { type: "text", text: "Describe this image" },
    ]))).toBe(DEEPSEEK_VISION_MODEL);
  });
});

describe("DeepSeek fallback eligibility", () => {
  it.each([402, 408, 429, 500, 529])("falls back for provider status %i", (status) => {
    expect(shouldUseDeepSeekFallback(Object.assign(new Error("provider failure"), { status }))).toBe(true);
  });

  it("recognizes Anthropic's exhausted-credit 400 response", () => {
    expect(shouldUseDeepSeekFallback(
      Object.assign(new Error("Your credit balance is too low to access the Anthropic API"), { status: 400 }),
    )).toBe(true);
  });

  it("falls back for network failures without an HTTP status", () => {
    expect(shouldUseDeepSeekFallback(new TypeError("fetch failed: connection reset"))).toBe(true);
  });

  it("does not retry invalid credentials or malformed requests", () => {
    expect(shouldUseDeepSeekFallback(Object.assign(new Error("invalid x-api-key"), { status: 401 }))).toBe(false);
    expect(shouldUseDeepSeekFallback(Object.assign(new Error("messages is required"), { status: 400 }))).toBe(false);
  });
});
