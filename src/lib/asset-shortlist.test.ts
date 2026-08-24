import { describe, it, expect } from "vitest";
import { shortlistByOverlap } from "./asset-shortlist";

type Asset = { id: number; description: string };
const describe_ = (a: Asset) => a.description;

function library(n: number, description: string): Asset[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, description }));
}

describe("shortlistByOverlap", () => {
  it("returns a small library untouched, in the original order", () => {
    const items = library(10, "a bedroom at night");
    expect(shortlistByOverlap(items, describe_, "anything", 250)).toBe(items);
  });

  it("keeps the descriptions that share words with the copy", () => {
    const items: Asset[] = [
      ...library(5, "empty bedroom with folded linen"),
      { id: 100, description: "Woman filling a glass of water at a kitchen sink at night" },
      ...library(5, "empty bedroom with folded linen"),
    ];
    const out = shortlistByOverlap(items, describe_, "a glass of water before bed", 3);
    expect(out).toHaveLength(3);
    expect(out[0]!.id).toBe(100);
  });

  it("matches across plurals", () => {
    const items: Asset[] = [
      ...library(4, "empty hallway"),
      { id: 7, description: "Raw botanicals and dried herbs laid on a linen cloth" },
    ];
    const out = shortlistByOverlap(items, describe_, "the botanical in every capsule", 1);
    expect(out[0]!.id).toBe(7);
  });

  it("falls back to the newest when nothing matches", () => {
    const items = library(6, "empty hallway").map((a, i) => ({ ...a, id: i }));
    const out = shortlistByOverlap(items, describe_, "rail freight to Rotterdam", 2);
    expect(out.map((a) => a.id)).toEqual([0, 1]);
  });
});
