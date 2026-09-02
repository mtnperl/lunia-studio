/** 14px ring spinner that inherits `currentColor`. Honors reduced motion
 *  (becomes a static half-opacity ring). */
export function Spinner({ size = 14, label }: { size?: number; label?: string }) {
  return (
    <span
      className="ui-spinner"
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size }}
    />
  );
}
