// Colour roles for the campaign email renderer.
//
// WHY ROLES AND NOT A HEX MAP: the literals this replaces are polysemous. The
// cream literal was used as ink (stat values, discount codes, stars, timeline
// labels, checkmarks), as a border, AND as a panel background. The navy literal
// was both the shell background and the ink drawn ON a cream panel. A 1:1
// hex -> token map therefore cannot be written: send the cream literal to a
// panel background and every stat value turns white-on-ivory; send it to ink
// and the ingredients panel turns ivory-on-ivory. Each site had to be
// classified by the job it does.
//
// WHAT THE SNAPSHOT CANNOT TELL YOU: byte-identity on the navy theme holds
// under ANY self-consistent mapping, so the string snapshot proves the refactor
// changed nothing on the default theme, and proves nothing at all about whether
// a role is correct. The cream output needs human eyes per block kind.
import type { CampaignContent } from "./types";

export type CampaignThemeId = "navy" | "cream";

export type CampaignTheme = {
  id: CampaignThemeId;
  /** Page + container background. */
  shell: string;
  /** Body copy on `shell`. */
  text: string;
  /** Accent-coloured copy on `shell` — stat values, codes, stars, labels. */
  inkAccent: string;
  /** Solid accent border on `shell`. */
  accentBorder: string;
  /** Faint accent border on `shell` (the un-emphasised comparison card). */
  accentBorderSoft: string;
  /** Hairline divider on `shell` (between timeline rows). */
  ruleOnShell: string;
  /** Filled panel surface: ingredients panel, promo band, emphasised card. */
  panelBg: string;
  /** Copy on `panelBg`. */
  inkOnPanel: string;
  /** Secondary copy on `panelBg` (the ingredients footnote). */
  mutedOnPanel: string;
  /** Hairline divider on `panelBg` (between ingredient rows). */
  ruleOnPanel: string;
  /** Fill for an image slot with no image yet. */
  placeholder: string;
  /** Top-banner `**mark**` pill. */
  highlight: string;
  highlightText: string;
  /** Gradient scrim under text laid over a photo. Kept dark on BOTH themes:
   *  it sits on the photograph, not on the shell. */
  scrimFrom: string;
  scrimTo: string;
  /** Text over that scrim. Also theme-independent — a photo is dark under the
   *  scrim regardless of the email's background, so flipping these to the
   *  cream theme's dark ink would make the overlay unreadable. */
  onImageAccent: string;
  onImageText: string;
  /** The white strips that frame the Lunia logo asset. Deliberately NOT
   *  themed: the logo needs a white field on both themes. Declared here so
   *  that is a stated decision rather than a stray literal someone "fixes". */
  stripBg: string;
  stripText: string;
  stripRule: string;
};

/** Built from the renderer's own original lowercase literals, NOT from
 *  BRAND_COLORS. `#01253F` and `#01253f` are the same colour and a different
 *  string, and the byte-identity snapshot compares strings. */
export const NAVY_THEME: CampaignTheme = {
  id: "navy",
  shell: "#01253f",
  text: "#ffffff",
  inkAccent: "#f5f5e9",
  accentBorder: "#f5f5e9",
  accentBorderSoft: "rgba(245,245,233,0.3)",
  ruleOnShell: "rgba(245,245,233,0.2)",
  panelBg: "#f5f5e9",
  inkOnPanel: "#01253f",
  mutedOnPanel: "#4d6a7d",
  ruleOnPanel: "#dcd7c6",
  placeholder: "#0c3354",
  highlight: "#ffd800",
  highlightText: "#01253f",
  scrimFrom: "rgba(1,37,63,0)",
  scrimTo: "rgba(1,37,63,0.82)",
  onImageAccent: "#f5f5e9",
  onImageText: "#ffffff",
  stripBg: "#ffffff",
  stripText: "#01253f",
  stripRule: "rgba(0,0,0,0.08)",
};

/** Soft Ivory ground with Rich Navy ink — the treatment the brand handbook
 *  documents for a light email (BRAND_COLORS.softIvory). Chosen over the
 *  renderer's existing #f5f5e9 cream precisely because that value is not in
 *  BRAND_COLORS at all: standardising on it would have added a fourth
 *  competing background to the three TODOS.md:154 already tracks, instead of
 *  resolving one of them. #f5f5e9 stays exactly where it was, as the accent
 *  fill on the navy theme. */
export const CREAM_THEME: CampaignTheme = {
  id: "cream",
  shell: "#F7F4EF",
  text: "#102635",
  inkAccent: "#01253F",
  accentBorder: "#01253F",
  accentBorderSoft: "rgba(1,37,63,0.25)",
  ruleOnShell: "rgba(1,37,63,0.18)",
  panelBg: "#ffffff",
  inkOnPanel: "#01253F",
  mutedOnPanel: "#4d6a7d",
  ruleOnPanel: "#dcd7c6",
  placeholder: "#e5e0d6",
  highlight: "#ffd800",
  highlightText: "#01253F",
  scrimFrom: "rgba(1,37,63,0)",
  scrimTo: "rgba(1,37,63,0.82)",
  onImageAccent: "#f5f5e9",
  onImageText: "#ffffff",
  stripBg: "#ffffff",
  stripText: "#01253F",
  stripRule: "rgba(0,0,0,0.08)",
};

/** Unset resolves to navy, so every campaign saved before themes existed
 *  renders exactly as it did. */
export function resolveTheme(id: CampaignContent["theme"]): CampaignTheme {
  return id === "cream" ? CREAM_THEME : NAVY_THEME;
}

/** CTA colours for a button style under a theme.
 *
 *  On the navy theme this reproduces the shipped behaviour exactly: "cream"
 *  (the default) is a cream pill with navy text, "navy" inverts it.
 *
 *  On the cream theme both options collapse to the handbook treatment, ivory
 *  on Rich Navy, because a cream pill on an ivory ground is invisible. The
 *  editor disables the control and says so rather than silently ignoring the
 *  stored value, and `cta.style` is left untouched so switching back to navy
 *  restores the user's choice. */
export function resolveCta(
  style: "cream" | "navy" | undefined,
  theme: CampaignTheme,
): { bg: string; fg: string } {
  if (theme.id === "cream") return { bg: "#01253F", fg: "#F7F4EF" };
  return style === "navy"
    ? { bg: theme.shell, fg: theme.text }
    : { bg: theme.panelBg, fg: theme.inkOnPanel };
}
