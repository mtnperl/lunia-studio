import type { ReactNode } from "react";

/** Small status label. Neutral by default; a tone only when it reports a
 *  state (saved, needs review, failed). */
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warning" | "danger"; children: ReactNode }) {
  return <span className={`ui-badge${tone !== "neutral" ? ` ui-badge--${tone}` : ""}`}>{children}</span>;
}
