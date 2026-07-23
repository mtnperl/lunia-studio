import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "selected";
export type ButtonSize = "sm" | "md";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/** The one text-button in the app. Styling lives in globals.css (`.ui-btn*`)
 *  so it's app-adoptable and every state (rest/hover/focus-visible/disabled)
 *  is consistent. `disabled` is genuinely unavailable — a `secondary` button
 *  at rest already reads as clickable (full-contrast text + strong border),
 *  so we never dim an active control to make it look "quiet." */
export function Button({ variant = "secondary", size = "sm", children, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`ui-btn ui-btn--${size} ui-btn--${variant}`} {...rest}>
      {children}
    </button>
  );
}
