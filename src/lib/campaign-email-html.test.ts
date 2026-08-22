import { describe, it, expect } from "vitest";
import { renderCampaignEmail } from "./campaign-email-html";
import { EMAIL_FIXTURES } from "../../tests/visual/fixtures/campaign-emails";
import { CAMPAIGN_BLOCK_KINDS } from "./types";
import type { CampaignBlock, CampaignContent } from "./types";

// Byte-identity tripwire for the theme/palette refactor.
//
// The pixel-diff visual suite cannot see hex CASE or whitespace drift, and it
// needs a browser. These string snapshots can, and run in the fast unit pass.
//
// IMPORTANT, and the reason the all-kinds fixture exists: a snapshot is only
// as wide as the fixtures feeding it. Both original fixtures are plain-text
// blocks with showLogo:false, so on their own they exercise paragraphs() and
// nothing else — statBlock, discountBlock, checklistBlock, testimonialBlock,
// timelineBlock, trustgridBlock, comparisonBlock, ingredientsBlock and
// renderLogoStrip would all be invisible to this gate.
//
// KNOWN LIMIT: byte-identity on the default theme holds under ANY
// self-consistent role mapping, so this cannot prove a cream-theme palette
// maps each literal to the right ROLE. Mapping the cream literal to a panel
// background rather than to ink is invisible here and shows up only as
// white-on-ivory text in the rendered output. The cream baseline needs
// deliberate per-kind human review; this file is not that check.
describe("renderCampaignEmail", () => {
  for (const fixture of EMAIL_FIXTURES) {
    it(`renders ${fixture.name} identically`, () => {
      expect(renderCampaignEmail(fixture.content)).toMatchSnapshot();
    });
  }
});

const allKinds = EMAIL_FIXTURES.find((f) => f.name === "all-kinds-navy");

describe("all-kinds fixture coverage", () => {
  it("exists", () => {
    expect(allKinds).toBeDefined();
  });

  // Guards the guard: if a kind is added to the union without a fixture block,
  // this fails rather than letting the snapshot silently narrow.
  it("covers every block kind across the fixture set", () => {
    // Checked across ALL fixtures, not just all-kinds-navy: headerimage
    // suppresses the hero, so it lives in its own fixture rather than
    // stopping the main one from exercising the hero row.
    const covered = new Set(EMAIL_FIXTURES.flatMap((f) => f.content.blocks.map((b) => b.kind ?? "text")));
    for (const kind of CAMPAIGN_BLOCK_KINDS) {
      expect(covered.has(kind), `no fixture block for kind "${kind}"`).toBe(true);
    }
  });

  it("renders the logo strip", () => {
    expect(allKinds!.content.showLogo).not.toBe(false);
    expect(allKinds!.content.logoUrl).toBeTruthy();
  });
});

const baseContent = (blocks: CampaignBlock[]): CampaignContent => ({
  subjectLines: ["s", "", ""],
  selectedSubject: 0,
  previewText: "",
  blocks,
  cta: { label: "Go", url: "https://www.lunialife.com" },
  images: [],
});

describe("empty-block convention", () => {
  // Every structured renderer returns "" when its required fields are unset,
  // so an unfilled block never paints an empty styled box.
  //
  // "image" is exempt and deliberately so: an image block with no slot yet
  // renders a sized PLACEHOLDER, because you add the block first and pick the
  // picture second — the placeholder is what shows you where it will land.
  const EMPTY_RENDERS_NOTHING = CAMPAIGN_BLOCK_KINDS.filter((k) => k !== "image");
  for (const kind of EMPTY_RENDERS_NOTHING) {
    it(`renders nothing for an unfilled "${kind}" block`, () => {
      const withBlock = renderCampaignEmail(
        baseContent([{ id: "x", body: "", align: "left", kind }]),
      );
      const withNone = renderCampaignEmail(baseContent([]));
      expect(withBlock).toBe(withNone);
    });
  }
});

