import { describe, it, expect } from "vitest";
import { encodeFrame, createFrameDecoder } from "./verification-stream";
import type { VerifiedUnit, VerifyFrame } from "./types";

function unit(id: string, overrides: Partial<VerifiedUnit> = {}): VerifiedUnit {
  return {
    id,
    label: id,
    kind: "slide",
    contentHash: "abc123",
    claims: [],
    ...overrides,
  };
}

const FRAMES: VerifyFrame[] = [
  { t: "start", units: [{ id: "hook-0", label: "Hook 1" }, { id: "slide-0", label: "Slide 1" }] },
  { t: "unit", unit: unit("hook-0") },
  { t: "phase", phase: "conflicts" },
  { t: "error", message: "boom" },
];

describe("verification stream framing", () => {
  it("round-trips every frame type", () => {
    const decoder = createFrameDecoder();
    const wire = FRAMES.map(encodeFrame).join("");
    expect(decoder.push(wire)).toEqual(FRAMES);
  });

  it("recovers when a chunk boundary splits a frame", () => {
    // The failure this guards: a network chunk lands mid-object, JSON.parse
    // throws on the partial line, and the run looks like it died halfway.
    const wire = FRAMES.map(encodeFrame).join("");
    const decoder = createFrameDecoder();
    const seen: VerifyFrame[] = [];
    for (const char of wire) seen.push(...decoder.push(char));
    seen.push(...decoder.flush());
    expect(seen).toEqual(FRAMES);
  });

  it("splits correctly when a frame contains an escaped newline", () => {
    // supportingQuote routinely carries newlines. JSON escapes them, so they
    // must not be mistaken for a frame boundary.
    const frame: VerifyFrame = {
      t: "unit",
      unit: unit("slide-1", {
        claims: [
          {
            id: "c1",
            text: "line one\nline two",
            category: "checkable_factual",
            verdict: "pass",
            supportingQuote: 'a quote with "quotes", an em dash — and a\nnewline',
          },
        ],
      }),
    };
    const decoder = createFrameDecoder();
    expect(decoder.push(encodeFrame(frame))).toEqual([frame]);
  });

  it("holds back a trailing partial line until it completes", () => {
    const decoder = createFrameDecoder();
    const wire = encodeFrame(FRAMES[0]);
    const cut = Math.floor(wire.length / 2);
    expect(decoder.push(wire.slice(0, cut))).toEqual([]);
    expect(decoder.push(wire.slice(cut))).toEqual([FRAMES[0]]);
  });

  it("skips heartbeats and blank lines without disturbing the sequence", () => {
    // The route sends a bare newline every 15s to keep idle proxies from
    // dropping a connection that is waiting on a 90-second grounded call.
    const decoder = createFrameDecoder();
    const wire = `${encodeFrame(FRAMES[0])}\n\n${encodeFrame(FRAMES[1])}\n`;
    expect(decoder.push(wire)).toEqual([FRAMES[0], FRAMES[1]]);
  });

  it("drops one malformed line rather than failing the run", () => {
    const decoder = createFrameDecoder();
    const wire = `${encodeFrame(FRAMES[0])}{not json}\n${encodeFrame(FRAMES[1])}`;
    expect(decoder.push(wire)).toEqual([FRAMES[0], FRAMES[1]]);
  });

  it("yields nothing on flush when the buffer holds only a partial frame", () => {
    const decoder = createFrameDecoder();
    decoder.push('{"t":"start","uni');
    expect(decoder.flush()).toEqual([]);
  });
});
