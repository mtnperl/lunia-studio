// Campaign-email fixtures. Placeholder images are inline SVG data URIs sized
// to the EXACT target aspect the pipeline now guarantees (hero 4:5, secondary
// 1:1) — so the layout screenshot reflects real cropped-image geometry without
// any network / fal calls. Copy length is varied to exercise the block/image
// stacking that the email layout must keep in-bounds.
import type { CampaignContent } from "@/lib/types";
import { EMAIL } from "@/lib/brand-tokens";

function ph(aspect: "4:5" | "1:1", label: string, hue: string): string {
  const { width, height } = EMAIL.imageSizes[aspect];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <rect width='100%' height='100%' fill='${hue}'/>
    <text x='50%' y='50%' fill='#F7F4EF' font-family='Inter,sans-serif' font-size='${Math.round(width / 14)}' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export type EmailFixture = { name: string; content: CampaignContent };

export const EMAIL_FIXTURES: EmailFixture[] = [
  {
    name: "three-generated-standard",
    content: {
      subjectLines: ["The half of melatonin no one talks about", "", ""],
      selectedSubject: 0,
      previewText: "It is not just about falling asleep.",
      topBanner: "NEW RESEARCH",
      logoUrl: null,
      showLogo: false,
      blocks: [
        { id: "b0", body: "Most people think of melatonin as a sleep switch. The science says it is closer to a nightly repair signal, reaching all the way into your cells.", align: "left", italic: false },
        { id: "b1", body: "A calmer nervous system is the foundation. The deeper sleep and steadier mornings follow from there.", align: "center", italic: false },
        { id: "b2", body: "Only a few hours left at this price.", align: "left", italic: true },
      ],
      cta: { label: "Start sleeping better", url: "https://www.lunialife.com" },
      images: [
        { id: "h", role: "hero", source: "generated", aspect: "4:5", url: ph("4:5", "HERO 4:5", "#01253F") },
        { id: "s1", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SEC 1:1", "#2C3F51") },
        { id: "s2", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SEC 1:1", "#102635") },
      ],
    },
  },
  {
    name: "long-copy-with-promo-and-asset",
    content: {
      subjectLines: ["Your wind-down window is shorter than you think", "", ""],
      selectedSubject: 0,
      previewText: "Two hours before bed decides the whole night.",
      topBanner: "MEMORIAL DAY WEEKEND **25% OFF**",
      logoUrl: null,
      showLogo: false,
      promoBand: "MEMORIAL DAY WEEKEND SALE",
      blocks: [
        { id: "b0", body: "Your body starts preparing for sleep about two hours before you feel tired. Core temperature begins to fall, melatonin rises, and cortisol should be near its daily low. Bright light, late meals, and intense exercise all push against this shift, which is why the hour before bed does more for your sleep than anything you do once you are lying down.", align: "left", italic: false },
        { id: "b1", body: "Protect the window and everything downstream gets easier. That is the whole idea behind Lunia Restore.", align: "center", italic: false },
        { id: "b2", body: "Sale ends Monday at midnight.", align: "left", italic: true },
      ],
      cta: { label: "Shop the sale", url: "https://www.lunialife.com" },
      images: [
        { id: "h", role: "hero", source: "generated", aspect: "4:5", url: ph("4:5", "HERO 4:5", "#01253F") },
        { id: "s1", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SEC 1:1", "#2C3F51") },
        { id: "s2", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SEC 1:1", "#102635") },
        { id: "a1", role: "secondary", source: "asset", aspect: "1:1", url: ph("1:1", "BOTTLE", "#102635") },
      ],
    },
  },
  {
    // Exercises EVERY block kind plus the logo strip in one document. The other
    // two fixtures are all plain-text blocks with showLogo:false, which left
    // statBlock/discountBlock/checklistBlock/testimonialBlock/timelineBlock/
    // trustgridBlock/comparisonBlock/ingredientsBlock and renderLogoStrip
    // completely unexercised — and those are exactly where the per-kind color
    // literals live. Any regression gate over the fixtures is only as wide as
    // this fixture makes it.
    name: "all-kinds-navy",
    content: {
      subjectLines: ["Everything inside one email", "", ""],
      selectedSubject: 0,
      previewText: "One of every block kind.",
      topBanner: "EVERY BLOCK **KIND**",
      logoUrl: ph("1:1", "LOGO", "#01253F"),
      showLogo: true,
      promoBand: "ALL KINDS RENDERED",
      blocks: [
        { id: "k-text", kind: "text", body: "A plain paragraph with **bold** and a [link](https://www.lunialife.com), plus a {{ first_name }} token.", align: "left", italic: false },
        { id: "k-stat", kind: "stat", body: "", align: "left", statValue: "558 reviews", statLabel: "91% five-star" },
        { id: "k-discount", kind: "discount", body: "", align: "left", discountCode: "SLEEP20", discountDescription: "20% off your first order", originalPrice: "$38.93", newPrice: "$29.20" },
        { id: "k-checklist", kind: "checklist", body: "", align: "left", items: ["Melatonin-free", "No proprietary blends", "Every dose printed"] },
        { id: "k-testimonial", kind: "testimonial", body: "", align: "left", testimonialQuote: "The first thing that did not leave me groggy.", testimonialAuthor: "Verified customer", testimonialStars: 5 },
        { id: "k-timeline", kind: "timeline", body: "", align: "left", timelineRows: [{ label: "NIGHT 1", text: "Falling asleep faster" }, { label: "WEEK 2", text: "Fewer 3am wake-ups" }] },
        { id: "k-trustgrid", kind: "trustgrid", body: "", align: "left", trustItems: [{ imageUrl: ph("1:1", "TRUST", "#2C3F51"), caption: "Third-party tested" }, { caption: "Made in a GMP facility" }] },
        { id: "k-comparison", kind: "comparison", body: "", align: "left", comparisonLeftLabel: "One-time", comparisonLeftPrice: "$38.93", comparisonLeftPerk: "Ships once", comparisonRightLabel: "Subscribe", comparisonRightPrice: "$29.20", comparisonRightPerk: "Cancel anytime" },
        { id: "k-ingredients", kind: "ingredients", body: "", align: "left", ingredientHeading: "What's inside", ingredientItems: [{ name: "Magnesium Bisglycinate", dose: "500mg" }, { name: "L-Theanine", dose: "300mg" }, { name: "Apigenin", dose: "50mg" }], ingredientFootnote: "Melatonin-free, third-party tested" },
        { id: "k-image-column", kind: "image", body: "", align: "left", imageSlotId: "s-col", imageLayout: "column" },
        { id: "k-image-split", kind: "image", body: "", align: "left", imageSlotId: "s-split", imageLayout: "split", imageSplitText: "Copy beside the image, which stacks to full width on mobile.", imageSplitSide: "left" },
      ],
      cta: { label: "Start sleeping better", url: "https://www.lunialife.com" },
      images: [
        { id: "h", role: "hero", source: "generated", aspect: "4:5", url: ph("4:5", "HERO 4:5", "#01253F") },
        { id: "s1", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SEC 1:1", "#2C3F51") },
        { id: "s-col", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "COLUMN", "#102635") },
        { id: "s-split", role: "secondary", source: "generated", aspect: "1:1", url: ph("1:1", "SPLIT", "#2C3F51") },
      ],
    },
  },
];

/** The all-kinds document on the cream theme. Derived from the navy fixture
 *  rather than hand-written, so the two can only ever differ by theme — which
 *  is exactly what a theme baseline should isolate. */
const allKindsNavy = EMAIL_FIXTURES.find((f) => f.name === "all-kinds-navy")!;
EMAIL_FIXTURES.push({
  name: "all-kinds-cream",
  content: { ...allKindsNavy.content, theme: "cream" },
});
