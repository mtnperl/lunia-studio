// Guards the LOOK half of the campaign image suffix.
//
// There was already a test asserting the offline prompt writer never says
// "photorealistic" (campaign-image-prompt.test.ts). It passed the whole time
// the suffix in this module was appending that exact word to every image
// afterwards — a door guarded with no wall around it. This is the wall.
import { describe, it, expect } from "vitest";
import {
  CAMPAIGN_IMAGE_LOOK,
  CAMPAIGN_IMAGE_CONSTRAINTS,
  CAMPAIGN_IMAGE_SAFETY_SUFFIX,
} from "@/lib/campaign-image";

/** The vocabulary of 3D renders and over-processed stock. Asking for any of
 *  these moves an image model TOWARD the plastic look, not away from it, which
 *  is why they are banned rather than merely discouraged. */
const RENDER_VOCABULARY = [
  "photorealistic", "hyperrealistic", "ultra-realistic", "photoreal",
  "8k", "4k", "hdr", "ultra-detailed", "ultra detailed",
  "highly detailed", "high detail", "sharp focus", "crystal clear",
  "flawless", "pristine", "immaculate", "stunning", "breathtaking",
  "masterpiece", "award-winning", "bokeh", "golden hour",
];

describe("campaign image look", () => {
  for (const word of RENDER_VOCABULARY) {
    it(`never asks for "${word}"`, () => {
      expect(CAMPAIGN_IMAGE_SAFETY_SUFFIX.toLowerCase()).not.toContain(word);
    });
  }

  it("asks for capture, not rendering", () => {
    const look = CAMPAIGN_IMAGE_LOOK.toLowerCase();
    // A real frame is described by how it was taken and by what is wrong with
    // it. Each of these is a distinct lever; losing any one of them is a
    // regression worth failing for.
    expect(look).toContain("lens");        // an actual optic
    expect(look).toContain("grain");       // film, not a clean sensor
    expect(look).toContain("skin texture");// the giveaway on people
    expect(look).toContain("unposed");     // not arranged for the camera
    expect(look).toContain("uneven");      // nobody fixed the light
    expect(look).toContain("no retouching");
  });

  it("keeps the structural constraints, which are not stylistic", () => {
    // These exist because text and packaging render badly at email sizes, and
    // because bottle / logo imagery comes from uploaded assets. They must
    // survive any future rewrite of the look.
    for (const rule of ["no text", "no logos", "no product packaging", "no supplement bottles"]) {
      expect(CAMPAIGN_IMAGE_CONSTRAINTS.toLowerCase()).toContain(rule);
    }
    expect(CAMPAIGN_IMAGE_SAFETY_SUFFIX).toBe(CAMPAIGN_IMAGE_LOOK + CAMPAIGN_IMAGE_CONSTRAINTS);
  });
});
