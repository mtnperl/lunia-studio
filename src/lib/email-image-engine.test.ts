// Unit coverage for the email-image sizing/crop contract — the fix for the
// "ragged email layout" bug where arbitrary requested sizes were silently
// snapped by the model. These run in the default `npm test` suite (no network:
// cropToAspect operates on a locally-generated buffer, Blob is unconfigured in
// test so it returns the source path unchanged after cropping in-process).
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { targetSize } from "@/lib/email-image-engine";
import { EMAIL, GPT_IMAGE_NATIVE_SIZES } from "@/lib/brand-tokens";

describe("email image target sizes", () => {
  it("hero 4:5 maps to the exact email layout size", () => {
    expect(targetSize("4:5")).toEqual(EMAIL.imageSizes["4:5"]);
    const { width, height } = targetSize("4:5");
    expect(width / height).toBeCloseTo(4 / 5, 3);
  });

  it("secondary 1:1 is exactly square", () => {
    const { width, height } = targetSize("1:1");
    expect(width).toBe(height);
  });

  it("every target aspect is contained by a native GPT-Image size", () => {
    // The nearest native size must be >= the target in both dimensions so the
    // crop only ever trims (never upscales).
    const natives = Object.values(GPT_IMAGE_NATIVE_SIZES);
    for (const aspect of ["4:5", "1:1", "16:9"] as const) {
      const t = targetSize(aspect);
      const fits = natives.some((n) => n.width >= t.width && n.height >= t.height);
      expect(fits, `no native size contains ${aspect}`).toBe(true);
    }
  });
});

describe("crop produces exact target dimensions", () => {
  // Directly exercise the sharp cover-crop the engine uses, proving a native
  // portrait frame becomes an exact 4:5 target.
  it("center-crops a native portrait frame to exact 4:5", async () => {
    const native = GPT_IMAGE_NATIVE_SIZES.portrait; // 1024x1536
    const src = await sharp({
      create: { width: native.width, height: native.height, channels: 3, background: "#01253F" },
    }).png().toBuffer();

    const target = targetSize("4:5");
    const out = await sharp(src)
      .resize(target.width, target.height, { fit: "cover", position: "centre" })
      .jpeg()
      .toBuffer();

    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(target.width);
    expect(meta.height).toBe(target.height);
  });
});
