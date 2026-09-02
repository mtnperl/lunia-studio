"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { Shortcut, Kbd } from "./Kbd";

export type Command = {
  id: string;
  label: string;
  /** Group heading, for example "Navigate" or "Slide". */
  group?: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string;
  onSelect: () => void;
};

/** Cmd K. Fuzzy-ish filter over label and keywords, grouped results, arrow
 *  navigation, Enter to run. Mount once with the full command list; `open`
 *  is controlled so the shell can bind the shortcut. */
export function CommandPalette({ open, onClose, commands, placeholder = "Type a command or search" }: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="ui-cmdk" ariaLabel="Command palette">
      {open && <PaletteBody commands={commands} placeholder={placeholder} onClose={onClose} />}
    </Dialog>
  );
}

/** Mounted only while open, so query and cursor start fresh each time. */
function PaletteBody({ commands, placeholder, onClose }: { commands: Command[]; placeholder: string; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return commands;
    const score = (c: Command) => {
      const hay = `${c.label} ${c.keywords ?? ""} ${c.group ?? ""}`.toLowerCase();
      if (hay.startsWith(needle)) return 3;
      if (c.label.toLowerCase().includes(needle)) return 2;
      if (hay.includes(needle)) return 1;
      let i = 0; for (const ch of hay) { if (ch === needle[i]) i++; if (i === needle.length) return 0.5; }
      return 0;
    };
    return commands.map((c) => ({ c, s: score(c) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.c);
  }, [q, commands]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (c: Command) => { onClose(); c.onSelect(); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const c = results[active]; if (c) run(c); }
  };

  const grouped: { group: string; items: { c: Command; index: number }[] }[] = [];
  results.forEach((c, index) => {
    const g = c.group ?? "";
    let bucket = grouped.find((x) => x.group === g);
    if (!bucket) { bucket = { group: g, items: [] }; grouped.push(bucket); }
    bucket.items.push({ c, index });
  });

  return (
    <>
      <div className="ui-cmdk__input-row" onKeyDown={onKeyDown}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          autoFocus
          className="ui-cmdk-input"
          value={q}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          placeholder={placeholder}
          role="combobox"
          aria-expanded
          aria-controls="ui-cmdk-list"
          aria-activedescendant={results[active] ? `ui-cmdk-${results[active].id}` : undefined}
          aria-autocomplete="list"
          spellCheck={false}
        />
        <Kbd>Esc</Kbd>
      </div>
      <div ref={listRef} id="ui-cmdk-list" role="listbox" className="ui-cmdk__list">
        {results.length === 0 && <div className="ui-cmdk__empty">No matching commands</div>}
        {grouped.map((g) => (
          <div key={g.group || "_"} role="group" aria-label={g.group || undefined}>
            {g.group && <div className="ui-menu-heading">{g.group}</div>}
            {g.items.map(({ c, index }) => (
              <button
                key={c.id}
                id={`ui-cmdk-${c.id}`}
                type="button"
                role="option"
                aria-selected={index === active}
                data-index={index}
                data-active={index === active}
                className="ui-menu-item"
                tabIndex={-1}
                onMouseEnter={() => setActive(index)}
                onClick={() => run(c)}
              >
                {c.icon && <span style={{ display: "inline-flex", color: "var(--ui-text-2)" }} aria-hidden="true">{c.icon}</span>}
                <span>{c.label}</span>
                {c.shortcut && <span className="ui-menu-item__shortcut"><Shortcut keys={c.shortcut} /></span>}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="ui-cmdk__footer">
        <span><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
        <span><Kbd>↩</Kbd> run</span>
        <span><Kbd>Esc</Kbd> close</span>
      </div>
    </>
  );
}
