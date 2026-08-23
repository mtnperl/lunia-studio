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
    <header style={{ marginBottom: 32 }}>
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
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--subtle)",
                marginBottom: 12,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1 className={`display display-${size}`}>{title}</h1>
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
            margin: "14px 0 0",
            color: "var(--muted)",
            fontSize: 15,
            lineHeight: 1.55,
            maxWidth: "62ch",
          }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
