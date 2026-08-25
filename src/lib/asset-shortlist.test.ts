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

// ─── One bulk upload must not own the shortlist ─────────────────────────────
// A real 726-image library whose newest 250 were all product shots shortlisted
// to 250 product shots for a block about cortisol and REM sleep. Every one of
// its 251 lifestyle photographs was cut before the model saw the list, and the
// model answered honestly: "All options are product bottle shots."
describe("shortlistByOverlap — group diversity", () => {
  type A = { kind: string; desc: string };
  const desc = (a: A) => a.desc;
  const kind = (a: A) => a.kind;

  /** Newest-first, exactly as getAssets returns: a fresh bulk upload of one
   *  kind sitting on top of a varied back catalogue. */
  const library: A[] = [
    ...Array.from({ length: 300 }, (_, i) => ({ kind: "product-image", desc: `bottle on ivory ${i}` })),
    ...Array.from({ length: 200 }, (_, i) => ({ kind: "lifestyle", desc: `woman asleep at dawn ${i}` })),
    ...Array.from({ length: 100 }, (_, i) => ({ kind: "gen-z", desc: `phone screen at night ${i}` })),
  ];

  it("used to return one kind only, and no longer does", () => {
    // Copy that matches nothing in any caption — the case that produced the bug.
    const out = shortlistByOverlap(library, desc, "cortisol brain science REM research", 250, kind);
    const kinds = new Set(out.map(kind));
    expect(kinds).toEqual(new Set(["product-image", "lifestyle", "gen-z"]));
    expect(out).toHaveLength(250);
  });

  it("gives each kind a real share, not a token one", () => {
    const out = shortlistByOverlap(library, desc, "nothing matches this at all", 250, kind);
    const counts = out.reduce<Record<string, number>>((acc, a) => {
      acc[a.kind] = (acc[a.kind] ?? 0) + 1;
      return acc;
    }, {});
    // Round-robin across three buckets: roughly even until one runs dry.
    for (const k of ["product-image", "lifestyle", "gen-z"]) {
      expect(counts[k]).toBeGreaterThan(60);
    }
  });

  it("orders WITHIN a group by match, so each group leads with its best", () => {
    const mixed: A[] = [
      { kind: "lifestyle", desc: "a stack of firewood" },
      { kind: "lifestyle", desc: "woman asleep at dawn" },
      ...Array.from({ length: 400 }, (_, i) => ({ kind: "product-image", desc: `bottle ${i}` })),
    ];
    const out = shortlistByOverlap(mixed, desc, "woman asleep at dawn", 250, kind);
    const lifestyle = out.filter((a) => a.kind === "lifestyle");
    // The matching one comes first among its peers, despite being second in
    // the source order.
    expect(lifestyle[0]!.desc).toBe("woman asleep at dawn");
  });

  it("does not let one group take the whole list even when only it matches", () => {
    // The case the second attempt got wrong: when a score clears the limit on
    // its own, ranking by score alone hands everything back to one group. On
    // the real library 312 of 314 "matches" scored 1, on the single word
    // "sleep" — which every caption in a sleep brand's library contains.
    const out = shortlistByOverlap(library, desc, "bottle ivory", 250, kind);
    const kinds = new Set(out.map(kind));
    expect(kinds.size).toBeGreaterThan(1);
    expect(out.filter((a) => a.kind === "lifestyle").length).toBeGreaterThan(30);
  });

  it("without a grouping accessor it behaves as one bucket, still newest-first", () => {
    const out = shortlistByOverlap(library, desc, "no overlap whatsoever", 10);
    expect(out).toHaveLength(10);
    expect(out.every((a) => a.kind === "product-image")).toBe(true);
  });

  it("never returns a duplicate", () => {
    const out = shortlistByOverlap(library, desc, "bottle asleep phone", 250, kind);
    expect(new Set(out).size).toBe(out.length);
  });
});
