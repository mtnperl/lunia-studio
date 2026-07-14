import { describe, it, expect } from "vitest";
import { extractImages, extractHrefs, htmlToText } from "./campaign-import-prompts";

const SAMPLE = `
<html><head><style>.x{color:red}</style></head><body>
  <img src="https://cdn.klaviyo.com/o.gif?trk=1" width="1" height="1" alt="">
  <img src="https://static.brand.com/logo.png" width="120" height="40" alt="Brand logo">
  <img src="https://static.brand.com/hero.jpg" width="600" height="400" alt="Sleep better tonight">
  <img src="https://static.brand.com/bottle.jpg" width="300" height="300" alt="">
  <img src="https://static.brand.com/icons/instagram.png" width="24" height="24" alt="Instagram">
  <h1>Your best sleep starts here</h1>
  <p>Magnesium glycinate helps you fall asleep faster &amp; stay asleep.</p>
  <p>Trusted by 20,000 customers.</p>
  <a href="https://email.brand.com/click?u=xyz&dest=shop">Shop now</a>
  <a href="https://brand.com/unsubscribe?id=1">Unsubscribe</a>
  <a href="https://instagram.com/brand">Follow us</a>
  <a href="mailto:hi@brand.com">Email us</a>
</body></html>`;

describe("extractImages", () => {
  it("keeps content images, drops pixels/logos/social icons, in order", () => {
    const imgs = extractImages(SAMPLE);
    expect(imgs.map((i) => i.url)).toEqual([
      "https://static.brand.com/hero.jpg",
      "https://static.brand.com/bottle.jpg",
    ]);
  });

  it("dedupes repeated urls", () => {
    const html = `<img src="https://x.com/a.jpg" width="500" height="500"><img src="https://x.com/a.jpg" width="500" height="500">`;
    expect(extractImages(html)).toHaveLength(1);
  });
});

describe("extractHrefs", () => {
  it("keeps real cta links, drops unsubscribe/social/mailto", () => {
    expect(extractHrefs(SAMPLE)).toEqual(["https://email.brand.com/click?u=xyz&dest=shop"]);
  });
});

describe("htmlToText", () => {
  it("preserves copy verbatim, decodes entities, drops style", () => {
    const text = htmlToText(SAMPLE);
    expect(text).toContain("Your best sleep starts here");
    expect(text).toContain("Magnesium glycinate helps you fall asleep faster & stay asleep.");
    expect(text).toContain("Trusted by 20,000 customers.");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("<");
  });
});
