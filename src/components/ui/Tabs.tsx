"use client";
import { useRef, type ReactNode } from "react";

export type TabItem<T extends string> = { value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean };

/** Segmented tabs. Left and Right arrows move between tabs and select them
 *  (automatic activation), which is the pattern the WAI-ARIA guide recommends
 *  for tabs whose panels are cheap to render. `variant="underline"` for
 *  page-level tabs. Styles: `.ui-tabs*` in src/app/ui.css. */
export function Tabs<T extends string>({ value, onChange, items, ariaLabel, variant = "segmented" }: {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  ariaLabel: string;
  variant?: "segmented" | "underline";
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const enabled = items.filter((t) => !t.disabled);
    const cur = enabled.findIndex((t) => t.value === items[idx].value);
    let next: TabItem<T> | undefined;
    if (e.key === "ArrowRight") next = enabled[(cur + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(cur - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    onChange(next.value);
    refs.current[next.value]?.focus();
  };
  return (
    <div role="tablist" aria-label={ariaLabel} className={`ui-tabs${variant === "underline" ? " ui-tabs--underline" : ""}`}>
      {items.map((t, i) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => { refs.current[t.value] = el; }}
            type="button"
            role="tab"
            className="ui-tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
