import type { LayoutBlock } from "./campaign-layout-prompts";

/** Named starting-point layouts. Apply through the identical "apply
 *  suggestion" code path as an AI suggestion — a preset is just a
 *  suggestion that skipped the LLM call, same `LayoutBlock[]` shape. */
export type CampaignLayoutPreset = {
  id: string;
  name: string;
  description: string;
  topBanner?: string;
  promoBand?: string;
  ctaLabel?: string;
  blocks: LayoutBlock[];
};

export const CAMPAIGN_LAYOUT_PRESETS: CampaignLayoutPreset[] = [
  {
    id: "discount",
    name: "Discount announcement",
    description: "Value-stack pricing block plus a benefit checklist",
    promoBand: "LIMITED TIME OFFER",
    ctaLabel: "Claim your discount",
    blocks: [
      { kind: "text", body: "A short intro paragraph, on why this offer exists right now.", align: "left" },
      {
        kind: "discount",
        discountCode: "SLEEP20",
        discountDescription: "20% off your first order",
        originalPrice: "$87.99",
        newPrice: "$29.20",
      },
      { kind: "checklist", items: ["Magnesium glycinate", "L-theanine", "Apigenin", "Melatonin-free"] },
    ],
  },
  {
    id: "educational",
    name: "Educational / results story",
    description: "A results-over-time timeline with a supporting stat",
    ctaLabel: "Learn more",
    blocks: [
      { kind: "text", body: "A short paragraph introducing the science or story.", align: "left" },
      {
        kind: "timeline",
        timelineRows: [
          { label: "WEEK 1", text: "Falling asleep faster" },
          { label: "WEEK 2", text: "Fewer night wakeups" },
          { label: "WEEK 4", text: "Waking up rested" },
        ],
      },
      { kind: "stat", statValue: "91%", statLabel: "reported better sleep quality" },
    ],
  },
  {
    id: "testimonial-led",
    name: "Testimonial-led",
    description: "Leads with a review, backed by a trust grid",
    ctaLabel: "Try it yourself",
    blocks: [
      {
        kind: "testimonial",
        testimonialQuote: "I finally sleep through the night without waking up groggy.",
        testimonialAuthor: "Sarah K., verified customer",
        testimonialStars: 5,
      },
      {
        kind: "trustgrid",
        trustItems: [
          { caption: "Melatonin-free" },
          { caption: "Transparent dosing" },
          { caption: "Third-party tested" },
          { caption: "558+ five-star reviews" },
        ],
      },
    ],
  },
  {
    id: "welcome",
    name: "Welcome / onboarding",
    description: "A warm intro with a first-order checklist",
    topBanner: "WELCOME TO LUNIA",
    ctaLabel: "Start your first order",
    blocks: [
      { kind: "text", body: "A warm welcome paragraph, setting expectations for what's next.", align: "center" },
      { kind: "checklist", items: ["Take 30 minutes before bed", "Stay consistent for 2 weeks", "Track how you feel"] },
    ],
  },
  {
    id: "urgency",
    name: "Urgency / limited-time",
    description: "A short countdown-style intro and a one-time vs subscribe comparison",
    promoBand: "48 HOURS LEFT",
    ctaLabel: "Don't miss out",
    blocks: [
      { kind: "text", body: "A short, calm urgency line, no hype.", align: "left" },
      {
        kind: "comparison",
        comparisonLeftLabel: "One-time",
        comparisonLeftPrice: "$34.99",
        comparisonLeftPerk: "Ships once",
        comparisonRightLabel: "Subscribe",
        comparisonRightPrice: "$29.20",
        comparisonRightPerk: "Save 15%, cancel anytime",
      },
    ],
  },
];
