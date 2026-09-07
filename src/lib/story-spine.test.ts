import { describe, it, expect } from "vitest";
import { storyCheck, handoffCarries, contentWords, hasConcreteDetail, standsAlone, hookNamesAudience } from "./story-spine";

const spine = { moment: "You wake at 3:11", villain: "Trying harder", turn: "Effort wakes you", payoff: "Get up", image: "the clock at 3:11", who: "people who wake at 3am" };

describe("story spine", () => {
  it("passes an ordered deck whose handoffs carry", () => {
    const r = storyCheck({ spine, slides: [
      { beat: "moment", headline: "You start calculating", body: "The clock says 3:11.\nYour brain does math.\nIt is not the reason you were told." },
      { beat: "villain", headline: "The reason you were told", body: "You blame stress.\nStress is not what wakes you at 3:11." },
      { beat: "turn", headline: "Stress is the wrong lever", body: "Trying harder for an hour is effort.\nEffort wakes the body." },
      { beat: "payoff", headline: "Stop the effort", body: "If awake twenty minutes, get up.\nSit somewhere dim." },
    ] });
    expect(r.issues).toEqual([]);
    expect(r.carried).toBe(3);
  });

  it("flags a dropped handoff, a missing beat and a bad order", () => {
    const r = storyCheck({ spine, slides: [
      { beat: "turn", headline: "A", body: "Nothing shared here at all." },
      { beat: "moment", headline: "B", body: "Completely different words follow." },
    ] });
    const kinds = r.issues.map((i) => i.kind);
    expect(kinds).toContain("out-of-order");
    expect(kinds).toContain("dropped-handoff");
    expect(kinds).toContain("missing-beat");
  });

  it("reports a missing spine and missing beats", () => {
    const r = storyCheck({ slides: [{ headline: "A", body: "B." }] });
    expect(r.issues.map((i) => i.kind)).toEqual(["no-spine", "no-detail", "no-beat"]);
  });

  it("matches on stemmed content words only", () => {
    expect(contentWords("Most people fix the wrong half.")).toEqual(new Set(["fix"]));
    expect(handoffCarries("Most people fix the wrong half.", "Fixing the other half", "")).toBe(true);
    expect(handoffCarries("The real lever is upstream.", "Cool the room", "Sleep starts when you cool.")).toBe(false);
  });

  it("wants a concrete detail on every slide", () => {
    expect(hasConcreteDetail("You wake at 3:11 and start doing math.")).toBe(true);
    expect(hasConcreteDetail("Six weeks of prep, then three sales.")).toBe(true);
    expect(hasConcreteDetail("The second coffee goes cold.", { ...spine, image: "the cold coffee" })).toBe(true);
    expect(hasConcreteDetail("Your sleep is not what it could be.")).toBe(false);
    const r = storyCheck({ spine, slides: [{ beat: "moment", headline: "Stress is not the reason", body: "Most people blame the wrong thing." }] });
    expect(r.issues.map((i) => i.kind)).toContain("no-detail");
  });

  it("wants slide 2 to stand alone as a second hook", () => {
    expect(standsAlone("You wake at 3:11 and start doing math")).toBe(true);
    expect(standsAlone("And that is why it fails")).toBe(false);
    expect(standsAlone("This is the part nobody tells you about at night")).toBe(false);
    const r = storyCheck({ spine, slides: [{ beat: "moment", headline: "But it gets worse at 3:11", body: "The clock says 3:11." }] });
    expect(r.issues.map((i) => i.kind)).toContain("weak-second-hook");
  });

  it("wants the hook to name who the deck is for", () => {
    expect(hookNamesAudience(spine, { headline: "YOU WAKE AT 3AM AND START DOING MATH", subline: "" })).toBe(true);
    expect(hookNamesAudience(spine, { headline: "SLEEP BETTER TONIGHT", subline: "one small change" })).toBe(false);
    const slides = [{ beat: "moment" as const, headline: "The clock says 3:11", body: "Your brain does math at 3:11." }];
    expect(storyCheck({ spine, slides }, undefined, { headline: "SLEEP BETTER TONIGHT" }).issues.map((i) => i.kind)).toContain("no-audience");
    expect(storyCheck({ spine, slides }, undefined, { headline: "YOU WAKE AT 3AM" }).issues.map((i) => i.kind)).not.toContain("no-audience");
    expect(storyCheck({ spine, slides }).issues.map((i) => i.kind)).not.toContain("no-audience");
  });
});
