"use client";

/** Range slider with an optional live value readout. Native `<input
 *  type="range">` for keyboard and assistive tech; styled thumb and track.
 *  Styles: `.ui-slider*` in src/app/ui.css. */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, showValue = true, format, disabled, id }: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible name. Required when there is no visible `Field` label. */
  label?: string;
  showValue?: boolean;
  format?: (v: number) => string;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <div className="ui-slider-row">
      <input
        id={id}
        type="range"
        className="ui-slider"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={format ? format(value) : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {showValue && <span className="ui-slider__value" aria-hidden="true">{format ? format(value) : value}</span>}
    </div>
  );
}
