import { describe, expect, it } from "vitest";
import {
  buildAnalyzePhase1Prompt,
  buildAnalyzePrompt,
  buildRegenSuggestionsPrompt,
} from "@/lib/email-review-prompts";

const flow = {
  flowType: "welcome",
  emails: [
    { id: "e1", position: 1, role: "orientation", subject: "A quieter evening", previewText: "What to expect", bodyText: "A short welcome and a simple evening routine." },
    { id: "e2", position: 2, role: "ingredient education", subject: "Why these ingredients", previewText: "How the formula works", bodyText: "A plain-language explanation of the ingredients." },
    { id: "e3", position: 3, role: "social proof", subject: "A routine that sticks", previewText: "A customer's experience", bodyText: "A customer describes building a consistent routine." },
  ],
};

const args = { flowJson: JSON.stringify(flow), linterHint: "No findings.", assetCatalog: [
  { id: "bottle-1", assetType: "product-image", name: "Restore bottle" },
  { id: "linen-1", assetType: "lifestyle", name: "Linen detail" },
  { id: "logo-1", assetType: "logo", name: "Lunia logo" },
] };

describe("email flow image direction prompts", () => {
  it("plans a complete visual sequence and allows only useful image slots", () => {
    const phase1 = buildAnalyzePhase1Prompt(args);
    const legacy = buildAnalyzePrompt(args);
    for (const prompt of [phase1, legacy]) {
      expect(prompt).toContain("flowArtDirection");
      expect(prompt).toContain("zero to\ntwo images per email");
      expect(prompt).toContain("specific message or reading");
      expect(prompt).toMatch(/Default\s+to no text/);
      expect(prompt).toContain("Never attach a logo as an image reference");
      expect(prompt).not.toContain("EXACTLY 2 imagePrompts");
      expect(prompt).not.toContain("Show half of a woman's face");
      expect(prompt).not.toContain("Use relevant minimal line icons");
    }
    expect(phase1).toContain("Lunia logo"); // asset data is supplied, but the rubric forbids selecting logos
  });

  it("gives regeneration the flow direction and sibling concepts", () => {
    const prompt = buildRegenSuggestionsPrompt({
      currentPrompt: "A hand turning down a bedside lamp beside a book.",
      currentEngine: "gpt-image-2",
      emailContext: "Email 2, ingredient education; explains how the formula supports a steady evening routine.",
      flowArtDirection: { throughline: "A routine moving from explanation to confidence", palette: "ivory and navy" },
      siblingImages: [{ emailId: "e1", placement: "hero", imageJob: "Introduce the evening ritual", visualConcept: "A wide bedroom scene with a lamp", prompt: "Wide scene of someone dimming a bedside lamp" }],
    });
    expect(prompt).toContain("complete Lunia Life email flow");
    expect(prompt).toContain("avoid repeating their composition or job");
    expect(prompt).toContain("A routine moving from explanation to confidence");
    expect(prompt).toContain("Introduce the evening ritual");
    expect(prompt).toContain("exactly 3 materially distinct alternatives");
    expect(prompt).not.toContain("ALWAYS include the Lunia Restore bottle");
  });
});
