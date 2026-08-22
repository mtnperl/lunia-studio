import { describe, it, expect } from "vitest";
import {
  parseMods, isEmptyMods, modsToCss, modsToToken,
  stripInlineTokens, hasBalancedTokens, blockTokensBalanced,
  applyInlineToken, clearInlineToken,
} from "./campaign-inline-style";
import { renderCampaignEmail } from "./campaign-email-html";
import { NAVY_THEME, CREAM_THEME } from "./campaign-theme";
import type { CampaignContent } from "./types";

/** Just the rendered paragraph for the block, without the surrounding email
 *  shell — which legitimately contains its own spans and markup. */
const renderBlock = (body: string, theme?: "navy" | "cream"): string => {
  const html = render(body, theme);
  const start = html.indexOf('<div class="text-block"');
  return html.slice(start, html.indexOf("</div>", start));
};

const render = (body: string, theme?: "navy" | "cream"): string => {
  const content: CampaignContent = {
    subjectLines: ["s", "", ""], selectedSubject: 0, previewText: "",
    theme,
    blocks: [{ id: "b", body, align: "left", kind: "text" }],
    cta: { label: "Go", url: "https://www.lunialife.com" }, images: [],
  };
  return renderCampaignEmail(content);
};

describe("parseMods", () => {
  it("reads sizes, styles and colours", () => {
    expect(parseMods("lg,b,yellow")).toEqual({ size: "lg", b: true, color: "yellow" });
  });
  it("is case-insensitive and tolerates spaces", () => {
    expect(parseMods(" LG , B ")).toEqual({ size: "lg", b: true });
  });
  it("drops unknown keys rather than failing", () => {
    expect(parseMods("lg,evil,chartreuse")).toEqual({ size: "lg" });
  });
  it("last size and colour win", () => {
    expect(parseMods("sm,lg")).toEqual({ size: "lg" });
    expect(parseMods("aqua,navy")).toEqual({ color: "navy" });
  });
  it("reports an all-unknown token as empty", () => {
    expect(isEmptyMods(parseMods("evil,nope"))).toBe(true);
  });
});

describe("modsToToken round-trips", () => {
  it("serialises in a stable order", () => {
    expect(modsToToken(parseMods("yellow,b,lg"))).toBe("lg,b,yellow");
  });
  it("survives a parse/serialise cycle", () => {
    const t = "xl,b,i,u,caps,aqua";
    expect(modsToToken(parseMods(t))).toBe(t);
  });
});

describe("modsToCss", () => {
  it("emits only what was set", () => {
    expect(modsToCss(parseMods("b"))).toBe("font-weight:600");
  });
  it("adds letter-spacing with caps, since caps alone reads cramped", () => {
    expect(modsToCss(parseMods("caps"))).toContain("letter-spacing");
  });
  it("takes the resolved colour from the caller", () => {
    expect(modsToCss(parseMods("yellow"), "#FFD800")).toContain("color:#FFD800");
  });
});

// ─── Adversarial. These are the reason this module exists. ──────────────────
describe("malformed and hostile input", () => {
  it("escapes markup inside a token", () => {
    const html = render("[[lg]]<script>alert(1)</script>[[/]]");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders an unterminated token as literal text, not markup", () => {
    const block = renderBlock("before [[lg]]after with no close");
    expect(block).toContain("[[lg]]after with no close");
    // No styled span was produced for it. Scoped to the block, since the
    // email shell has spans of its own.
    expect(block).not.toContain("<span style=");
  });

  it("does not let an unterminated token swallow the rest of the email", () => {
    const html = render("[[lg]]dangling");
    // The CTA lives after the blocks; if the token ate the document it is gone.
    expect(html).toContain("Go");
    expect(html).toContain("</html>");
  });

  it("renders an orphan close as literal text", () => {
    expect(render("stray [[/]] marker")).toContain("[[/]] marker");
  });

  it("accepts an uppercase token", () => {
    expect(render("[[LG]]big[[/]]")).toContain("font-size:22px");
  });

  it("renders a token with no recognised mods as plain text", () => {
    const html = render("[[evil]]text[[/]]");
    expect(html).toContain("text");
    expect(html).not.toContain("[[evil]]");
    expect(html).not.toContain("<span style=\";\">");
  });

  it("does not nest: the inner token is literal", () => {
    // The parser takes everything up to the FIRST close, so the second
    // opening marker is ordinary text inside that span.
    const html = render("[[lg]]a[[sm]]b[[/]]c[[/]]");
    expect(html).toContain("[[sm]]b");
  });

  it("never emits executable markup from user text", () => {
    // "onerror" survives as TEXT and that is correct: esc() neutralises the
    // angle brackets, so the string is inert content, not an attribute. What
    // must never appear is an actual tag.
    const hostile = '[[lg]]</span><img src=x onerror=alert(1)>[[/]] <script>x</script> [[b]]<b>[[/]]';
    const block = renderBlock(hostile);
    expect(block).not.toContain("<img");
    expect(block).not.toContain("<script");
    expect(block).not.toContain("</span><img");
    expect(block).toContain("&lt;img src=x onerror=alert(1)&gt;");
    // The only spans in the block are the two the tokens legitimately created.
    expect(block.match(/<span/g) ?? []).toHaveLength(2);
  });

  it("leaves an empty token pair harmless", () => {
    expect(() => render("[[lg]][[/]]")).not.toThrow();
  });
});

