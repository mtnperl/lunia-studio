import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "selected";
export type ButtonSize = "sm" | "md" | "lg";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner over the label and blocks clicks. Width is preserved. */
  busy?: boolean;
  /** Optional leading icon, 14 to 16px. */
  icon?: ReactNode;
  children: ReactNode;
  /** React 19 passes `ref` as a prop; forwarded to the button element. */
  ref?: Ref<HTMLButtonElement>;
};

/** The one text button. Styles: `.ui-btn*` in src/app/ui.css. Every state is
 *  covered there: rest, hover, active, focus-visible, disabled, selected,
 *  busy. `disabled` means genuinely unavailable; do not dim a live control to
 *  make it quieter, use `ghost` instead. */
export function Button({ variant = "secondary", size = "sm", busy = false, icon, children, type = "button", disabled, ...rest }: Props) {
  const cls = ["ui-btn", `ui-btn--${size}`, `ui-btn--${variant}`];
  if (busy) cls.push("ui-btn--busy");
  return (
    <button type={type} className={cls.join(" ")} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {icon}
      {children}
      {busy && <span className="ui-btn__spinner" aria-hidden="true"><Spinner /></span>}
    </button>
  );
}
