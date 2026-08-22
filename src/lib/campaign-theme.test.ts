import { describe, it, expect } from "vitest";
import { NAVY_THEME, CREAM_THEME, resolveTheme, resolveCta, contrast, resolveBrandColor, BRAND_COLOR_ROLES, MIN_ACCENT_CONTRAST, type CampaignTheme } from "./campaign-theme";

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
// Uses the same contrast() the renderer uses, so these gates and the runtime
// substitution can never disagree.

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

describe("resolveBrandColor", () => {
  it("returns the role's own colour when it is legible on the theme", () => {
    expect(resolveBrandColor("yellow", NAVY_THEME)).toBe("#FFD800");
    expect(resolveBrandColor("navy", CREAM_THEME)).toBe("#01253F");
  });

  it("substitutes when the pick would be illegible on the shell", () => {
    // Navy on the navy shell, and ivory on the ivory shell, are the obvious
    // cases; slate on navy is the one only a contrast check catches, since it
    // is a genuinely different hex that is still unreadable.
    expect(resolveBrandColor("navy", NAVY_THEME)).toBe(NAVY_THEME.inkAccent);
    expect(resolveBrandColor("slate", NAVY_THEME)).toBe(NAVY_THEME.inkAccent);
    expect(resolveBrandColor("ivory", CREAM_THEME)).toBe(CREAM_THEME.inkAccent);
  });

  it("falls back for an unset or unknown role", () => {
    expect(resolveBrandColor(undefined, NAVY_THEME)).toBe(NAVY_THEME.inkAccent);
    // A role persisted by a newer build, read by an older one.
    expect(resolveBrandColor("chartreuse" as never, NAVY_THEME)).toBe(NAVY_THEME.inkAccent);
  });

  it("never resolves to something illegible, for any role on any theme", () => {
    // The whole point of storing roles instead of hex: an unreadable accent
    // should be unrepresentable, not merely discouraged.
    for (const t of THEMES) {
      for (const role of BRAND_COLOR_ROLES) {
        const c = resolveBrandColor(role, t);
        expect(contrast(c, t.shell), `${role} on ${t.id}`).toBeGreaterThanOrEqual(MIN_ACCENT_CONTRAST);
      }
    }
  });
});
