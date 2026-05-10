// Inter typography system for Lunia emails. Applied to any HTML pushed to
// Klaviyo so the cloned draft template uses the canonical font weights.
//
//   Headlines (H1 / H2):  Inter, font-weight 400 (Normal)
//   Body paragraphs:      Inter, font-weight 300 (Light)
//   Bold within body:     Inter, font-weight 700 (Bold)
//   CTA button label:     Inter, font-weight 700, navy on Signal Yellow

import "server-only";

const INTER_GOOGLE_FONT = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700&display=swap";

const LUNIA_TYPOGRAPHY_CSS = `
@import url('${INTER_GOOGLE_FONT}');

body, body * {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-weight: 300;
  color: #1A1A1A;
  line-height: 1.6;
}

h1, h2, .lunia-headline {
  font-weight: 400 !important;
  letter-spacing: -0.01em;
  color: #102635;
}

h3, h4, h5, h6 {
  font-weight: 400 !important;
  color: #102635;
}

p, .lunia-body {
  font-weight: 300 !important;
  color: #1A1A1A;
  line-height: 1.6;
}

strong, b, .lunia-bold {
  font-weight: 700 !important;
  color: inherit;
}

em, i {
  font-style: italic;
  font-weight: inherit;
}

a {
  color: #102635;
  text-decoration: underline;
}

.lunia-cta, a.lunia-cta {
  display: inline-block;
  background: #FFD800;
  color: #102635 !important;
  font-weight: 700;
  padding: 14px 28px;
  text-decoration: none;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
`.trim();

const STYLE_OPEN = `<style data-lunia-typography="v1">`;
const STYLE_CLOSE = `</style>`;
const STYLE_BLOCK = `${STYLE_OPEN}${LUNIA_TYPOGRAPHY_CSS}${STYLE_CLOSE}`;

/**
 * Inject Lunia's Inter typography CSS into an HTML email template.
 *
 * - If the template already carries `data-lunia-typography="v1"`, it's a
 *   no-op (idempotent so repeated writebacks don't pile styles up).
 * - If there's a `<head>`, the style block goes inside it.
 * - Otherwise the style block is prepended to the document.
 */
export function applyLuniaTypography(html: string | undefined | null): string {
  if (!html || !html.trim()) {
    // No template HTML at all (rare). Return a minimal scaffold so the clone
    // still has typography applied when someone later pastes content into
    // the Klaviyo editor.
    return `<!doctype html><html><head>${STYLE_BLOCK}</head><body></body></html>`;
  }

  if (html.includes('data-lunia-typography="v1"')) {
    return html;
  }

  // Try to insert before </head>
  const headEnd = html.search(/<\/head\s*>/i);
  if (headEnd >= 0) {
    return html.slice(0, headEnd) + STYLE_BLOCK + html.slice(headEnd);
  }

  // No </head>. Try after <html>.
  const htmlOpen = html.match(/<html[^>]*>/i);
  if (htmlOpen) {
    const idx = (htmlOpen.index ?? 0) + htmlOpen[0].length;
    return html.slice(0, idx) + `<head>${STYLE_BLOCK}</head>` + html.slice(idx);
  }

  // Bare body fragment — prepend the style and wrap.
  return `<!doctype html><html><head>${STYLE_BLOCK}</head><body>${html}</body></html>`;
}

// Reused by /api/email-review/copy-payload's HTML format so the copyable
// HTML carries the same typography.
export const LUNIA_TYPOGRAPHY_STYLE_BLOCK = STYLE_BLOCK;
