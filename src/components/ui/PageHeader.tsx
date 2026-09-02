import type { ReactNode } from "react";

/**
 * The one loud thing on a screen.
 *
 * Every view used to print its name twice — once in the sticky top bar and
 * again as an 18–24px Inter heading with an engineering subtitle under it
 * ("Opus 4.7 content, Recraft imagery, and per-slide infographic
 * regeneration"). Two quiet titles competing, and no display tier anywhere in
 * the product. The top bar is now a wayfinding label and this is the title.
 *
 * `description` is for the reader, not the changelog: say what the screen is
 * for, in the words someone would use out loud. If the only honest sentence is
 * a list of the models involved, leave it out.
 *
 * `actions` sits on the baseline of the title on wide screens and wraps below
 * it on narrow ones, so a long title never collides with a button.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  size = "lg",
}: {
  title: ReactNode;
  eyebrow?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** `xl` for the home greeting, `lg` for a builder, `md` inside a flow. */
  size?: "xl" | "lg" | "md";
}) {
  return (
    <header style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "var(--ui-font)",
                fontSize: "var(--ui-text-11)",
                fontWeight: 600,
                letterSpacing: "var(--ui-tracking-caps)",
                textTransform: "uppercase",
                color: "var(--ui-text-3)",
                marginBottom: 8,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1 style={{
            margin: 0,
            fontFamily: "var(--ui-font)",
            fontSize: size === "xl" ? "var(--ui-text-30)" : size === "lg" ? "var(--ui-text-24)" : "var(--ui-text-20)",
            lineHeight: size === "xl" ? "var(--ui-lh-30)" : size === "lg" ? "var(--ui-lh-24)" : "var(--ui-lh-20)",
            fontWeight: 600, letterSpacing: "var(--ui-tracking-tight)", color: "var(--ui-text)", textWrap: "balance",
          }}>{title}</h1>
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--ui-text-2)",
            fontSize: "var(--ui-text-14)",
            lineHeight: "var(--ui-lh-14)",
            maxWidth: "62ch",
          }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
