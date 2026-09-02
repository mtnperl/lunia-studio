"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Popover } from "./Popover";
import { Shortcut } from "./Kbd";
import type { Placement } from "./usePosition";

export type MenuItem =
  | { type?: "item"; label: string; icon?: ReactNode; shortcut?: string; danger?: boolean; disabled?: boolean; onSelect: () => void }
  | { type: "separator" }
  | { type: "heading"; label: string };

/** Action list with roving focus: Up and Down move, Home and End jump, Enter
 *  or Space selects, typing a letter jumps to the next item starting with it.
 *  Used for dropdowns (`anchorRef`) and context menus (`anchorRect` from the
 *  pointer, see `useContextMenu`). */
export function Menu({ open, onClose, items, anchorRef, anchorRect, placement = "bottom-start", ariaLabel = "Menu" }: {
  open: boolean;
  onClose: () => void;
  items: MenuItem[];
  anchorRef?: RefObject<HTMLElement | null>;
  anchorRect?: DOMRect | null;
  placement?: Placement;
  ariaLabel?: string;
}) {
  return (
    <Popover open={open} onClose={onClose} anchorRef={anchorRef} anchorRect={anchorRect} placement={placement} menu ariaLabel={ariaLabel}>
      {open && <MenuList items={items} onClose={onClose} />}
    </Popover>
  );
}

/** Mounted only while open, so its active index starts fresh each time. */
function MenuList({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const enabled = items.map((it, i) => ({ it, i })).filter(({ it }) => (!it.type || it.type === "item") && !("disabled" in it && it.disabled));
  const [active, setActive] = useState(enabled[0]?.i ?? 0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.focus({ preventScroll: true });
  }, [active]);

  const move = useCallback((dir: 1 | -1) => {
    if (enabled.length === 0) return;
    const idx = enabled.findIndex(({ i }) => i === active);
    setActive(enabled[(idx + dir + enabled.length) % enabled.length].i);
  }, [enabled, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(enabled[0]?.i ?? 0); }
    else if (e.key === "End") { e.preventDefault(); setActive(enabled[enabled.length - 1]?.i ?? 0); }
    else if (e.key === "Tab") { onClose(); }
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      const from = enabled.findIndex(({ i }) => i === active);
      const order = [...enabled.slice(from + 1), ...enabled.slice(0, from + 1)];
      const hit = order.find(({ it }) => "label" in it && it.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (hit) setActive(hit.i);
    }
  };

  return (
    <div ref={listRef} onKeyDown={onKeyDown}>
      {items.map((it, i) => {
        if (it.type === "separator") return <div key={i} className="ui-menu-sep" role="separator" />;
        if (it.type === "heading") return <div key={i} className="ui-menu-heading" role="presentation">{it.label}</div>;
        const disabled = !!it.disabled;
        return (
          <button
            key={i}
            type="button"
            role="menuitem"
            data-index={i}
            data-active={active === i}
            tabIndex={active === i ? 0 : -1}
            aria-disabled={disabled || undefined}
            className={`ui-menu-item${it.danger ? " ui-menu-item--danger" : ""}`}
            onMouseEnter={() => !disabled && setActive(i)}
            onClick={() => { if (disabled) return; onClose(); it.onSelect(); }}
          >
            {it.icon && <span style={{ display: "inline-flex", color: "var(--ui-text-2)" }} aria-hidden="true">{it.icon}</span>}
            <span>{it.label}</span>
            {it.shortcut && <span className="ui-menu-item__shortcut"><Shortcut keys={it.shortcut} /></span>}
          </button>
        );
      })}
    </div>
  );
}

/** Right-click support. Spread `bind` onto the element that owns the menu,
 *  then render `<Menu open={open} anchorRect={rect} onClose={close} .../>`. */
export function useContextMenu() {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const close = useCallback(() => setRect(null), []);
  const bind = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setRect(new DOMRect(e.clientX, e.clientY, 0, 0));
    },
  };
  return { open: rect !== null, rect, close, bind };
}
