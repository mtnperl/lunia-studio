// Resolve the slide's web fonts once per page, not once per export.
//
// html-to-image rasterises a slide inside an SVG <foreignObject>, which
// cannot reach the page's own fonts, so every @font-face the slide uses has
// to be inlined into the clone as base64. Left to itself the library redoes
// that work on every single call, and the work is not small: the brand
// sheet is nine families, 128 @font-face rules and 47 font files.
//
// It is worse than a repeated download. The Google Fonts <link> is
// cross-origin, so `sheet.cssRules` throws, and html-to-image's fallback
// refetches the stylesheet and INSERTS every rule it parses into the first
// same-origin stylesheet in the document — again on every call, with the
// font files re-encoded each time because that path has no cache of its
// own. Measured in the Did you know editor, which rebuilds its PNGs after
// every control change: the document's stylesheet grew by 256 rules per
// edit (260 → 516 → 772 …) and a rebuild went 3.3s → 4.6s → 5.6s. That
// unbounded growth is why the editor got slower the longer it stayed open
// and barely answered a slider.
//
// Resolving the CSS once and handing it back as `fontEmbedCSS` skips all of
// it: no refetch, no rule insertion, no re-encode.

import { getFontEmbedCSS } from "html-to-image";

/** Keyed by the font families the node actually sets, because that is what
 *  html-to-image filters the @font-face rules by. The formats do not share
 *  one face list — Essay is Anton and Caveat, Did you know is Cormorant and
 *  Inter — so one global entry would hand the wrong slide the wrong fonts. */
const cache = new Map<string, Promise<string | null>>();

/** The families declared anywhere in the subtree, the same way
 *  html-to-image decides which rules matter. Sorted so the key is stable. */
function usedFontFamilies(node: HTMLElement): string[] {
  const fonts = new Set<string>();
  const walk = (el: HTMLElement) => {
    const declared = el.style.fontFamily || getComputedStyle(el).fontFamily;
    for (const family of declared.split(",")) fonts.add(family.trim().replace(/["']/g, ""));
    for (const child of Array.from(el.children)) if (child instanceof HTMLElement) walk(child);
  };
  walk(node);
  return Array.from(fonts).sort();
}

/**
 * The inlined @font-face CSS for everything `node` sets, computed at most
 * once per distinct set of families.
 *
 * Returns `undefined` when it could not be resolved, which is the signal
 * html-to-image reads as "work it out yourself" — the slow path, but the
 * one that was there before, so a failure here costs speed and never a
 * slide. An empty string is a real answer (the node uses no web font) and
 * is passed through as-is.
 */
export async function fontEmbedCSSFor(node: HTMLElement): Promise<string | undefined> {
  const key = usedFontFamilies(node).join("|");
  let pending = cache.get(key);
  if (!pending) {
    pending = getFontEmbedCSS(node, { cacheBust: false }).catch((err) => {
      console.warn("[font-embed] could not inline the web fonts", err);
      // Drop it so a later export can try again on a better connection.
      cache.delete(key);
      return null;
    });
    cache.set(key, pending);
  }
  const css = await pending;
  return css ?? undefined;
}

/** Tests only. */
export function clearFontEmbedCache(): void {
  cache.clear();
}
