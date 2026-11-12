import type { CSSProperties, ReactNode } from "react";

/** Uppercase labels. `section` = a group header, `field` = an input label.
 *  Both use `--muted` (not `--subtle`) at 11/12px so they clear WCAG AA on
 *  white — the old 10px `--subtle` labels were the "everything is gray"
 *  offender. */
export function Label({ kind = "field", children, style, htmlFor }: {
  kind?: "section" | "field";
  children: ReactNode;
  style?: CSSProperties;
  htmlFor?: string;
}) {
  const shared: CSSProperties = {
    color: "var(--muted)", textTransform: "uppercase", fontFamily: "var(--font-ui)",
  };
  const perKind: CSSProperties = kind === "section"
    ? { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 8 }
    : { fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", display: "block", marginBottom: 4 };
  return <label htmlFor={htmlFor} style={{ ...shared, ...perKind, ...style }}>{children}</label>;
}
