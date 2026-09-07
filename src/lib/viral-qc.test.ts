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
  it("judges detail, the second hook and the audience", () => {
    const rows = Object.fromEntries(viralChecklist(content, 0, null).map((r) => [r.id, r]));
    expect(rows.detail.state).toBe("fail");
    expect(rows.detail.detail).toContain("Slide 2");
    expect(rows["second-hook"].state).toBe("pass");
    expect(rows.audience.state).toBe("manual");
    const good = {
      ...content,
      spine: { moment: "Five hour nights", villain: "Training harder", turn: "Sleep sets the hormone", payoff: "Protect the first block", image: "the 5am alarm", who: "men who lift and sleep five hours" },
      slides: [
        { headline: "Five hours is the whole problem", body: "Strength stalls after a week of five hour nights. It is not the gym." },
        { headline: "But it gets worse", body: "The 5am alarm cuts the deep sleep that sets the hormone. Most people fix the gym." },
        { headline: "Protect the first block", body: "Cool, dark, no late alcohol, lights out by eleven. One thing decides whether it holds." },
      ],
      takeaway: { headline: "PROTECT THE FIRST BLOCK", points: ["Five hours cuts the hormone", "The gym was never the problem", "Lights out by eleven tonight"], interaction: { type: "save", label: "Save this for the next 5am alarm" } },
    } as unknown as CarouselContent;
    const g = Object.fromEntries(viralChecklist(good, 0, null).map((r) => [r.id, r]));
    expect(g.detail.state).toBe("pass");
    expect(g.audience.state).toBe("pass");
    expect(g.cta.state).toBe("pass");
    expect(g.cta.detail).toBe("Takeaway closes the deck");
    const second = { ...good, slides: [good.slides[0], { ...good.slides[1] }, good.slides[2]] } as CarouselContent;
    second.slides[0] = { ...second.slides[0], headline: "But it gets worse" };
    expect(Object.fromEntries(viralChecklist(second, 0, null).map((r) => [r.id, r.state]))["second-hook"]).toBe("fail");
  });
});
