import { PRODUCT } from "./lunia-brand-guidelines";
import { describe, it, expect } from "vitest";
import { BLOCK_SAMPLES, sampleBlock, emptyBlock } from "./campaign-block-samples";
import { hasForbiddenDash } from "./strip-dashes";
import { scanBannedTerms } from "./banned-terms";
import { renderCampaignEmail } from "./campaign-email-html";
import { CAMPAIGN_BLOCK_KINDS } from "./types";
import type { CampaignContent } from "./types";

/** Every string a block carries, flattened. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("BLOCK_SAMPLES", () => {
  it("covers every kind", () => {
    for (const kind of CAMPAIGN_BLOCK_KINDS) {
      expect(BLOCK_SAMPLES[kind], `no sample for "${kind}"`).toBeDefined();
    }
  });

  it("contains no em or en dashes", () => {
    // PRODUCT.dose ships an en dash, so this is a live guard, not a formality.
    for (const kind of CAMPAIGN_BLOCK_KINDS) {
      for (const s of strings(sampleBlock(kind, "id"))) {
        expect(hasForbiddenDash(s), `"${s}" in ${kind} sample`).toBe(false);
      }
    }
  });

  it("uses no banned marketing words", () => {
    for (const kind of CAMPAIGN_BLOCK_KINDS) {
      const text = strings(sampleBlock(kind, "id")).join(" ");
      const hits = scanBannedTerms(text).map((m) => m.term);
      expect(hits, `banned term in ${kind} sample`).toEqual([]);
    }
  });

  it("does not fabricate a customer review", () => {
    // Every other sample is a true statement about the product, so shipping
    // one un-edited is merely generic. A plausible fake review is a different
    // category of wrong, and samples sit one un-edited click from a real send.
    const t = sampleBlock("testimonial", "id");
    expect(t.testimonialQuote?.toLowerCase()).toContain("replace this");
    expect(t.testimonialAuthor?.toLowerCase()).toContain("not a real customer");
  });

  it("draws prices and counts from PRODUCT rather than hardcoding them", () => {
    expect(sampleBlock("comparison", "id").comparisonRightPrice).toBe("$29.20");
    expect(sampleBlock("stat", "id").statValue).toBe(`${PRODUCT.reviewCount} reviews`);
    expect(sampleBlock("ingredients", "id").ingredientItems?.map((i) => i.name)).toEqual([
      "Magnesium Bisglycinate", "L-Theanine", "Apigenin",
    ]);
  });
});

describe("sampleBlock", () => {
  it("marks the block as sample", () => {
    expect(sampleBlock("stat", "id").isSample).toBe(true);
  });
  it("keeps the id and kind it was given", () => {
    const b = sampleBlock("grid", "abc");
    expect(b.id).toBe("abc");
    expect(b.kind).toBe("grid");
  });
  it("produces a block that actually renders", () => {
    // A sample that renders to nothing would be worse than an empty block.
    for (const kind of CAMPAIGN_BLOCK_KINDS) {
      if (kind === "image") continue; // needs a slot the user picks
      const content: CampaignContent = {
        subjectLines: ["s", "", ""], selectedSubject: 0, previewText: "",
        blocks: [sampleBlock(kind, "b1")],
        cta: { label: "Go", url: "https://www.lunialife.com" }, images: [],
      };
      const withBlock = renderCampaignEmail(content);
      const without = renderCampaignEmail({ ...content, blocks: [] });
      expect(withBlock.length, `${kind} sample renders nothing`).toBeGreaterThan(without.length);
    }
  });
});

describe("isSample never reaches the email", () => {
  it("does not appear in rendered HTML", () => {
    const content: CampaignContent = {
      subjectLines: ["s", "", ""], selectedSubject: 0, previewText: "",
      blocks: CAMPAIGN_BLOCK_KINDS.map((k, i) => sampleBlock(k, `b${i}`)),
      cta: { label: "Go", url: "https://www.lunialife.com" }, images: [],
    };
    expect(renderCampaignEmail(content)).not.toContain("isSample");
  });
});

describe("emptyBlock", () => {
  it("is not marked as sample", () => {
    expect(emptyBlock("stat", "id").isSample).toBeUndefined();
  });
  it("carries no sample copy", () => {
    expect(emptyBlock("stat", "id").statValue).toBeUndefined();
    expect(emptyBlock("table", "id").tableRows).toBeUndefined();
  });
  it("preserves the seeded defaults a fresh block needs", () => {
    expect(emptyBlock("testimonial", "id").testimonialStars).toBe(5);
    expect(emptyBlock("checklist", "id").items).toEqual([]);
    expect(emptyBlock("image", "id").imageLayout).toBe("column");
  });
});

describe("sample images", () => {
  const URL = "https://blob.example/bottle.png";

  it("fills the image-bearing kinds when the library has one", () => {
    expect(sampleBlock("imagetext", "id", URL).imageUrl).toBe(URL);
    expect(sampleBlock("imagebullets", "id", URL).imageUrl).toBe(URL);
    expect(sampleBlock("headerimage", "id", URL).imageUrl).toBe(URL);
    expect(sampleBlock("grid", "id", URL).gridCells?.every((c) => c.imageUrl === URL)).toBe(true);
    expect(sampleBlock("trustgrid", "id", URL).trustItems?.every((t) => t.imageUrl === URL)).toBe(true);
  });

  it("leaves the image empty when the library has none", () => {
    // The renderer draws its own placeholder, which beats a broken image.
    expect(sampleBlock("imagetext", "id").imageUrl).toBeUndefined();
    expect(sampleBlock("grid", "id").gridCells?.every((c) => c.imageUrl === undefined)).toBe(true);
  });

  it("does not put an image on kinds that have no place for one", () => {
    expect(sampleBlock("stat", "id", URL).imageUrl).toBeUndefined();
    expect(sampleBlock("table", "id", URL).imageUrl).toBeUndefined();
    // kind "image" points at a slot the editor creates, not at its own URL.
    expect(sampleBlock("image", "id", URL).imageUrl).toBeUndefined();
  });
});
