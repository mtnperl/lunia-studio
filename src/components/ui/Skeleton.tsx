import type { CSSProperties } from "react";

/** Loading placeholder shaped like the thing that is loading. Compose a few
 *  to mirror the real layout rather than dropping a spinner. Announced as
 *  busy through `aria-busy` on the wrapper you place it in. */
export function Skeleton({ width, height = 12, circle = false, style }: {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  style?: CSSProperties;
}) {
  return <span className={`ui-skeleton${circle ? " ui-skeleton--circle" : ""}`} aria-hidden="true" style={{ width: width ?? "100%", height, ...style }} />;
}

/** N lines of text, the last one shorter. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 8 }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </span>
  );
}
