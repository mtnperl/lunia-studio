import { describe, expect, it } from "vitest";
import { ACTIVE_GRAPHIC_TYPES, GRAPHIC_TYPES, isRetiredGraphic } from "@/lib/graphic-types";
import { parseGraphicSpec } from "@/lib/carousel-utils";
import { GENERATE_CAROUSEL_PROMPT, REGENERATE_GRAPHIC_PROMPT } from "@/lib/carousel-prompts";

describe("graphic roster", () => {
  it("keeps retired components out of the active list", () => {
    expect(ACTIVE_GRAPHIC_TYPES.length).toBeLessThan(GRAPHIC_TYPES.length);
    expect(ACTIVE_GRAPHIC_TYPES.every((t) => !t.retired)).toBe(true);
    expect(isRetiredGraphic("conceptFlow")).toBe(true);
    expect(isRetiredGraphic("stat")).toBe(false);
  });

  it("still covers all three tiers after the cut", () => {
    for (const tier of ["A", "B", "C"] as const) {
      expect(
        ACTIVE_GRAPHIC_TYPES.filter((t) => t.tier === tier).length,
        `tier ${tier} has no active component — v2 tier diversity would be unsatisfiable`,
      ).toBeGreaterThan(0);
    }
  });

  it("renders a retired spec as no graphic at all, so the slide zone collapses", () => {
    // Valid shape, retired component — saved carousels must degrade to empty
    // rather than paint the clip-art vocabulary.
    const raw = JSON.stringify({ component: "processFlow", data: { steps: ["A", "B", "C"] } });
    expect(parseGraphicSpec(raw)).toBeNull();
  });

  const PROMPTS: [string, string][] = [
    ["carousel", GENERATE_CAROUSEL_PROMPT("magnesium and deep sleep")],
    ["regenerate-graphic", REGENERATE_GRAPHIC_PROMPT("magnesium", "A headline", "A body line.")],
  ];

  it("never offers a retired component in any generator prompt", () => {
    for (const [name, prompt] of PROMPTS) {
      for (const t of GRAPHIC_TYPES.filter((g) => g.retired)) {
        expect(prompt, `${name} prompt still offers retired component "${t.key}"`)
          .not.toContain(`{"component":"${t.key}"`);
      }
    }
  });

  it("offers every active component in the main carousel prompt", () => {
    const prompt = GENERATE_CAROUSEL_PROMPT("magnesium and deep sleep");
    for (const t of ACTIVE_GRAPHIC_TYPES) {
      expect(prompt, `prompt is missing active component "${t.key}"`)
        .toContain(`{"component":"${t.key}"`);
    }
  });
});
