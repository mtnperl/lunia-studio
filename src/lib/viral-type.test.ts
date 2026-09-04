import { describe, it, expect } from "vitest";
import { viralTypeScale, RANK_STEP } from "./viral-type";

const base = { frameH: 1350, supportLines: ["One short line here.", "And a second one."] };

describe("viralTypeScale", () => {
  it("lets the headline lead when there is no figure", () => {
    const s = viralTypeScale({ ...base, headline: "The bed becomes a trigger" });
    expect(s.figureLeads).toBe(false);
    expect(s.figureSize).toBe(0);
    expect(s.headlineSize / s.lineSize).toBeGreaterThanOrEqual(RANK_STEP);
  });

  it("lets the figure lead and steps the headline down", () => {
    const withFig = viralTypeScale({ ...base, headline: "Twenty six minutes less time awake", figure: "26 min" });
    const without = viralTypeScale({ ...base, headline: "Twenty six minutes less time awake" });
    expect(withFig.figureLeads).toBe(true);
    expect(withFig.headlineSize).toBeLessThan(without.headlineSize);
    expect(withFig.figureSize / withFig.headlineSize).toBeGreaterThanOrEqual(RANK_STEP);
  });

  it("keeps every rank a clear step apart", () => {
    for (const headline of ["Short one", "The bed becomes a trigger", "Then the barrier stops recovering fast"]) {
      for (const figure of [undefined, "30%"]) {
        for (const supportLines of [["a b c"], ["a b c", "d e f"], ["a b c", "d e f", "g h i", "j k l"]]) {
          const s = viralTypeScale({ headline, figure, supportLines, frameH: 1350 });
          const lead = s.figureLeads ? s.figureSize : s.headlineSize;
          expect(lead / s.lineSize).toBeGreaterThanOrEqual(RANK_STEP);
          expect(s.lineSize).toBeGreaterThan(s.loopSize);
          expect(s.loopSize).toBeGreaterThan(s.citationSize);
        }
      }
    }
  });

  it("shrinks a long headline and a crowded body", () => {
    const short = viralTypeScale({ ...base, headline: "Short one" });
    const long = viralTypeScale({ ...base, headline: "Then the barrier stops recovering overnight for days" });
    expect(long.headlineSize).toBeLessThan(short.headlineSize);

    const two = viralTypeScale({ headline: "Short one", supportLines: ["a b c", "d e f"], frameH: 1350 });
    const four = viralTypeScale({ headline: "Short one", supportLines: ["a b c", "d e f", "g h i", "j k l"], frameH: 1350 });
    expect(four.lineSize).toBeLessThan(two.lineSize);
  });

  it("scales down on a shorter export frame", () => {
    const tall = viralTypeScale({ ...base, headline: "Short one" });
    const square = viralTypeScale({ ...base, headline: "Short one", frameH: 1080 });
    expect(square.headlineSize).toBeLessThan(tall.headlineSize);
    expect(square.citationSize).toBeLessThan(tall.citationSize);
  });

  it("honours the editor size sliders", () => {
    const normal = viralTypeScale({ ...base, headline: "Short one" });
    const bigger = viralTypeScale({ ...base, headline: "Short one", headlineScale: 1.2, bodyScale: 1.2 });
    expect(bigger.headlineSize).toBeGreaterThan(normal.headlineSize);
    expect(bigger.lineSize).toBeGreaterThan(normal.lineSize);
  });
});
