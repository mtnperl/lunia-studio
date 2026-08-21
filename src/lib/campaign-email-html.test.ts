import { describe, it, expect } from "vitest";
import { renderCampaignEmail } from "./campaign-email-html";
import type { CampaignBlock, CampaignContent, CampaignImageSlot } from "./types";

function slot(over: Partial<CampaignImageSlot> = {}): CampaignImageSlot {
  return { id: "s1", role: "secondary", source: "generated", aspect: "16:9", url: "https://img/x.jpg", ...over };
}

function content(over: Partial<CampaignContent> = {}): CampaignContent {
  return {
    subjectLines: ["Subject"],
    selectedSubject: 0,
    previewText: "Preview",
    blocks: [{ id: "b0", body: "Intro paragraph.", align: "left" }],
    cta: { label: "Shop now", url: "https://lunialife.com" },
    images: [],
    ...over,
  };
}

function imageBlock(over: Partial<CampaignBlock> = {}): CampaignBlock {
  return { id: "ib", body: "", align: "left", kind: "image", imageSlotId: "s1", imageLayout: "column", ...over };
}

describe("image blocks", () => {
  it("renders a full-width image at the 552px content column, not a half-width cell", () => {
    const html = renderCampaignEmail(content({ blocks: [imageBlock()], images: [slot()] }));
    expect(html).toContain('width="552"');
    expect(html).not.toContain("48.91%");
  });

  it("lets a bleed image escape the 24px cell padding and the corner radius", () => {
    const html = renderCampaignEmail(
      content({ blocks: [imageBlock({ imageLayout: "bleed" })], images: [slot()] }),
    );
    expect(html).toContain('width="600"');
    expect(html).toContain("border-radius:0;");
    // The bleed cell carries neither the h-padding class nor 24px side padding.
    expect(html).toMatch(/<td style="padding:0 0 16px;">/);
  });

  it("puts overlay text in the markup as real text, plus an Outlook caption fallback", () => {
    const html = renderCampaignEmail(
      content({
        blocks: [imageBlock({ imageOverlayEyebrow: "Clinically studied", imageOverlayHeadline: "Sleep, measured" })],
        images: [slot()],
      }),
    );
    expect(html).toContain("Sleep, measured");
    expect(html).toContain("Clinically studied");
    expect(html).toContain("position:absolute");
    // The words survive a client that drops position:absolute.
    expect(html).toContain("<!--[if mso]>");
    expect(html.match(/Sleep, measured/g)?.length).toBe(2);
  });

  it("renders a split row with the image on the requested side", () => {
    const left = renderCampaignEmail(
      content({
        blocks: [imageBlock({ imageLayout: "split", imageSplitText: "Beside copy.", imageSplitSide: "left" })],
        images: [slot({ aspect: "1:1" })],
      }),
    );
    const right = renderCampaignEmail(
      content({
        blocks: [imageBlock({ imageLayout: "split", imageSplitText: "Beside copy.", imageSplitSide: "right" })],
        images: [slot({ aspect: "1:1" })],
      }),
    );
    expect(left).toContain("Beside copy.");
    // Image cell precedes the text cell on the left, and follows it on the right.
    expect(left.indexOf("https://img/x.jpg")).toBeLessThan(left.indexOf("Beside copy."));
    expect(right.indexOf("https://img/x.jpg")).toBeGreaterThan(right.indexOf("Beside copy."));
  });

  it("shows an aspect-correct placeholder before the image is generated", () => {
    const html = renderCampaignEmail(content({ blocks: [imageBlock()], images: [slot({ url: null })] }));
    expect(html).toContain("aspect-ratio:16/9");
  });
});

describe("back-compat with campaigns saved before image blocks", () => {
  it("still renders unplaced secondaries in the fixed 2-up grid", () => {
    const html = renderCampaignEmail(
      content({ images: [slot({ id: "a", aspect: "1:1" }), slot({ id: "b", aspect: "1:1" })] }),
    );
    expect(html).toContain("48.91%");
  });

  it("does not render a placed slot twice", () => {
    const html = renderCampaignEmail(
      content({ blocks: [{ id: "b0", body: "Intro.", align: "left" }, imageBlock()], images: [slot()] }),
    );
    expect(html.match(/https:\/\/img\/x\.jpg/g)?.length).toBe(1);
    expect(html).not.toContain("48.91%");
  });

  it("keeps the 2-up grid for siblings while one slot is placed inline", () => {
    const html = renderCampaignEmail(
      content({
        blocks: [imageBlock()],
        images: [slot(), slot({ id: "s2", url: "https://img/y.jpg", aspect: "1:1" })],
      }),
    );
    expect(html).toContain('width="552"');   // the placed one
    expect(html).toContain("48.91%");        // the unplaced sibling
  });

  it("renders nothing extra for an image block whose slot was deleted", () => {
    const html = renderCampaignEmail(content({ blocks: [imageBlock({ imageSlotId: "missing" })], images: [] }));
    expect(html).toContain("aspect-ratio:16/9"); // placeholder, not a crash
  });
});
