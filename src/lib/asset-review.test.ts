import { describe, expect, it } from "vitest";
import { parseAssetReview } from "./asset-review";

const good = { status: "passed", hasText: true, text: "Sleep better", issues: [], visualQuality: "strong", qualityReason: "Believable skin texture" };
describe("pixel text review validation", () => {
  it("accepts a valid review and records when it was checked", () => {
    const review = parseAssetReview(JSON.stringify(good));
    expect(review?.status).toBe("passed");
    expect(review?.checkedAt).toMatch(/^\d{4}-/);
  });
  it("accepts fenced JSON without accepting arbitrary prose", () => {
    expect(parseAssetReview("```json\n" + JSON.stringify(good) + "\n```")?.text).toBe("Sleep better");
    expect(() => parseAssetReview("Looks fine!")).toThrow();
  });
  it("does not pass an answer that reports issues", () => {
    expect(parseAssetReview(JSON.stringify({ ...good, issues: ["Unclear small print"] }))?.status).toBe("uncertain");
  });
  it("does not pass contradictory text detection", () => {
    expect(parseAssetReview(JSON.stringify({ ...good, hasText: false }))?.status).toBe("uncertain");
  });
  it("rejects missing or malformed fields rather than guessing", () => {
    expect(() => parseAssetReview(JSON.stringify({ status: "passed" }))).toThrow();
    expect(() => parseAssetReview(JSON.stringify({ ...good, issues: [2] }))).toThrow();
  });
  it("does not label an image as a confirmed typo without an explanation", () => {
    expect(parseAssetReview(JSON.stringify({ ...good, status: "typo" }))?.status).toBe("uncertain");
  });
});
