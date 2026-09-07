import { describe, it, expect } from "vitest";
import { plainLanguageCheck, findTerms, isGlossed } from "./plain-language";

describe("plain language gate", () => {
  it("passes copy with no technical terms", () => {
    const r = plainLanguageCheck("You wake at 3am and start doing math", [
      { label: "Slide 2", text: "Your body thinks the night is over.\nIt is not." },
    ]);
    expect(r.ok).toBe(true);
  });

  it("flags a term in the hook", () => {
    const r = plainLanguageCheck("Cortisol climbs through the second half of sleep", []);
    expect(r.issues).toEqual([{ kind: "term-in-hook", term: "cortisol" }]);
  });

  it("accepts one glossed term and rejects an unglossed one", () => {
    const ok = plainLanguageCheck("You wake at 3am", [
      { label: "Slide 4", text: "Cortisol, the hormone that wakes you, starts climbing at 3am." },
    ]);
    expect(ok.ok).toBe(true);
    const bad = plainLanguageCheck("You wake at 3am", [
      { label: "Slide 4", text: "Cortisol starts climbing at 3am." },
    ]);
    expect(bad.issues.map((i) => i.kind)).toEqual(["unglossed"]);
  });

  it("allows up to three glossed terms and rejects a fourth", () => {
    const three = plainLanguageCheck("You wake at 3am", [
      { label: "Slide 4", text: "Cortisol, the hormone that wakes you, climbs." },
      { label: "Slide 6", text: "REM, the stage where most dreaming happens, is where mood resets." },
      { label: "Slide 7", text: "Melatonin, the hormone of darkness, opens the door to it." },
    ]);
    expect(three.issues.some((i) => i.kind === "too-many-terms")).toBe(false);
    const four = plainLanguageCheck("You wake at 3am", [
      { label: "Slide 4", text: "Cortisol, the hormone that wakes you, climbs. Adenosine, the pressure to sleep, falls." },
      { label: "Slide 6", text: "REM, the stage where most dreaming happens, is where mood resets." },
      { label: "Slide 7", text: "Melatonin, the hormone of darkness, opens the door to it." },
    ]);
    expect(four.issues.some((i) => i.kind === "too-many-terms")).toBe(true);
  });

  it("flags a long sentence", () => {
    const r = plainLanguageCheck("Short", [
      { label: "Slide 3", text: "This sentence keeps going and going and going and going and going and going without ever quite getting to the point it wanted to make, which is a shame." },
    ]);
    expect(r.issues.some((i) => i.kind === "long-sentence")).toBe(true);
  });

  it("matches whole words only", () => {
    expect(findTerms("The remedy is simple")).toEqual([]);
    expect(findTerms("REM sleep")).toEqual(["rem"]);
    expect(isGlossed("melatonin (the darkness signal) rises", "melatonin")).toBe(true);
  });
});
