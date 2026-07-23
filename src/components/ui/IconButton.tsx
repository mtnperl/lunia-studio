import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  /** Accessible name — required; icon-only buttons have no text label. */
  title: string;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
};

/** 36×36 icon button. Icon color is `--text` at rest (reads clickable, not
 *  disabled), `--error` for `danger` (destructive actions look destructive at
 *  rest), `--accent` for `active`. Styling in globals.css (`.ui-icon-btn*`). */
export function IconButton({ title, active, danger, children, type = "button", ...rest }: Props) {
  const cls = ["ui-icon-btn"];
  if (active) cls.push("ui-icon-btn--active");
  if (danger) cls.push("ui-icon-btn--danger");
  return (
    <button type={type} className={cls.join(" ")} title={title} aria-label={title} {...rest}>
      {children}
    </button>
  );
}
