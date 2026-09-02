import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  /** Accessible name. Required: icon-only buttons have no text label. */
  title: string;
  active?: boolean;
  danger?: boolean;
  /** 28px instead of 32px. */
  size?: "sm" | "md";
  /** 1px border and solid ground; for toolbars that sit on the canvas. */
  outlined?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

/** Icon-only button. Quiet by default (no border), `outlined` for toolbars
 *  on a busy ground. `active` marks a toggled state, `danger` a destructive
 *  one. Styles: `.ui-icon-btn*` in src/app/ui.css. */
export function IconButton({ title, active, danger, size = "md", outlined = false, children, type = "button", ...rest }: Props) {
  const cls = ["ui-icon-btn"];
  if (size === "sm") cls.push("ui-icon-btn--sm");
  if (outlined) cls.push("ui-icon-btn--outlined");
  if (active) cls.push("ui-icon-btn--active");
  if (danger) cls.push("ui-icon-btn--danger");
  return (
    <button type={type} className={cls.join(" ")} title={title} aria-label={title} aria-pressed={active === undefined ? undefined : active} {...rest}>
      {children}
    </button>
  );
}
