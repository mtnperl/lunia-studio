import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> & {
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
};

/** Single-line text input. Styles: `.ui-input*` in src/app/ui.css. Pair with
 *  `Field` for a label, hint and error. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ size = "md", invalid, ...rest }, ref) {
  const cls = ["ui-input"];
  if (size !== "md") cls.push(`ui-input--${size}`);
  if (invalid) cls.push("ui-input--invalid");
  return <input ref={ref} className={cls.join(" ")} aria-invalid={invalid || rest["aria-invalid"] || undefined} {...rest} />;
});

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { invalid?: boolean };

/** Multi-line input. Same visual system as `Input`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ invalid, rows = 3, ...rest }, ref) {
  const cls = ["ui-input"];
  if (invalid) cls.push("ui-input--invalid");
  return <textarea ref={ref} className={cls.join(" ")} rows={rows} aria-invalid={invalid || rest["aria-invalid"] || undefined} {...rest} />;
});
