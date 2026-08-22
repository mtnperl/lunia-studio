import { describe, it, expect } from "vitest";
import { NAVY_THEME, CREAM_THEME, resolveTheme, resolveCta, type CampaignTheme } from "./campaign-theme";

const THEMES: CampaignTheme[] = [NAVY_THEME, CREAM_THEME];

describe("resolveTheme", () => {
  it("defaults to navy when unset, so pre-theme campaigns are unchanged", () => {
    expect(resolveTheme(undefined)).toBe(NAVY_THEME);
  });
  it("resolves navy and cream", () => {
    expect(resolveTheme("navy")).toBe(NAVY_THEME);
    expect(resolveTheme("cream")).toBe(CREAM_THEME);
  });
});

// These are the checks the byte-identity snapshot structurally cannot make.
// A snapshot on the default theme holds under ANY self-consistent role
// mapping, so it proves the refactor changed nothing and proves nothing about
// whether a role is CORRECT. Ink colliding with the surface it is drawn on is
// the specific failure mode a wrong mapping produces, so assert it directly.
describe("no ink collides with the surface it sits on", () => {
  for (const t of THEMES) {
    describe(t.id, () => {
      it("body and accent ink differ from the shell", () => {
        expect(t.text).not.toBe(t.shell);
        expect(t.inkAccent).not.toBe(t.shell);
      });
      it("borders and rules differ from the shell", () => {
        expect(t.accentBorder).not.toBe(t.shell);
        expect(t.placeholder).not.toBe(t.shell);
      });
      it("panel ink differs from the panel", () => {
        expect(t.inkOnPanel).not.toBe(t.panelBg);
        expect(t.mutedOnPanel).not.toBe(t.panelBg);
        expect(t.ruleOnPanel).not.toBe(t.panelBg);
      });
      it("the panel is distinguishable from the shell", () => {
        expect(t.panelBg).not.toBe(t.shell);
      });
      it("highlight text differs from the highlight fill", () => {
        expect(t.highlightText).not.toBe(t.highlight);
      });
      it("strip text differs from the strip", () => {
        expect(t.stripText).not.toBe(t.stripBg);
      });
      it("keeps overlay ink light on both themes", () => {
        // Overlay text sits on a photograph under a dark scrim, not on the
        // email background. If these ever tracked `text`/`inkAccent`, the
        // cream theme would put dark ink on a dark scrim and the headline
        // would vanish. They are deliberately theme-independent.
        expect(t.onImageText).toBe("#ffffff");
        expect(t.onImageAccent).toBe("#f5f5e9");
        expect(t.scrimTo).toBe("rgba(1,37,63,0.82)");
      });
    });
  }
});

describe("resolveCta", () => {
  it("reproduces the shipped navy-theme behaviour exactly", () => {
    expect(resolveCta(undefined, NAVY_THEME)).toEqual({ bg: "#f5f5e9", fg: "#01253f" });
    expect(resolveCta("cream", NAVY_THEME)).toEqual({ bg: "#f5f5e9", fg: "#01253f" });
    expect(resolveCta("navy", NAVY_THEME)).toEqual({ bg: "#01253f", fg: "#ffffff" });
  });

  it("collapses to the handbook treatment on cream, whatever the stored style", () => {
    // A cream pill on an ivory ground is invisible. Both options resolve to
    // ivory-on-navy; the editor disables the control and says so rather than
    // silently ignoring the stored value.
    for (const style of [undefined, "cream", "navy"] as const) {
      expect(resolveCta(style, CREAM_THEME)).toEqual({ bg: "#01253F", fg: "#F7F4EF" });
    }
  });

  it("always keeps the label legible against the button", () => {
    for (const t of THEMES) {
      for (const style of [undefined, "cream", "navy"] as const) {
        const { bg, fg } = resolveCta(style, t);
        expect(fg).not.toBe(bg);
      }
    }
  });

  it("the cream theme never puts the button fill on the shell colour", () => {
    // Only asserted for cream. On the NAVY theme the "navy" CTA style has
    // always painted a navy button on the navy shell, so the button shape is
    // invisible and only its white label reads. That is pre-existing shipped
    // behaviour, not something the theme refactor introduced, so it is
    // recorded here rather than asserted against.
    for (const style of [undefined, "cream", "navy"] as const) {
      expect(resolveCta(style, CREAM_THEME).bg.toLowerCase()).not.toBe(CREAM_THEME.shell.toLowerCase());
    }
  });
});

// ─── Contrast ────────────────────────────────────────────────────────────────
// Turns "a wrong role mapping is invisible to automation" into something a
// machine can actually catch. A role pointed at the wrong surface almost always
// shows up as a contrast ratio near 1.
function srgb(hex: string): number[] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  return n.map((c) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
}
function luminance(hex: string): number {
  const [r, g, b] = srgb(hex);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe("contrast ratios", () => {
  for (const t of THEMES) {
    describe(t.id, () => {
      // WCAG AA for body copy.
      it("body copy on the shell clears 4.5:1", () => {
        expect(contrast(t.text, t.shell)).toBeGreaterThanOrEqual(4.5);
      });
      it("panel copy on the panel clears 4.5:1", () => {
        expect(contrast(t.inkOnPanel, t.panelBg)).toBeGreaterThanOrEqual(4.5);
      });
      it("the top-banner pill clears 4.5:1", () => {
        expect(contrast(t.highlightText, t.highlight)).toBeGreaterThanOrEqual(4.5);
      });
      it("the logo strip clears 4.5:1", () => {
        expect(contrast(t.stripText, t.stripBg)).toBeGreaterThanOrEqual(4.5);
      });
      // AA large: accent ink is used for stat values, prices, stars and caps
      // labels, all of which are large or bold.
      it("accent ink on the shell clears 3:1", () => {
        expect(contrast(t.inkAccent, t.shell)).toBeGreaterThanOrEqual(3);
      });
      it("muted copy on the panel clears 3:1", () => {
        expect(contrast(t.mutedOnPanel, t.panelBg)).toBeGreaterThanOrEqual(3);
      });
      it("every CTA style clears 4.5:1", () => {
        for (const style of [undefined, "cream", "navy"] as const) {
          const { bg, fg } = resolveCta(style, t);
          expect(contrast(fg, bg), `cta style ${style ?? "default"}`).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
  }
});
