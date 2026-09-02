import { forwardRef, type SelectHTMLAttributes } from "react";
import { IcChevron } from "./icons";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

/** Native select with the system's chrome. Native on purpose: it gets the
 *  platform's keyboard handling, type-ahead and screen reader support for
 *  free. Use `Menu` when the options need icons or descriptions. */
export const Select = forwardRef<HTMLSelectElement, Props>(function Select({ children, ...rest }, ref) {
  return (
    <span className="ui-select-wrap">
      <select ref={ref} className="ui-select" {...rest}>{children}</select>
      <span className="ui-select-wrap__chevron" aria-hidden="true"><IcChevron size={14} /></span>
    </span>
  );
});
