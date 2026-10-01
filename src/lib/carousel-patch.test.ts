import { describe, it, expect } from "vitest";
import { applyCarouselPatch } from "./carousel-patch";
import type { SavedCarousel } from "./types";

function deck(over: Partial<SavedCarousel> = {}): SavedCarousel {
  return {
    id: "c1",
    topic: "magnesium",
    hookTone: "educational",
    selectedHook: 0,
    content: {
      hooks: [
        { headline: "Why you wake at 3am", subline: "It is not stress", emphasis: "3am" },
        { headline: "Your sleep debt", subline: "Adds up" },
      ],
      slides: [
        { headline: "Cortisol", body: "Cortisol peaks early.", citation: "Smith 2020" },
        { headline: "Magnesium", body: "Helps you wind down.", citation: "Jones 2019" },
      ],
      cta: { headline: "Sleep better", followLine: "Follow for more" },
      caption: "Caption #sleep",
    },
    hookImageUrl: "https://example.com/hook.png",
    stylePreset: "editorial-scientific",
    hookOverlays: { frame: { enabled: true, color: "#fff", opacity: 1, inset: 4 }, vignette: { enabled: false, intensity: 0 }, colorGrade: { enabled: false, intensity: 0 }, grain: { enabled: false, opacity: 0 } },
    savedAt: "2026-10-01T00:00:00.000Z",
    ...over,
  } as SavedCarousel;
}

describe("applyCarouselPatch", () => {
  it("changes only the named hook fields and leaves everything else alone", () => {
    const before = deck();
    const r = applyCarouselPatch(before, { hooks: [{ index: 0, subline: "It is your cortisol" }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.carousel.content.hooks[0]).toEqual({
      headline: "Why you wake at 3am",
      subline: "It is your cortisol",
      emphasis: "3am",
    });
    expect(r.carousel.content.hooks[1]).toEqual(before.content.hooks[1]);
    expect(r.carousel.hookOverlays).toEqual(before.hookOverlays);
    expect(r.changed).toEqual(["hooks[0].subline"]);
    // The input is never mutated.
    expect(before.content.hooks[0]!.subline).toBe("It is not stress");
  });

  it("flags the hook image as stale when the selected hook text changes", () => {
    const r = applyCarouselPatch(deck(), { hooks: [{ index: 0, headline: "Why you wake at 3am, again" }] });
    expect(r.ok && r.staleImages).toEqual(["hook"]);
    const other = applyCarouselPatch(deck(), { hooks: [{ index: 1, headline: "Debt" }] });
    expect(other.ok && other.staleImages).toEqual([]);
    const caption = applyCarouselPatch(deck(), { caption: "New" });
    expect(caption.ok && caption.staleImages).toEqual([]);
  });

  it("edits slides by position, and adds one at the end", () => {
    const r = applyCarouselPatch(deck(), {
      slides: [
        { index: 1, body: "Helps you unwind." },
        { index: 2, headline: "Routine", body: "Same time nightly." },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.carousel.content.slides[1]!.body).toBe("Helps you unwind.");
    expect(r.carousel.content.slides[2]).toEqual({ headline: "Routine", body: "Same time nightly.", citation: "" });
  });

  it("rejects an out of range index, an unknown field, and a new slide with no body, saving nothing", () => {
    const r = applyCarouselPatch(deck(), {
      slides: [{ index: 9, body: "x" }, { index: 0, bogus: "x" }, { index: 2, headline: "Only a headline" }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.details?.join("\n")).toContain("slides[0].index");
    expect(r.details?.join("\n")).toContain('unknown field "bogus"');
    expect(r.details?.join("\n")).toContain('needs "body"');
  });

  it("strips dashes and warns on banned terms without blocking the save", () => {
    const r = applyCarouselPatch(deck(), {
      slides: [{ index: 0, body: "Sleep — deeper. This is a miracle." }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.carousel.content.slides[0]!.body).toBe("Sleep, deeper. This is a miracle.");
    expect(r.warnings.join("\n")).toContain("miracle");
  });

  it("warns when an emphasis is no longer inside its text", () => {
    const r = applyCarouselPatch(deck(), { hooks: [{ index: 0, headline: "Why you wake at night" }] });
    expect(r.ok && r.warnings.join("\n")).toContain("hooks[0].emphasis");
  });

  it("clears a clearable field with an empty string", () => {
    const r = applyCarouselPatch(deck(), { hooks: [{ index: 0, emphasis: "" }] });
    expect(r.ok && "emphasis" in r.carousel.content.hooks[0]!).toBe(false);
  });

  it("validates and stores a slide graphic, or removes it with null", () => {
    const set = applyCarouselPatch(deck(), {
      slides: [{ index: 0, graphic: { component: "stat", data: { stat: "40%", label: "less deep sleep" } } }],
    });
    expect(set.ok).toBe(true);
    if (!set.ok) return;
    expect(JSON.parse(set.carousel.content.slides[0]!.graphic!)).toEqual({
      component: "stat",
      data: { stat: "40%", label: "less deep sleep" },
    });
    const bad = applyCarouselPatch(deck(), { slides: [{ index: 0, graphic: { component: "nope" } }] });
    expect(bad.ok).toBe(false);
    const cleared = applyCarouselPatch(set.carousel, { slides: [{ index: 0, graphic: null }] });
    expect(cleared.ok && cleared.carousel.content.slides[0]!.graphic).toBeUndefined();
  });

  it("edits cta, caption, selectedHook and takeaway", () => {
    const r = applyCarouselPatch(deck(), {
      cta: { followLine: "Follow @lunia" },
      caption: "New caption",
      selectedHook: 1,
      takeaway: {
        headline: "Remember",
        points: ["Sleep early", "Skip screens"],
        interaction: { type: "save", label: "Save this" },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.carousel.content.cta).toEqual({ headline: "Sleep better", followLine: "Follow @lunia" });
    expect(r.carousel.content.caption).toBe("New caption");
    expect(r.carousel.selectedHook).toBe(1);
    expect(r.carousel.content.takeaway?.points).toEqual(["Sleep early", "Skip screens"]);
    expect(applyCarouselPatch(deck(), { selectedHook: 5 }).ok).toBe(false);
  });

  it("refuses a stale write and an empty patch", () => {
    const stale = applyCarouselPatch(deck(), { ifSavedAt: "2026-01-01T00:00:00.000Z", caption: "x" });
    expect(!stale.ok && stale.status).toBe(409);
    const fresh = applyCarouselPatch(deck(), { ifSavedAt: "2026-10-01T00:00:00.000Z", caption: "x" });
    expect(fresh.ok).toBe(true);
    const empty = applyCarouselPatch(deck(), {});
    expect(!empty.ok && empty.status).toBe(400);
    expect(applyCarouselPatch(deck(), { nonsense: 1 }).ok).toBe(false);
  });

  it("only touches did-you-know content on a did-you-know deck", () => {
    const r = applyCarouselPatch(deck(), { didYouKnowContent: { headline: "x" } });
    expect(r.ok).toBe(false);
  });
});
