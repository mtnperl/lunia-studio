import { describe, expect, it } from "vitest";
import { resolveEditorialHookSpec } from "./editorial-hook-spec";

const base = { slideIndex: 0, isEditorial: true, hookHeadline: "Why you wake at 3am", topic: "cortisol and sleep" };

describe("resolveEditorialHookSpec", () => {
  it("keeps a spec the caller sent", () => {
    const spec = { concept: "Cortisol peaks before dawn", overlay: "Sleep science" };
    expect(resolveEditorialHookSpec({ ...base, spec })).toBe(spec);
  });

  it("keeps a legacy spec that only has a subject", () => {
    const spec = { subject: "a quiet bedroom at dawn" };
    expect(resolveEditorialHookSpec({ ...base, spec })).toBe(spec);
  });

  it("builds a spec from the topic when there is a headline but no spec", () => {
    expect(resolveEditorialHookSpec(base)).toEqual({ concept: "cortisol and sleep" });
  });

  it("builds from the topic when the spec is present but empty, keeping its overlay", () => {
    expect(resolveEditorialHookSpec({ ...base, spec: { overlay: "Sleep science" } })).toEqual({
      overlay: "Sleep science",
      concept: "cortisol and sleep",
    });
  });

  it("stays out of the framework with nothing to bake, off the hook, or off the editorial preset", () => {
    expect(resolveEditorialHookSpec({ ...base, hookHeadline: "  " })).toBeUndefined();
    expect(resolveEditorialHookSpec({ ...base, topic: "" })).toBeUndefined();
    expect(resolveEditorialHookSpec({ ...base, slideIndex: 2 })).toBeUndefined();
    expect(resolveEditorialHookSpec({ ...base, isEditorial: false })).toBeUndefined();
  });
});
