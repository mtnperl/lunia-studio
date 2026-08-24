import { describe, it, expect } from "vitest";
import { renderCampaignEmail } from "./campaign-email-html";
import { resolveCta, resolveTheme, contrast, BRAND_ROLE_HEX, BRAND_COLOR_ROLES } from "./campaign-theme";
import { EMAIL_FIXTURES } from "../../tests/visual/fixtures/campaign-emails";
import { CAMPAIGN_BLOCK_KINDS } from "./types";
import type { CampaignBlock, CampaignContent, CampaignHeadingSize } from "./types";

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

// ─── Header size ────────────────────────────────────────────────────────────
// The body has been sizeable per phrase since the inline style toolbar; the
// header line had no control at all. `headingSize` is that control, and the
// property that matters most is the one at the bottom of this block: unset
// renders byte-for-byte what it always did.
describe("headingSize", () => {
  /** One filled block per kind that HAS a header, with the header's default
   *  px and the words the control is meant to resize. Kept in step with the
   *  renderer's headingPx() call sites by the coverage test below. */
  const HEADED: { kind: CampaignBlock["kind"]; basePx: number; block: Partial<CampaignBlock> }[] = [
    { kind: "stat", basePx: 36, block: { statValue: "558 reviews", statLabel: "91% five-star" } },
    { kind: "discount", basePx: 22, block: { discountCode: "SLEEP20", discountDescription: "20% off" } },
    { kind: "timeline", basePx: 12, block: { timelineRows: [{ label: "30 DAYS", text: "more energy" }] } },
    {
      kind: "comparison", basePx: 11,
      block: { comparisonLeftLabel: "One-time", comparisonRightLabel: "Subscribe" },
    },
    {
      kind: "ingredients", basePx: 12,
      block: { ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium", dose: "200mg" }] },
    },
    {
      kind: "table", basePx: 14,
      block: { tableHeaders: ["Plan", "Price"], tableRows: [{ cells: ["Monthly", "$29"] }] },
    },
    { kind: "imagetext", basePx: 17, block: { imageHeading: "Why it works", body: "Because." } },
    { kind: "grid", basePx: 15, block: { gridCells: [{ heading: "One", caption: "First" }] } },
    { kind: "image", basePx: 26, block: { imageOverlayHeadline: "Over the photo" } },
    { kind: "headerimage", basePx: 28, block: { headerHeadline: "Top of the email", headerStyle: "card" } },
  ];

  /** Same ladder as the renderer's HEADING_SCALES. */
  const SCALES = { s: 0.8, m: 1, l: 1.25, xl: 1.55 } as const;

  const render = (over: Partial<CampaignBlock>) =>
    renderCampaignEmail(baseContent([{ id: "x", body: "", align: "left", ...over } as CampaignBlock]));

  for (const { kind, basePx, block } of HEADED) {
    it(`"${kind}": every size lands its own px on the header`, () => {
      for (const [size, scale] of Object.entries(SCALES)) {
        const html = render({ ...block, kind, headingSize: size as CampaignHeadingSize });
        expect(html).toContain(`font-size:${Math.round(basePx * scale)}px`);
      }
    });

    it(`"${kind}": an unset headingSize renders byte-for-byte what "m" does`, () => {
      expect(render({ ...block, kind })).toBe(render({ ...block, kind, headingSize: "m" }));
    });
  }

  // The three headers a mobile media query re-sizes with !important. An inline
  // font-size loses to that, so those blocks have to carry the size as a class
  // — and the stylesheet has to have a rule for it. A missing rule is silent:
  // desktop looks right and the phone quietly ignores the setting.
  const MOBILE_OVERRIDDEN: { sel: string; block: Partial<CampaignBlock> }[] = [
    { sel: ".headerimage-h", block: { kind: "headerimage", headerHeadline: "Top", headerStyle: "card" } },
    { sel: ".img-overlay-headline", block: { kind: "image", imageOverlayHeadline: "Over" } },
    { sel: ".email-table td", block: { kind: "table", tableHeaders: ["Plan", "Price"], tableRows: [{ cells: ["M", "$1"] }] } },
  ];

  for (const { sel, block } of MOBILE_OVERRIDDEN) {
    it(`"${sel}" carries a mobile rule for every non-default size`, () => {
      for (const size of ["s", "l", "xl"] as const) {
        const html = render({ ...block, headingSize: size });
        expect(html).toContain(`hs-${size}`);
        expect(html).toContain(`${sel}.hs-${size}{font-size:`);
      }
    });

    it(`"${sel}" emits no class at the default size`, () => {
      // The rules themselves always live in the <style> block; what must stay
      // clean is the markup, so a campaign that never touched the control
      // emits exactly the element it always did.
      const html = render(block);
      expect(html.slice(html.indexOf("<body"))).not.toContain("hs-");
    });
  }

  it("covers every kind: a kind is either headed here or body-only", () => {
    // A new kind with a header that nobody wired to headingSize would ship a
    // control that does nothing. Listing the body-only kinds explicitly means
    // adding a kind forces a decision about which list it belongs in.
    const BODY_ONLY = ["text", "checklist", "testimonial", "trustgrid", "imagebullets"];
    const headed = HEADED.map((h) => h.kind);
    expect([...headed, ...BODY_ONLY].sort()).toEqual([...CAMPAIGN_BLOCK_KINDS].sort());
  });
});

// ─── Space between blocks ───────────────────────────────────────────────────
describe("blockSpacing", () => {
  const twoBlocks: CampaignBlock[] = [
    { id: "a", body: "First.", align: "left", kind: "text" },
    { id: "b", body: "Second.", align: "left", kind: "text" },
  ];

  const withSpacing = (blockSpacing?: number) =>
    renderCampaignEmail({ ...baseContent(twoBlocks), blockSpacing });

  it("unset renders byte-for-byte what 16 does — the gap every campaign has had", () => {
    expect(withSpacing(undefined)).toBe(withSpacing(16));
  });

  it("drives the gap below each block row", () => {
    expect(withSpacing(32)).toContain("padding:0 24px 32px;");
    expect(withSpacing(0)).toContain("padding:0 24px 0px;");
  });

  it("reaches the full-row kinds too, which own their own padding", () => {
    const html = renderCampaignEmail({
      ...baseContent([
        { id: "h", body: "", align: "left", kind: "headerimage", headerHeadline: "Top" },
        { id: "i", body: "", align: "left", kind: "image", imageLayout: "bleed" },
      ]),
      blockSpacing: 24,
    });
    expect(html).toContain("padding:0 0 24px;");
  });

  it("clamps a corrupt or hand-edited value rather than trusting it", () => {
    expect(withSpacing(-40)).toBe(withSpacing(0));
    expect(withSpacing(9999)).toBe(withSpacing(48));
    expect(withSpacing(NaN)).toBe(withSpacing(16));
  });

  it("leaves the hero, promo band and CTA on their own rhythm", () => {
    const content = {
      ...baseContent(twoBlocks),
      promoBand: "MEMORIAL DAY WEEKEND SALE",
      blockSpacing: 40,
    };
    const html = renderCampaignEmail(content);
    // The promo band keeps its 16px; only the blocks moved.
    expect(html).toContain("padding:0 24px 16px;");
    expect(html).toContain("padding:0 24px 40px;");
    expect(html).toContain("padding:0 24px 24px;"); // the CTA
  });
});

// ─── CTA colour ─────────────────────────────────────────────────────────────
// The colour used to be unchangeable on the cream theme: resolveCta ignored
// `style` there and the editor disabled the control. A role now always wins.
describe("CTA colour role", () => {
  const withCta = (cta: Partial<CampaignContent["cta"]>, theme?: "navy" | "cream") =>
    renderCampaignEmail({
      ...baseContent([{ id: "x", body: "Body.", align: "left", kind: "text" }]),
      theme,
      cta: { label: "Go", url: "https://www.lunialife.com", ...cta },
    });

  it("unset renders byte-for-byte what it always did, on both themes", () => {
    for (const theme of [undefined, "navy", "cream"] as const) {
      expect(withCta({ style: "cream" }, theme)).toBe(withCta({ style: "cream" }, theme));
    }
    // The cream theme still forces navy when no role is set — the old rule,
    // deliberately preserved so saved campaigns do not move.
    expect(withCta({ style: "cream" }, "cream")).toContain("background:#01253F");
  });

  it("a role applies on the cream theme, which used to ignore the pick", () => {
    const forced = withCta({ style: "cream" }, "cream");
    const chosen = withCta({ style: "cream", bgRole: "yellow" }, "cream");
    expect(forced).not.toBe(chosen);
    expect(chosen).toContain(`background:${BRAND_ROLE_HEX.yellow}`);
  });

  it("a role applies on the navy theme too", () => {
    expect(withCta({ bgRole: "aqua" })).toContain(`background:${BRAND_ROLE_HEX.aqua}`);
  });

  it("every role produces a legible label — no unreadable button is reachable", () => {
    for (const role of BRAND_COLOR_ROLES) {
      const { bg, fg } = resolveCta(undefined, resolveTheme("navy"), role);
      expect(bg).toBe(BRAND_ROLE_HEX[role]);
      // WCAG AA for the large, bold type a CTA label is set in.
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the hero overlay follows the button's role until given its own", () => {
    // The overlay only renders when there IS a hero, so this fixture supplies
    // one — without it the assertion would pass for the wrong reason.
    const withHero = (cta: Partial<CampaignContent["cta"]>) =>
      renderCampaignEmail({
        ...baseContent([{ id: "x", body: "Body.", align: "left", kind: "text" }]),
        images: [{ id: "h", role: "hero", source: "upload", aspect: "4:5", url: "https://example.com/h.jpg" }],
        cta: { label: "Go", url: "https://www.lunialife.com", ...cta },
      });

    // One role colours both the button and the overlay.
    const shared = withHero({ bgRole: "yellow" });
    expect(shared).toContain(`background:${BRAND_ROLE_HEX.yellow}`);
    expect(shared).not.toContain(`background:${BRAND_ROLE_HEX.aqua}`);

    // Until the overlay is given one of its own.
    const split = withHero({ bgRole: "yellow", heroBgRole: "aqua" });
    expect(split).toContain(`background:${BRAND_ROLE_HEX.yellow}`);
    expect(split).toContain(`background:${BRAND_ROLE_HEX.aqua}`);
  });

  it("ignores a corrupt role rather than emitting an empty background", () => {
    const bogus = withCta({ bgRole: "chartreuse" as never });
    expect(bogus).toBe(withCta({}));
  });
});
