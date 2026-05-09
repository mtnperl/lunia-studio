// Brand ink colors used as the auto-contrast pair on top of any slide background.
export const INK_LIGHT = "#F7F4EF";
export const INK_DARK = "#01253f";

function srgbChannel(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color. Returns [0,1]. Non-hex input falls back to 0 (treated as dark). */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/** Returns true when a hex color is dark enough to need light ink. */
export function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.5;
}

/** Pick the brand ink color (light cream or dark navy) that contrasts with `bg`. */
export function pickInk(bg: string): string {
  return isDarkColor(bg) ? INK_LIGHT : INK_DARK;
}