describe("interaction with the existing markup", () => {
  it("still renders **bold** and links", () => {
    const html = render("a **b** and [c](https://example.com)");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain('href="https://example.com"');
  });
  it("does not apply bold or links INSIDE a token", () => {
    // Flat-inside is what makes never-double-escape provable.
    const html = render("[[lg]]**not bold**[[/]]");
    expect(html).not.toContain("<strong>");
    expect(html).toContain("**not bold**");
  });
  it("passes merge tags through untouched", () => {
    expect(render("[[b]]Hi {{ first_name }}[[/]]")).toContain("{{ first_name }}");
  });
});

describe("colour resolution follows the theme", () => {
  it("uses the role's colour when legible", () => {
    expect(render("[[yellow]]x[[/]]")).toContain("#FFD800");
  });
  it("substitutes a role that would be illegible on the active theme", () => {
    // navy on the navy shell would vanish.
    expect(render("[[navy]]x[[/]]", "navy")).toContain(NAVY_THEME.inkAccent);
    expect(render("[[ivory]]x[[/]]", "cream")).toContain(CREAM_THEME.inkAccent);
  });
});

describe("stripInlineTokens", () => {
  it("leaves the readable text", () => {
    expect(stripInlineTokens("a [[lg,yellow]]b[[/]] c")).toBe("a b c");
  });
  it("removes an unterminated token too", () => {
    expect(stripInlineTokens("a [[lg]]b")).toBe("a b");
  });
  it("leaves ordinary brackets alone", () => {
    expect(stripInlineTokens("see [this](https://x.com)")).toBe("see [this](https://x.com)");
  });
});

describe("hasBalancedTokens", () => {
  it("accepts balanced text", () => {
    expect(hasBalancedTokens("[[lg]]a[[/]] and [[b]]c[[/]]")).toBe(true);
  });
  it("rejects a span split across a boundary", () => {
    expect(hasBalancedTokens("[[lg]]a")).toBe(false);
    expect(hasBalancedTokens("a[[/]]")).toBe(false);
  });
  it("accepts text with no tokens", () => {
    expect(hasBalancedTokens("plain")).toBe(true);
  });
});

describe("applyInlineToken", () => {
  it("wraps the selection and keeps it selected", () => {
    const r = applyInlineToken("hello world", 6, 11, parseMods("lg"));
    expect(r.text).toBe("hello [[lg]]world[[/]]");
    expect(r.text.slice(r.selStart, r.selEnd)).toBe("world");
  });
  it("is a no-op for a collapsed caret", () => {
    expect(applyInlineToken("hello", 2, 2, parseMods("lg")).text).toBe("hello");
  });
  it("is a no-op when nothing was recognised", () => {
    expect(applyInlineToken("hello", 0, 5, parseMods("evil")).text).toBe("hello");
  });
  it("merges onto an existing token instead of nesting", () => {
    const first = applyInlineToken("hello world", 6, 11, parseMods("lg"));
    const second = applyInlineToken(first.text, first.selStart, first.selEnd, parseMods("yellow"));
    expect(second.text).toBe("hello [[lg,yellow]]world[[/]]");
    expect(second.text.match(/\[\[/g)).toHaveLength(2); // one open, one close
  });
  it("flattens tokens inside the selection rather than nesting", () => {
    const r = applyInlineToken("a [[sm]]b[[/]] c", 0, 16, parseMods("lg"));
    expect(r.text).toBe("[[lg]]a b c[[/]]");
  });
  it("rejects an out-of-range selection", () => {
    expect(applyInlineToken("hi", 0, 99, parseMods("lg")).text).toBe("hi");
  });
});

describe("clearInlineToken", () => {
  it("unwraps a token around the selection", () => {
    const r = clearInlineToken("hello [[lg]]world[[/]]", 12, 17);
    expect(r.text).toBe("hello world");
  });
  it("strips tokens inside a wider selection", () => {
    const r = clearInlineToken("a [[lg]]b[[/]] c", 0, 16);
    expect(r.text).toBe("a b c");
  });
  it("is a no-op for a collapsed caret", () => {
    expect(clearInlineToken("x", 1, 1).text).toBe("x");
  });
});

describe("blockTokensBalanced", () => {
  const block = (over: Record<string, unknown>) => ({ id: "b", body: "", align: "left", ...over });

  it("accepts a block whose tokens are all closed", () => {
    expect(blockTokensBalanced(block({ body: "[[lg]]a[[/]] and [[b]]c[[/]]" }))).toBe(true);
  });
  it("rejects an unterminated opener", () => {
    expect(blockTokensBalanced(block({ body: "[[lg]]a" }))).toBe(false);
  });
  it("rejects an orphan close", () => {
    expect(blockTokensBalanced(block({ body: "a[[/]]" }))).toBe(false);
  });
  it("checks nested fields, not just body", () => {
    expect(blockTokensBalanced(block({ kind: "checklist", items: ["fine", "[[lg]]broken"] }))).toBe(false);
    expect(blockTokensBalanced(block({ kind: "table", tableRows: [{ cells: ["ok", "[[b]]x[[/]]"] }] }))).toBe(true);
  });
  it("accepts a block with no tokens at all", () => {
    expect(blockTokensBalanced(block({ body: "plain copy" }))).toBe(true);
  });
});
