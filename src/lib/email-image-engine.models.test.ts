// The model registry. Every slug here was verified against a live fal call
// before being listed — the carousel engine ships `fal-ai/flux-2/flex`, which
// 404s, so "a slug exists in a constant" is not evidence of anything.
import { describe, it, expect } from "vitest";
import {
  EMAIL_IMAGE_MODELS,
  DEFAULT_EMAIL_IMAGE_MODEL,
  resolveEmailImageModel,
  targetSize,
} from "@/lib/email-image-engine";
import { EMAIL } from "@/lib/brand-tokens";

describe("email image models", () => {
  it("defaults to gpt-image-2 — the only one that takes reference images", () => {
    expect(DEFAULT_EMAIL_IMAGE_MODEL).toBe("gpt-image-2");
    expect(EMAIL_IMAGE_MODELS).toContain("gpt-image-2");
  });

  it("resolves an unknown or missing model instead of throwing", () => {
    // These values live on a persisted campaign block. A build that renames or
    // drops a model must not make an existing block un-generatable, so this
    // degrades rather than failing.
    for (const bad of [undefined, null, "", "flux-2/flex", "dall-e-3", 42, {}]) {
      expect(resolveEmailImageModel(bad)).toBe(DEFAULT_EMAIL_IMAGE_MODEL);
    }
  });

  it("passes a known model through untouched", () => {
    for (const m of EMAIL_IMAGE_MODELS) {
      expect(resolveEmailImageModel(m)).toBe(m);
    }
  });

  it("targets the exact email layout sizes, whatever the model", () => {
    // Non-GPT models are asked for these directly; gpt-image-2 is asked for a
    // containing native size and cropped down. Either way the layout gets the
    // dimensions it was designed around, which is what stopped the old
    // "ragged email" bug — a new model must not reopen it.
    for (const aspect of ["4:5", "1:1", "16:9"] as const) {
      expect(targetSize(aspect)).toEqual(EMAIL.imageSizes[aspect]);
    }
  });
});
