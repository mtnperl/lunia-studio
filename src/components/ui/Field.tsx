import { useId, type ReactNode } from "react";

/** Label, control, hint, error. Wires `htmlFor`, `aria-describedby` and
 *  `aria-invalid` for whatever control is rendered through `children`. */
export function Field({ label, hint, error, children, id: givenId }: {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: true }) => ReactNode;
}) {
  const auto = useId();
  const id = givenId ?? auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && <div id={hintId} className="ui-field__hint">{hint}</div>}
      {error && <div id={errId} className="ui-field__error" role="alert">{error}</div>}
    </div>
  );
}
