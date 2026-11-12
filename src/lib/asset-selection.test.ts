import { describe, expect, it } from "vitest";
import type { AssetMetadata } from "./types";
import { assetHasText, emailEligible, findFormatVariant, groupAssetFamilies, rankEmailAssets } from "./asset-selection";

const review: NonNullable<AssetMetadata["textReview"]> = { status: "passed", hasText: false, text: "", issues: [], checkedAt: "2026-11-12T00:00:00Z", visualQuality: "usable", qualityReason: "Natural light" };
function asset(id: string, patch: Partial<AssetMetadata> = {}): AssetMetadata {
  return { id, url: `https://images.example/${id}.jpg`, name: `${id}.jpg`, type: "image/jpeg", assetType: "lifestyle", uploadedAt: "2026-11-12", description: "Woman reading at night", ...patch };
}

describe("email photo priority and safety", () => {
  it("puts checked Gen Z ahead of preferred stock and generated images", () => {
    const stock = asset("stock", { preference: "preferred" });
    const genz = asset("genz", { assetType: "gen-z", textReview: { ...review, visualQuality: "avoid" } });
    const generated = asset("generated", { assetType: "email-generated" });
    expect(rankEmailAssets([stock, generated, genz], "reading").map((a) => a.id)).toEqual(["genz", "stock", "generated"]);
  });
  it("never recommends archived, typo or unreadable images, even Gen Z", () => {
    const bad = [asset("archived", { preference: "archived" }), asset("typo", { assetType: "gen-z", textReview: { ...review, status: "typo", issues: ["sleap → sleep"] } }), asset("unclear", { textReview: { ...review, status: "uncertain" } })];
    expect(rankEmailAssets(bad, "", true)).toEqual([]);
  });
  it("shows unchecked Gen Z for manual inspection but gates automatic picks", () => {
    const genz = asset("genz", { assetType: "gen-z" });
    expect(emailEligible(genz)).toBe(false);
    expect(rankEmailAssets([genz], "", true)).toEqual([genz]);
  });
  it("allows checked captioned Gen Z instead of banning all text", () => {
    const genz = asset("caption", { assetType: "gen-z", description: "Bold text reads sleep better", textReview: { ...review, hasText: true, text: "sleep better" } });
    expect(assetHasText(genz)).toBe(true);
    expect(emailEligible(genz)).toBe(true);
  });
  it("trusts pixel review over an imprecise catalogue caption", () => {
    expect(assetHasText(asset("clean", { description: "Contains text", textReview: review }))).toBe(false);
  });
  it("ranks relevant images within the approved Gen Z tier", () => {
    const room = asset("room", { assetType: "gen-z", description: "Empty bedroom", textReview: review });
    const walk = asset("walk", { assetType: "gen-z", description: "Morning walk outdoors", textReview: review });
    expect(rankEmailAssets([room, walk], "morning walk")[0].id).toBe("walk");
  });
  it("keeps poor generic lifestyle out, while the owner's Gen Z judgement wins", () => {
    expect(emailEligible(asset("slop", { textReview: { ...review, visualQuality: "avoid" } }))).toBe(false);
    expect(emailEligible(asset("good", { assetType: "gen-z", textReview: { ...review, visualQuality: "avoid" } }))).toBe(true);
  });
});

describe("photo families", () => {
  it("groups the real library's headline and 1x1 exports with their master", () => {
    expect(groupAssetFamilies(["01_lab-vial.jpg", "01_lab-vial_headline.jpg", "01_lab-vial_1x1.jpg"].map((name, i) => asset(String(i), { name })))).toHaveLength(1);
  });
  it("collapses descriptive duplicate upload names but preserves camera filenames", () => {
    expect(groupAssetFamilies([asset("a", { name: "03-thoughts-pending.webp" }), asset("b", { name: "03-thoughts-pending.webp" })])).toHaveLength(1);
    expect(groupAssetFamilies([asset("a", { name: "IMG_1234.jpg" }), asset("b", { name: "IMG_1234.jpg" })])).toHaveLength(2);
  });
  it("does not recommend a contact sheet as one photograph", () => {
    expect(emailEligible(asset("sheet", { assetType: "gen-z", name: "00_contact_sheet_headline_versions.jpg", textReview: review }))).toBe(false);
  });
  it("groups a named master, dimension exports and caption exports", () => {
    const images = ["evening-reader.jpg", "evening-reader_1080x1080.jpg", "evening-reader_1080x1350_with-caption.jpg"].map((name, i) => asset(String(i), { name }));
    const families = groupAssetFamilies(images);
    expect(families).toHaveLength(1);
    expect(families[0].assets).toHaveLength(3);
    expect(families[0].inferred).toBe(true);
  });
  it("does not collapse generic camera files or separate shots", () => {
    const names = ["IMG_1234.jpg", "IMG_1235.jpg", "image_1080x1080.jpg", "image_1080x1350.jpg", "reader-01.jpg", "reader-02.jpg"];
    expect(groupAssetFamilies(names.map((name, i) => asset(String(i), { name })))).toHaveLength(6);
  });
  it("allows explicit linking across unrelated names and splitting inferred versions", () => {
    expect(groupAssetFamilies([asset("a", { familyId: "one" }), asset("b", { familyId: "one" })])).toHaveLength(1);
    expect(groupAssetFamilies([asset("a", { name: "evening-reader_square.jpg" }), asset("b", { name: "evening-reader_portrait.jpg", familyId: "b" })])).toHaveLength(2);
  });
  it("does not merge identical names across asset categories", () => {
    expect(groupAssetFamilies([asset("a", { name: "evening-reader_square.jpg" }), asset("b", { name: "evening-reader_portrait.jpg", assetType: "gen-z" })])).toHaveLength(2);
  });
  it("reuses the highest resolution matching export with the same text treatment", () => {
    const images = [
      asset("original", { familyId: "one", width: 1200, height: 1500 }),
      asset("small", { familyId: "one", width: 600, height: 600 }),
      asset("large", { familyId: "one", width: 1200, height: 1200 }),
      asset("caption", { familyId: "one", width: 1600, height: 1600, textReview: { ...review, hasText: true, text: "sleep" } }),
    ];
    expect(findFormatVariant(images, images[0].url, 1)?.id).toBe("large");
  });
  it("never substitutes a different caption or a typo for a format change", () => {
    const images = [
      asset("original", { familyId: "one", width: 1200, height: 1500, textReview: { ...review, hasText: true, text: "sleep well" } }),
      asset("different", { familyId: "one", width: 1200, height: 1200, textReview: { ...review, hasText: true, text: "sale" } }),
      asset("typo", { familyId: "one", width: 1200, height: 1200, textReview: { ...review, hasText: true, text: "sleep well", status: "typo" } }),
    ];
    expect(findFormatVariant(images, images[0].url, 1)).toBeUndefined();
  });
});
