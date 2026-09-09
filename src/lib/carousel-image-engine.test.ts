import { describe, expect, it } from "vitest";
import {
  chooseImageEngine,
  FAL_ENDPOINTS,
  getGptImageEndpoint,
  isGptImageEngine,
} from "./carousel-image-engine";

describe("carousel image engines", () => {
  it("maps GPT Image 2.5 Sunburst to its fal.ai endpoint", () => {
    expect(FAL_ENDPOINTS["gpt-image-2.5-sunburst"]).toBe("openai/gpt-image-2.5/sunburst/text-to-image");
  });

  it("accepts GPT Image 2.5 Sunburst as an explicit override", () => {
    expect(chooseImageEngine({
      slideIndex: 0,
      imageStyle: "realistic",
      override: "gpt-image-2.5-sunburst",
    })).toBe("gpt-image-2.5-sunburst");
  });

  it("identifies both GPT engines for reference-image routing", () => {
    expect(isGptImageEngine("gpt-image-2")).toBe(true);
    expect(isGptImageEngine("gpt-image-2.5-sunburst")).toBe(true);
    expect(isGptImageEngine("recraft")).toBe(false);
  });

  it("uses Sunburst's dedicated edit endpoint for reference images", () => {
    expect(getGptImageEndpoint("gpt-image-2.5-sunburst", false)).toBe(
      "openai/gpt-image-2.5/sunburst/text-to-image",
    );
    expect(getGptImageEndpoint("gpt-image-2.5-sunburst", true)).toBe(
      "openai/gpt-image-2.5/sunburst/edit",
    );
  });
});
