import { describe, it, expect } from "vitest";
import {
  DECK_MANDATES,
  MANDATE_IDS,
  isDeckMandate,
  getMandate,
  mandateLabel,
  mandateMenuBlock,
  mandateBlock,
  recentMandatesBlock,
} from "./deck-mandates";

describe("the mandate library", () => {
  it("has unique ids and a filled brief for every mandate", () => {
    expect(new Set(MANDATE_IDS).size).toBe(DECK_MANDATES.length);
    for (const m of DECK_MANDATES) {
      expect(m.label.length).toBeGreaterThan(0);
      for (const field of [m.what, m.test, m.failsAs, m.line]) expect(field.length).toBeGreaterThan(10);
    }
  });

  it("never uses an em dash, which the brand voice bans", () => {
    expect(JSON.stringify(DECK_MANDATES)).not.toContain("—");
  });

  it("names a known mandate and stays quiet on anything else", () => {
    expect(isDeckMandate("connection")).toBe(true);
    expect(isDeckMandate("vibes")).toBe(false);
    expect(mandateLabel("correction")).toBe("Correction");
    expect(mandateLabel("vibes")).toBeNull();
    expect(getMandate(undefined)).toBeNull();
  });
});

describe("mandateMenuBlock", () => {
  it("offers every mandate with its own test", () => {
    const menu = mandateMenuBlock();
    for (const m of DECK_MANDATES) {
      expect(menu).toContain(`MANDATE "${m.id}"`);
      expect(menu).toContain(m.test);
    }
  });
});

describe("mandateBlock", () => {
  it("carries the promise and the failure mode to the later stages", () => {
    const block = mandateBlock("connection", "Melatonin is the sleep signal and the insulin brake.");
    expect(block).toContain("Melatonin is the sleep signal");
    expect(block).toContain("This deck has failed if");
  });

  it("stays empty for a deck written before the mandate gate existed", () => {
    expect(mandateBlock(undefined, undefined)).toBe("");
    expect(mandateBlock("connection", "")).toBe("");
    expect(mandateBlock("vibes", "a line")).toBe("");
  });
});

describe("recentMandatesBlock", () => {
  it("says nothing when no recent deck carries a mandate", () => {
    expect(recentMandatesBlock([])).toBe("");
    expect(recentMandatesBlock([undefined, "vibes"])).toBe("");
  });

  it("lists the recent mix and counts a repeat", () => {
    const block = recentMandatesBlock(["finding", "finding", "rule"]);
    expect(block).toContain("Finding x2");
    expect(block).toContain("Rule");
  });

  it("calls out a run of three so the account does not sound like one note", () => {
    const block = recentMandatesBlock(["correction", "correction", "correction", "rule"]);
    expect(block).toContain("The last three were all Correction");
  });

  it("does not call out a run when the last three differ", () => {
    expect(recentMandatesBlock(["correction", "rule", "finding"])).not.toContain("The last three were all");
  });
});
