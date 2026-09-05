import { describe, expect, it } from "vitest";
import { viralChecklist } from "./viral-qc";
import type { CarouselContent } from "./types";

const content = {
  hooks: [{ headline: "Five hours of sleep cut testosterone 15 percent", subline: "", sourceNote: "" }],
  slides: [
    { headline: "YOUR TRAINING DID NOT CHANGE", body: "Strength stalls and drive drops, and the gym takes the blame. It is not the reason you were told.", citation: "" },
    { headline: "THE DROP COMPOUNDS", body: "Sleep loss lifts evening cortisol, which makes the next night shallower again. Most people fix the wrong half.", citation: "" },
    { headline: "PROTECT THE FIRST BLOCK", body: "Cool, dark, no late alcohol. One more thing decides whether it holds.", citation: "" },
  ],
  cta: { headline: "READ THE LABEL, THEN DECIDE", followLine: "Follow @lunia_life for science-based sleep strategies." },
  caption: "One week of five hour nights.\n\nFollow @lunia_life for science-based sleep strategies.",
} as unknown as CarouselContent;

describe("viralChecklist", () => {
  it("passes a well-formed 5-slide carousel on every rule code can judge", () => {
    const rows = viralChecklist(content, 0, null);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.state]));
    expect(byId.hook).toBe("pass");
    expect(byId.loops).toBe("pass");
    expect(byId.compliance).toBe("pass");
    expect(byId.cta).toBe("pass");
    expect(byId.caption).toBe("pass");
    expect(byId.facts).toBe("manual");
    expect(byId.tension).toBe("manual");
    expect(byId.plain).toBeDefined();
  });
  it("fails a nine-word hook, a banned phrase and a stray CTA", () => {
    const bad = { ...content, hooks: [{ headline: "Three signs your low drive is sleep, not stress", subline: "", sourceNote: "" }], slides: [{ ...content.slides[0], body: "This clinically dosed stack fixes your sleep. Visit lunialife.com now. Loop." }] } as CarouselContent;
    const byId = Object.fromEntries(viralChecklist(bad, 0, null).map((r) => [r.id, r]));
    expect(byId.hook.state).toBe("fail");
    expect(byId.compliance.state).toBe("fail");
    expect(byId.compliance.detail).toContain("clinically dosed");
    expect(byId.cta.state).toBe("fail");
  });
});
