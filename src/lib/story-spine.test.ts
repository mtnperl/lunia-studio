import { describe, it, expect } from "vitest";
import { storyCheck, handoffCarries, contentWords } from "./story-spine";

const spine = { moment: "You wake at 3:11", villain: "Trying harder", turn: "Effort wakes you", payoff: "Get up" };

describe("story spine", () => {
  it("passes an ordered deck whose handoffs carry", () => {
    const r = storyCheck({ spine, slides: [
      { beat: "moment", headline: "You start calculating", body: "The clock says 3:11.\nYour brain does math.\nIt is not the reason you were told." },
      { beat: "villain", headline: "The reason you were told", body: "You blame stress.\nStress is not what wakes you at 3:11." },
      { beat: "turn", headline: "Stress is the wrong lever", body: "Trying harder is effort.\nEffort wakes the body." },
      { beat: "payoff", headline: "Stop the effort", body: "If awake a while, get up.\nSit somewhere dim." },
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
    expect(r.issues.map((i) => i.kind)).toEqual(["no-spine", "no-beat"]);
  });

  it("matches on stemmed content words only", () => {
    expect(contentWords("Most people fix the wrong half.")).toEqual(new Set(["fix"]));
    expect(handoffCarries("Most people fix the wrong half.", "Fixing the other half", "")).toBe(true);
    expect(handoffCarries("The real lever is upstream.", "Cool the room", "Sleep starts when you cool.")).toBe(false);
  });
});
