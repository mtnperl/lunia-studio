import { describe, it, expect } from "vitest";
import {
  scanBannedTerms,
  hasBannedTerm,
  DRUG_CLAIMS,
  ABSOLUTES,
  BANNED_BADGES,
} from "./banned-terms";
import { scanCompliance } from "./compliance";
import { lintLuniaCopy } from "./lunia-linter";
import { lintDidYouKnowContent } from "./did-you-know-lint";

describe("scanBannedTerms", () => {
  it("returns nothing for clean copy", () => {
    expect(scanBannedTerms("May support calm, restful sleep.")).toHaveLength(0);
  });

  it("is case-insensitive but preserves the author's casing in `matched`", () => {
    const [hit] = scanBannedTerms("This CURES insomnia.");
    // `term` is the canonical list entry that matched — the -s inflection here,
    // not the stem. `matched` keeps what the author actually wrote.
    expect(hit.term).toBe("cures");
    expect(hit.matched).toBe("CURES");
  });

  it("reports an accurate range", () => {
    const text = "It treats insomnia.";
    const [hit] = scanBannedTerms(text);
    expect(text.slice(hit.range[0], hit.range[1])).toBe("treats");
  });

  it("sorts matches by position", () => {
    const hits = scanBannedTerms("Guaranteed to cure and treat everything.");
    const starts = hits.map((h) => h.range[0]);
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("categorises each kind of term", () => {
    expect(scanBannedTerms("cures")[0].category).toBe("drug_claim");
    expect(scanBannedTerms("guaranteed")[0].category).toBe("absolute");
    expect(scanBannedTerms("FDA Approved")[0].category).toBe("badge");
  });

  // Word boundaries are what keep the brand's own vocabulary usable.
  it.each([
    ["untreated", "treat"],
    ["treatment", "treat"],
    ["retreat", "treat"],
    ["health", "heal"],
    ["healthy", "heal"],
    ["healthcare", "heal"],
    ["preventative", "prevent"],
    ["curious", "cure"],
    ["accurate", "cure"],
  ])("does not flag %s as the %s claim", (word) => {
    expect(scanBannedTerms(`Our ${word} approach to sleep.`)).toHaveLength(0);
  });

  it("finds every occurrence, not just the first", () => {
    const hits = scanBannedTerms("It cures. It cures again.");
    expect(hits).toHaveLength(2);
  });

  it("respects opt-in product mentions", () => {
    expect(scanBannedTerms("Lunia helps you sleep.")).toHaveLength(0);
    const optedIn = scanBannedTerms("Lunia helps you sleep.", { productMentions: true });
    expect(optedIn).toHaveLength(1);
    expect(optedIn[0].category).toBe("product_mention");
  });

  it("respects category opt-outs", () => {
    expect(scanBannedTerms("cures", { drugClaims: false })).toHaveLength(0);
    expect(scanBannedTerms("guaranteed", { absolutes: false })).toHaveLength(0);
    expect(scanBannedTerms("FDA Approved", { badges: false })).toHaveLength(0);
  });

  it("handles empty and non-string input without throwing", () => {
    expect(scanBannedTerms("")).toEqual([]);
    // @ts-expect-error deliberately passing the wrong type
    expect(scanBannedTerms(null)).toEqual([]);
    // @ts-expect-error deliberately passing the wrong type
    expect(scanBannedTerms(undefined)).toEqual([]);
  });

  it("hasBannedTerm mirrors scanBannedTerms", () => {
    expect(hasBannedTerm("cures insomnia")).toBe(true);
    expect(hasBannedTerm("supports sleep")).toBe(false);
  });
});

describe("inflection coverage", () => {
  // The regularization rule: base / -s / -ed for all five stems. Locked down so
  // a future edit can't silently drop the -ed forms and reintroduce the drift.
  it.each([
    "cure", "cures", "cured",
    "treat", "treats", "treated",
    "prevent", "prevents", "prevented",
    "diagnose", "diagnoses", "diagnosed",
    "heal", "heals", "healed",
  ])("includes %s", (form) => {
    expect(DRUG_CLAIMS).toContain(form);
  });

  it("produces silent-e forms correctly, not doubled vowels", () => {
    expect(DRUG_CLAIMS).not.toContain("cureed");
    expect(DRUG_CLAIMS).not.toContain("diagnoseed");
  });

  it("carries both absolutes and all six badges", () => {
    expect(ABSOLUTES).toEqual(expect.arrayContaining(["guaranteed", "miracle"]));
    expect(BANNED_BADGES).toHaveLength(6);
  });
});

// ─── REGRESSION: the merge changed behaviour in both directions ───────────────
// These assert the widening is intentional. If someone narrows the shared list
// later, these fail loudly rather than silently restoring the old drift.

describe("REGRESSION: compliance.ts widened by the merge", () => {
  it("still flags the drug claims it always flagged", () => {
    expect(scanCompliance("This product cures insomnia.").level).toBe("red");
    expect(scanCompliance("It treats sleep issues.").level).toBe("red");
    expect(scanCompliance("Prevents waking at 3am.").level).toBe("red");
    expect(scanCompliance("Diagnoses your sleep problem.").level).toBe("red");
  });

  it("still flags the -ed forms it always flagged", () => {
    expect(scanCompliance("Insomnia, cured.").level).toBe("red");
    expect(scanCompliance("Patients treated with it.").level).toBe("red");
  });

  it("NOW flags heal, which it previously missed", () => {
    expect(scanCompliance("It heals your sleep debt.").level).toBe("red");
  });

  it("NOW flags absolutes, which it previously missed", () => {
    expect(scanCompliance("Better sleep, guaranteed.").level).toBe("red");
    expect(scanCompliance("A miracle for tired people.").level).toBe("red");
  });

  it("NOW flags trust badges, which it previously missed", () => {
    expect(scanCompliance("FDA Approved formula.").level).toBe("red");
    expect(scanCompliance("Clinically Proven results.").level).toBe("red");
  });

  it("still returns green on clean, compliant copy", () => {
    expect(scanCompliance("May support calm, restful sleep.").level).toBe("green");
    expect(
      scanCompliance("Shown in studies to be associated with deeper rest.").level,
    ).toBe("green");
  });

  it("does not treat the product name as a violation", () => {
    // Only did-you-know forbids naming the product.
    expect(scanCompliance("Lunia supports your wind-down.").level).toBe("green");
  });
});

describe("REGRESSION: did-you-know widened by the merge", () => {
  // Body length is checked separately (280-340 chars), so pad to a valid length
  // and assert only on the banned-phrase violations.
  const pad = (s: string) =>
    s + " ".repeat(0) +
    "Sleep pressure builds across the day and clears overnight, which is why " +
    "the timing of light exposure matters more than most people assume when " +
    "they are trying to shift their schedule earlier by an hour or so.";

  const tok = (text: string) => [{ text, highlight: false }];
  const highlighted = [
    { text: "Sleep ", highlight: false },
    { text: "pressure", highlight: true },
    { text: " and ", highlight: false },
    { text: "cortisol", highlight: true },
    { text: " interact across the night in ways that shift your wake time.", highlight: false },
  ];

  function content(body: string) {
    return {
      topic: "Sleep timing",
      slide1: { header: "Did you know", body1: tok(pad(body)), body2: highlighted },
      slide2: { header: "Here is why", body1: highlighted, body2: tok(pad(body)) },
      caption:
        "A short caption about sleep timing that comfortably clears the eighty " +
        "character minimum imposed by the linter.",
    };
  }

  function bannedPhraseViolations(body: string): string[] {
    return lintDidYouKnowContent(content(body)).violations.filter((v) =>
      v.includes("banned phrase"),
    );
  }

  it("still flags the base forms it always flagged", () => {
    expect(bannedPhraseViolations("This cures insomnia.").length).toBeGreaterThan(0);
    expect(bannedPhraseViolations("It heals your sleep.").length).toBeGreaterThan(0);
  });

  it("NOW flags -ed forms, which it previously let through", () => {
    // This is the exact drift the merge fixed: "cured" and "treated" passed
    // did-you-know while failing compliance.ts.
    expect(bannedPhraseViolations("Insomnia, cured overnight.").length).toBeGreaterThan(0);
    expect(bannedPhraseViolations("Patients treated with it.").length).toBeGreaterThan(0);
    expect(bannedPhraseViolations("Symptoms prevented entirely.").length).toBeGreaterThan(0);
  });

  it("still forbids naming the product here specifically", () => {
    expect(bannedPhraseViolations("Lunia makes this easier.").length).toBeGreaterThan(0);
  });

  it("still passes clean educational copy", () => {
    expect(bannedPhraseViolations("Light exposure may support an earlier rhythm.")).toEqual([]);
  });
});

describe("REGRESSION: lunia-linter badge behaviour is unchanged", () => {
  it("still flags every banned badge", () => {
    for (const badge of BANNED_BADGES) {
      const r = lintLuniaCopy(`Our ${badge} formula.`);
      expect(r.findings.some((f) => f.type === "banned_badge")).toBe(true);
    }
  });

  it("still reports the badge range accurately", () => {
    const text = "Our FDA Approved formula.";
    const r = lintLuniaCopy(text);
    const badge = r.findings.find((f) => f.type === "banned_badge")!;
    expect(text.slice(badge.range[0], badge.range[1])).toBe("FDA Approved");
  });

  it("does NOT flag drug claims — that was never this linter's job", () => {
    const r = lintLuniaCopy("This cures insomnia.");
    expect(r.findings).toHaveLength(0);
  });
});
