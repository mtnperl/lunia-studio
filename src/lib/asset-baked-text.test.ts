import { describe, it, expect } from "vitest";
import { hasBakedText } from "./asset-baked-text";

const genz = (description: string) => ({ assetType: "gen-z" as const, description });

describe("hasBakedText", () => {
  // Real captions from the library, each phrasing the text a different way.
  it.each([
    'Person sleeping face-down under a navy duvet, headline text reads "Sleep score unavailable. Sle',
    'Woman in pajamas taking a mirror selfie, with caption text "Soft launching an earlier bedtime',
    'Woman scrolling her phone, bed overlaid with giant blank social-feed graphics and bold text "Bed is not the next feed',
    "Woman holding the bottle, eyes closed, cream background, contains product packaging and text.",
    "Hand pouring white sheep figurines onto bright yellow background, with tagline text at bottom.",
  ])("flags: %s", (d) => {
    expect(hasBakedText(genz(d))).toBe(true);
  });

  it.each([
    "Woman reading a book in bed at night, warm bedside lamp light, cream bedding, contemplative mood.",
    "Man in grey t-shirt filling glass at kitchen sink under warm overhead light, dark moody interior.",
    "Young man with curly dark hair wrapped in tangled black and white cables, bright turquoise background, direct gaze.",
  ])("passes a plain photo: %s", (d) => {
    expect(hasBakedText(genz(d))).toBe(false);
  });

  it("never flags a product shot, whose label is the product", () => {
    expect(hasBakedText({ assetType: "product-image", description: 'Amber bottle with white label reading "Lunia Life Sleep Supplement"' })).toBe(false);
  });
});
