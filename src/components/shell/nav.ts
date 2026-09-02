/** Navigation model for the app shell. One source of truth for tab keys,
 *  titles and grouping. Every tab that existed before the redesign is still
 *  here; only the grouping changed: the two flows that matter come first,
 *  supporting cast sits under More. */

export type Tab =
  | "home" | "generate" | "editor" | "library" | "carousel-v2" | "carousel-library" | "batch" | "subjects"
  | "email-reviews" | "email-flows" | "campaign" | "campaign-library" | "video" | "video-assets" | "video-library"
  | "ugc" | "ugc-briefs" | "assets" | "business-overview" | "business-pnl" | "business-unit-economics" | "business-cash" | "business-assumptions";

export const TAB_TITLES: Record<Tab, string> = {
  home: "Home",
  generate: "Generate script",
  editor: "Script editor",
  library: "Script library",
  "carousel-v2": "Carousel",
  batch: "Batch carousels",
  subjects: "Subjects",
  "carousel-library": "Carousels",
  "email-reviews": "Email flow reviews",
  "email-flows": "Saved flow reviews",
  campaign: "Email",
  "campaign-library": "Emails",
  video: "Video builder",
  "video-library": "Video library",
  "video-assets": "Video assets",
  assets: "Assets",
  ugc: "UGC tracker",
  "ugc-briefs": "UGC briefs",
  "business-overview": "Business, overview",
  "business-pnl": "Business, P&L",
  "business-unit-economics": "Business, unit economics",
  "business-cash": "Business, cash and expenses",
  "business-assumptions": "Business, assumptions",
};

export type NavItem = { key: Tab; label: string; keywords?: string };
export type NavSection = { id: string; label: string; items: NavItem[]; collapsible?: boolean };

/** Feature flag carried over from the old shell. */
export const SHOW_VIDEO = false;

export const NAV: NavSection[] = [
  {
    id: "create",
    label: "Create",
    items: [
      { key: "carousel-v2", label: "Carousel", keywords: "instagram slides builder" },
      { key: "campaign", label: "Email", keywords: "campaign klaviyo builder" },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      { key: "carousel-library", label: "Carousels" },
      { key: "campaign-library", label: "Emails" },
      { key: "assets", label: "Assets", keywords: "images library" },
      { key: "subjects", label: "Subjects", keywords: "topics" },
    ],
  },
  {
    id: "scripts",
    label: "Scripts",
    items: [
      { key: "generate", label: "Generate" },
      { key: "editor", label: "Editor" },
      { key: "library", label: "Library" },
    ],
  },
  {
    id: "more",
    label: "More",
    collapsible: true,
    items: [
      { key: "batch", label: "Batch carousels" },
      { key: "email-reviews", label: "Flow reviews", keywords: "klaviyo review" },
      { key: "email-flows", label: "Saved reviews" },
      ...(SHOW_VIDEO ? [{ key: "video", label: "Video builder" } as NavItem, { key: "video-library", label: "Video library" } as NavItem, { key: "video-assets", label: "Video assets" } as NavItem] : []),
      { key: "ugc", label: "UGC tracker" },
      { key: "ugc-briefs", label: "UGC briefs" },
      { key: "business-overview", label: "Business overview" },
      { key: "business-pnl", label: "P&L" },
      { key: "business-unit-economics", label: "Unit economics" },
      { key: "business-cash", label: "Cash and expenses" },
      { key: "business-assumptions", label: "Assumptions" },
    ],
  },
];

export const ALL_TABS: Tab[] = ["home", ...NAV.flatMap((s) => s.items.map((i) => i.key))];
export function isTab(v: string | null | undefined): v is Tab { return !!v && (ALL_TABS as string[]).includes(v); }

/** Editors get the width: the menu collapses on entering one. */
export const EDITOR_TABS = new Set<Tab>(["campaign", "carousel-v2", "editor", "video"]);
