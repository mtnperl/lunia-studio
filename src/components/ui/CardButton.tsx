import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "title"> & {
  title: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  /** `radio` when exactly one card in a group is chosen; `toggle` otherwise. */
  role?: "radio" | "toggle";
};

/** An option card that is a real button: focusable, pressable with Space
 *  and Enter, and marked selected through `aria-checked` (radio) or
 *  `aria-pressed` (toggle). Replaces the `div onClick` option cards. */
export function CardButton({ title, description, selected = false, role = "radio", type = "button", ...rest }: Props) {
  const aria = role === "radio" ? { role: "radio" as const, "aria-checked": selected } : { "aria-pressed": selected };
  return (
    <button type={type} className="ui-card-btn" {...aria} {...rest}>
      <span className="ui-card-btn__title">{title}</span>
      {description && <span className="ui-card-btn__desc">{description}</span>}
    </button>
  );
}
