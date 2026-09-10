import { describe, expect, it } from "vitest";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { parseModelJson } from "./model-json";

function msg(blocks: Array<{ type: string; text?: string; thinking?: string }>, stop_reason: Message["stop_reason"] = "end_turn"): Message {
  return { content: blocks, stop_reason } as unknown as Message;
}

describe("parseModelJson", () => {
  it("parses a clean object", () => {
    expect(parseModelJson(msg([{ type: "text", text: '{"variants":[1]}' }]), "t")).toEqual({ variants: [1] });
  });

  it("skips thinking blocks and strips fences", () => {
    const m = msg([{ type: "thinking", thinking: "..." }, { type: "text", text: '```json\n{"a":1}\n```' }]);
    expect(parseModelJson(m, "t")).toEqual({ a: 1 });
  });

  it("finds the object inside a preface and a trailing note", () => {
    const m = msg([{ type: "text", text: 'Here you go:\n{"a":"has } brace","b":[{"c":2}]}\nLet me know.' }]);
    expect(parseModelJson(m, "t")).toEqual({ a: "has } brace", b: [{ c: 2 }] });
  });

  it("names max_tokens when the reply is thinking only", () => {
    expect(() => parseModelJson(msg([{ type: "thinking", thinking: "..." }], "max_tokens"), "chartbook"))
      .toThrow(/chartbook: model ran out of output room before writing any JSON/);
  });

  it("names max_tokens when the object is cut off", () => {
    expect(() => parseModelJson(msg([{ type: "text", text: '{"variants":[{"topic":"x","cov' }], "max_tokens"), "chartbook"))
      .toThrow(/ran out of output room mid-JSON/);
  });

  it("quotes the start of an unparseable reply", () => {
    expect(() => parseModelJson(msg([{ type: "text", text: "I cannot do that." }]), "t"))
      .toThrow(/no parseable JSON \(stop_reason=end_turn\)\. Response began: I cannot/);
  });
});
