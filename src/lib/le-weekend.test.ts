import { describe, it, expect } from "vitest";
import {
  LW_CAPTION_END, LW_DEMO_POSTS, LwPostSchema, copyIssues, frenchDate, photoToneFor, planGrid,
  topLuminance, wordLimitIssues, type LwPost,
} from "./le-weekend";

const demo = LW_DEMO_POSTS[0];
const withCaption = (caption: string): LwPost => ({ ...demo, caption });
const solid = (w: number, h: number, rgb: [number, number, number], bottom?: [number, number, number]) => {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = bottom && y >= h * 0.4 ? bottom : rgb;
    out.set([c[0], c[1], c[2], 255], (y * w + x) * 4);
  }
  return out;
};

describe("le week-end schema", () => {
  it("accepts both reference posts and their copy is clean", () => {
    for (const p of LW_DEMO_POSTS) {
      expect(LwPostSchema.safeParse(p).success).toBe(true);
      expect(copyIssues(p)).toEqual([]);
      expect(wordLimitIssues(p)).toEqual([]);
    }
  });
  it("rejects a navy cover that does not open with the courrier", () => {
    expect(LwPostSchema.safeParse({ ...demo, cover: "navy" }).success).toBe(false);
  });
  it("rejects a photo template after the first slide", () => {
    const bad = { ...demo, slides: [...demo.slides, { template: "photo", fields: { headline: "21h30", subline: "Lights low" } }] };
    expect(LwPostSchema.safeParse(bad).success).toBe(false);
  });
});

describe("le week-end lint", () => {
  it("names the offending string", () => {
    const issues = copyIssues(withCaption(`Sleep better — tonight!\n${LW_CAPTION_END}`));
    expect(issues.some((i) => i.includes("dash") && i.includes("Sleep better"))).toBe(true);
    expect(issues.some((i) => i.includes("exclamation mark"))).toBe(true);
  });
  it("catches the banned construction, clinical doses, the sky and hashtags", () => {
    const issues = copyIssues(withCaption(`Melatonin is not a sedative, it is a signal. Clinically dosed. Sleep under the moon. #sleep\n${LW_CAPTION_END}`));
    expect(issues.join("\n")).toMatch(/X is not Y/);
    expect(issues.join("\n")).toMatch(/full doses/);
    expect(issues.join("\n")).toMatch(/celestial reference "moon"/);
    expect(issues.join("\n")).toMatch(/hashtag "#sleep"/);
  });
  it("requires the exact final line", () => {
    expect(copyIssues(withCaption("No sign-off."))).toContain(`Caption: must end with the exact line "${LW_CAPTION_END}"`);
  });
  it("flags magnesium crossing the blood-brain barrier", () => {
    expect(copyIssues(withCaption(`Magnesium crosses the blood-brain barrier.\n${LW_CAPTION_END}`)).join()).toMatch(/magnesium overclaim/);
  });
  it("warns on word limits rather than rejecting", () => {
    const long = { ...demo, slides: [{ template: "lexique" as const, fields: { ...demo.slides[0].fields as { word: string; pronunciation: string; gender: "n.f." }, definitions: ["one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen", "b", "c"] as [string, string, string] } }] };
    expect(LwPostSchema.safeParse(long).success).toBe(true);
    expect(wordLimitIssues(long)).toEqual(["Slide 1 definition 1: 15 words (max 14)"]);
  });
});

describe("grid planner", () => {
  it("matches the brief's ten-post example", () => {
    expect(planGrid("navy", 10)).toEqual(["photo", "ivory", "photo", "navy", "photo", "ivory", "photo", "navy", "photo", "ivory"]);
  });
  it("never puts two non-photo covers of one colour in a row, from any start", () => {
    for (const last of ["photo", "ivory", "navy", null] as const) {
      const seq = planGrid(last, 25);
      const nonPhoto = seq.filter((c) => c !== "photo");
      for (let i = 1; i < nonPhoto.length; i++) expect(nonPhoto[i]).not.toBe(nonPhoto[i - 1]);
      for (let i = 1; i < seq.length; i++) expect(seq[i] === "photo").not.toBe(seq[i - 1] === "photo");
    }
  });
  it("follows the last non-photo cover after a photo", () => {
    expect(planGrid("photo", 3, "ivory")).toEqual(["navy", "photo", "ivory"]);
  });
});

describe("photo text colour", () => {
  it("puts navy type on a light photo and ivory on a dark one", () => {
    expect(photoToneFor(topLuminance(solid(20, 50, [235, 228, 214]), 20, 50))).toBe("navy");
    expect(photoToneFor(topLuminance(solid(20, 50, [30, 26, 24]), 20, 50))).toBe("ivory");
  });
  it("reads only the top 40 percent", () => {
    // Dark wall up top, bright rug below: the headline sits on the dark part.
    expect(photoToneFor(topLuminance(solid(20, 50, [25, 25, 30], [250, 250, 250]), 20, 50))).toBe("ivory");
  });
});

describe("french date", () => {
  it("formats like the masthead", () => {
    expect(frenchDate(new Date(2026, 10, 21))).toBe("Samedi 21 novembre");
  });
});
