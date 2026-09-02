"use client";
import { useId, type ReactNode } from "react";

/** Switch. `role="switch"` with `aria-checked`; Space and Enter toggle it
 *  because it is a real button. Styles: `.ui-toggle*` in src/app/ui.css. */
export function Toggle({ checked, onChange, label, disabled, id: givenId }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Visible label. If omitted, pass `aria-label` through `label` anyway. */
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const id = givenId ?? auto;
  const control = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={typeof label === "string" ? label : undefined}
      className="ui-toggle"
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
  if (!label) return control;
  return (
    <label className={`ui-toggle-row${disabled ? " ui-toggle-row--disabled" : ""}`} htmlFor={id}>
      {control}
      <span>{label}</span>
    </label>
  );
}
