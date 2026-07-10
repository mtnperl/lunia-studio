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
];
