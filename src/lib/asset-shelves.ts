// The library's shelves — the one definition of how assets are grouped.
//
// This used to live inside AssetsView. The campaign picker then showed one
// flat grid of everything, which on a 700-image library means scrolling past
// 335 bottle shots to reach a lifestyle photograph. Both surfaces group the
// same assets, so they group them from the same table.
import type { AssetType } from "./types";

export type AssetShelf = {
  value: AssetType;
  label: string;
  description: string;
  color: string;
  /** False for the pools the app stamps on generated images. They still need
   *  a label and a colour: the library groups by category, and an unnamed
   *  section reads as a bug. */
  uploadable: boolean;
};

export const ASSET_TYPES: AssetShelf[] = [
  { value: "lifestyle",          label: "Lifestyle",      description: "People, rooms, light, moments",   color: "#3f6f52", uploadable: true },
  { value: "gen-z",              label: "Gen Z",          description: "Phone-first, social, bolder",     color: "#9d4670", uploadable: true },
  { value: "product-image",      label: "Product Image",  description: "Product photos",                  color: "#b45309", uploadable: true },
  { value: "logo",               label: "Logo",           description: "Brand logo or wordmark",          color: "#1e7a8a", uploadable: true },
  { value: "carousel-style",     label: "Carousel Style", description: "Reference layout for generation", color: "#7c3aed", uploadable: true },
  { value: "other",              label: "Other",          description: "General brand asset",             color: "#4a5568", uploadable: true },
  { value: "email-generated",    label: "From emails",    description: "Generated in the email editor",   color: "#4a5568", uploadable: false },
  { value: "carousel-generated", label: "From carousels", description: "Generated for a carousel",        color: "#4a5568", uploadable: false },
];

export const UPLOADABLE_TYPES = ASSET_TYPES.filter((t) => t.uploadable);

export type AssetSection = {
  key: string;
  label: string;
  color: string;
  match: (t: AssetType | undefined) => boolean;
};

/** The shelves, in the order they read. Uploaded categories first — those are
 *  the ones you curated — then the generated pools, which are larger and less
 *  interesting to browse. The final catch-all exists so an asset with an
 *  unrecognised type (an older record, a future category) is still shown
 *  rather than silently dropped. */
export const ASSET_SECTIONS: AssetSection[] = [
  ...ASSET_TYPES.map((t) => ({
    key: t.value,
    label: t.label,
    color: t.color,
    match: (v: AssetType | undefined) => v === t.value,
  })),
  {
    key: "uncategorised",
    label: "Uncategorised",
    color: "#4a5568",
    match: (v: AssetType | undefined) => !ASSET_TYPES.some((t) => t.value === v),
  },
];

/** The shelf an asset belongs on. Never undefined — the catch-all matches
 *  anything the table does not. */
export function shelfFor(assetType: AssetType | undefined): AssetSection {
  return ASSET_SECTIONS.find((s) => s.match(assetType)) ?? ASSET_SECTIONS[ASSET_SECTIONS.length - 1]!;
}
