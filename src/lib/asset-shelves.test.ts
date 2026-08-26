// The shelves are now shared by the Assets manager and the campaign picker.
// They used to live inside AssetsView, which is why the picker showed one flat
// grid of all 726 images and finding a lifestyle photograph meant scrolling
// past 335 bottle shots.
import { describe, it, expect } from "vitest";
import { ASSET_TYPES, ASSET_SECTIONS, UPLOADABLE_TYPES, shelfFor } from "@/lib/asset-shelves";
import type { AssetType } from "@/lib/types";

describe("asset shelves", () => {
  it("puts every AssetType on a named shelf", () => {
    // A type with no shelf would vanish from both surfaces at once.
    const kinds: AssetType[] = [
      "logo", "carousel-style", "product-image", "lifestyle",
      "gen-z", "other", "carousel-generated", "email-generated",
    ];
    for (const k of kinds) {
      expect(shelfFor(k).key).toBe(k);
      expect(shelfFor(k).label).toBeTruthy();
    }
  });

  it("catches an unrecognised type instead of dropping it", () => {
    // An older record, or a category a future build adds. It still has to be
    // reachable — silently hiding an asset the user uploaded is the worst
    // outcome available here.
    expect(shelfFor(undefined).key).toBe("uncategorised");
    expect(shelfFor("something-new" as AssetType).key).toBe("uncategorised");
  });

  it("orders curated shelves ahead of the generated pools", () => {
    // The ones you chose come first; the big auto-registered pools are less
    // interesting to browse.
    const keys = ASSET_SECTIONS.map((s) => s.key);
    const lastUploadable = Math.max(...UPLOADABLE_TYPES.map((t) => keys.indexOf(t.value)));
    const firstGenerated = Math.min(keys.indexOf("email-generated"), keys.indexOf("carousel-generated"));
    expect(lastUploadable).toBeLessThan(firstGenerated);
  });

  it("gives every shelf a label and a colour", () => {
    for (const s of ASSET_SECTIONS) {
      expect(s.label.trim()).toBeTruthy();
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("marks the auto-registered pools as not uploadable", () => {
    const byValue = Object.fromEntries(ASSET_TYPES.map((t) => [t.value, t.uploadable]));
    expect(byValue["email-generated"]).toBe(false);
    expect(byValue["carousel-generated"]).toBe(false);
    expect(byValue["lifestyle"]).toBe(true);
  });

  it("groups a mixed library the way the picker will show it", () => {
    const library = [
      { assetType: "product-image" as AssetType },
      { assetType: "product-image" as AssetType },
      { assetType: "lifestyle" as AssetType },
      { assetType: undefined },
    ];
    const counts = library.reduce<Record<string, number>>((acc, a) => {
      const k = shelfFor(a.assetType).key;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ "product-image": 2, lifestyle: 1, uncategorised: 1 });
  });
});