describe("inline markup", () => {
  it("renders **bold** and [links] in a text block body", () => {
    const html = renderCampaignEmail(
      baseContent([{ id: "x", body: "a **b** and [c](https://example.com)", align: "left", kind: "text" }]),
    );
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain('href="https://example.com"');
  });

  it("passes {{ merge_tag }} through untouched", () => {
    const html = renderCampaignEmail(
      baseContent([{ id: "x", body: "Hi {{ first_name }}", align: "left", kind: "text" }]),
    );
    expect(html).toContain("{{ first_name }}");
  });

  it("escapes markup-shaped user text rather than emitting it as HTML", () => {
    const html = renderCampaignEmail(
      baseContent([{ id: "x", body: "<script>alert(1)</script>", align: "left", kind: "text" }]),
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("headerimage replaces the hero", () => {
  for (const style of ["card", "pill"]) {
    const fixture = EMAIL_FIXTURES.find((f) => f.name === `headerimage-${style}`)!;
    it(`${style}: the hero image is not rendered`, () => {
      // The fixture supplies a hero on purpose. If it appears, the header is
      // sitting below a 552px photo and is a divider, not a header.
      const heroUrl = fixture.content.images.find((i) => i.role === "hero")!.url!;
      expect(renderCampaignEmail(fixture.content)).not.toContain(heroUrl);
    });
    it(`${style}: the header image IS rendered`, () => {
      const headerUrl = fixture.content.blocks.find((b) => b.kind === "headerimage")!.imageUrl!;
      expect(renderCampaignEmail(fixture.content)).toContain(headerUrl);
    });
    it(`${style}: goes full bleed, without the h-padding class`, () => {
      // h-padding carries an !important 14px inset below 599px, so keeping it
      // would make the image full-bleed on desktop and inset on mobile.
      const html = renderCampaignEmail(fixture.content);
      const row = html.slice(html.indexOf("<td style=\"padding:0 0 16px;\""));
      expect(row.slice(0, 200)).not.toContain("h-padding");
    });
  }

  it("an empty headerimage block does not suppress the hero", () => {
    // Otherwise adding the block and not filling it in would silently delete
    // the hero from the email.
    const fixture = EMAIL_FIXTURES.find((f) => f.name === "headerimage-card")!;
    const heroUrl = fixture.content.images.find((i) => i.role === "hero")!.url!;
    const emptied = {
      ...fixture.content,
      blocks: [{ id: "hdr", kind: "headerimage" as const, body: "", align: "left" as const }],
    };
    expect(renderCampaignEmail(emptied)).toContain(heroUrl);
  });
});

describe("hero CTA positioning", () => {
  const withCta = (cta: Partial<CampaignContent["cta"]>): CampaignContent => ({
    subjectLines: ["s", "", ""], selectedSubject: 0, previewText: "",
    blocks: [{ id: "b", body: "copy", align: "left", kind: "text" }],
    cta: { label: "Go", url: "https://www.lunialife.com", ...cta },
    images: [{ id: "h", role: "hero", source: "generated", aspect: "4:5", url: "https://example.com/h.png" }],
  });

  it("emits the original markup when no position is set", () => {
    // Byte-identity for every campaign saved before this feature existed.
    const html = renderCampaignEmail(withCta({}));
    expect(html).toContain("left:50%;bottom:24px;transform:translateX(-50%)");
    // Scoped to the element's class attribute: the free-variant selector
    // legitimately appears in the <style> block of every email.
    expect(html).toContain('class="hero-cta-overlay"');
    expect(html).not.toContain('class="hero-cta-overlay hero-cta-free"');
  });

  it("switches to percent placement once positioned", () => {
    const html = renderCampaignEmail(withCta({ heroX: 30, heroY: 20 }));
    expect(html).toContain("left:30%;top:20%;transform:translate(-50%,-50%)");
    expect(html).toContain("hero-cta-free");
    expect(html).not.toContain("bottom:24px");
  });

  it("treats one axis as positioned and defaults the other", () => {
    const html = renderCampaignEmail(withCta({ heroX: 40 }));
    expect(html).toContain("left:40%;top:88%");
  });

  it("clamps a position that would push the pill off the image", () => {
    const html = renderCampaignEmail(withCta({ heroX: 0, heroY: 200 }));
    expect(html).toContain("left:28%;top:92%");
  });

  it("never emits NaN from a corrupt stored value", () => {
    const html = renderCampaignEmail(withCta({ heroX: Number.NaN, heroY: Number.NaN }));
    expect(html).not.toContain("NaN");
    expect(html).toContain("left:50%;top:50%");
  });

  it("keeps the mobile bottom override off the positioned variant", () => {
    // Forcing a bottom onto a percent-top pill would drag it back to the foot.
    const html = renderCampaignEmail(withCta({ heroX: 30, heroY: 20 }));
    expect(html).toContain(".hero-cta-overlay:not(.hero-cta-free){bottom:14px !important;}");
  });

  it("heroLocked is editor-only and never reaches the email", () => {
    const locked = renderCampaignEmail(withCta({ heroX: 30, heroY: 20, heroLocked: true }));
    const unlocked = renderCampaignEmail(withCta({ heroX: 30, heroY: 20 }));
    expect(locked).toBe(unlocked);
  });

  it("still lets the whole hero be tappable, the Outlook fallback", () => {
    const html = renderCampaignEmail(withCta({ heroX: 30, heroY: 20 }));
    expect(html).toContain('<a href="https://www.lunialife.com" target="_blank"');
  });
});
