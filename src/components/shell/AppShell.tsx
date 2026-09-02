"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button, IconButton, Tooltip, Kbd, Shortcut, CommandPalette, Dialog, ToastProvider, ConfirmProvider, type Command } from "@/components/ui";
import { IconSun, IconMoon, IconPlus, IconSearch } from "@/components/Icons";
import { NAV, TAB_TITLES, EDITOR_TABS, type Tab } from "./nav";

export type RecentDoc = { kind: "carousel" | "email"; id: string; title: string };

const THEME_EVENT = "lunia:theme";
function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(THEME_EVENT, cb); window.removeEventListener("storage", cb); };
}
function readTheme(): "light" | "dark" { return (localStorage.getItem("lunia:theme") as "light" | "dark" | null) ?? "light"; }

/** Application chrome: left menu, top bar, command palette, shortcut sheet,
 *  toast and confirm providers. Views render as children. Neutral tokens
 *  only; the brand lives on the canvas. */
export function AppShell({ tab, onNavigate, onNewCarousel, onNewEmail, recent, onOpenRecent, extraCommands, children }: {
  tab: Tab;
  onNavigate: (t: Tab) => void;
  onNewCarousel: () => void;
  onNewEmail: () => void;
  recent?: RecentDoc[];
  onOpenRecent?: (d: RecentDoc) => void;
  extraCommands?: Command[];
  children: ReactNode;
}) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <ShellInner tab={tab} onNavigate={onNavigate} onNewCarousel={onNewCarousel} onNewEmail={onNewEmail} recent={recent} onOpenRecent={onOpenRecent} extraCommands={extraCommands}>{children}</ShellInner>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function ShellInner({ tab, onNavigate, onNewCarousel, onNewEmail, recent = [], onOpenRecent, extraCommands = [], children }: {
  tab: Tab; onNavigate: (t: Tab) => void; onNewCarousel: () => void; onNewEmail: () => void; recent?: RecentDoc[]; onOpenRecent?: (d: RecentDoc) => void; extraCommands?: Command[]; children: ReactNode;
}) {
  // Collapse on entering an editor, restore on leaving. A manual toggle is
  // remembered for the tab it was made on, so it sticks while you stay there
  // and the default returns when you move.
  const [collapseOverride, setCollapseOverride] = useState<{ tab: Tab; value: boolean } | null>(null);
  const collapsed = collapseOverride?.tab === tab ? collapseOverride.value : EDITOR_TABS.has(tab);
  const setCollapsed = (fn: (v: boolean) => boolean) => setCollapseOverride({ tab, value: fn(collapsed) });
  const [mobileFor, setMobileFor] = useState<Tab | null>(null);
  const mobileOpen = mobileFor === tab;
  const setMobileOpen = (fn: (v: boolean) => boolean) => setMobileFor(fn(mobileOpen) ? tab : null);
  // The More group opens itself when the current tab lives inside it.
  const [moreToggled, setMoreToggled] = useState(false);
  const inMore = NAV.find((s) => s.id === "more")?.items.some((i) => i.key === tab) ?? false;
  const moreOpen = moreToggled || inMore;
  const setMoreOpen = (fn: (v: boolean) => boolean) => setMoreToggled(fn(moreOpen));
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as const);
  const [cmd, setCmd] = useState(false);
  const [keys, setKeys] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("lunia-editing", EDITOR_TABS.has(tab));
    return () => root.classList.remove("lunia-editing");
  }, [tab]);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  const applyTheme = (t: "light" | "dark") => { localStorage.setItem("lunia:theme", t); document.documentElement.setAttribute("data-theme", t); window.dispatchEvent(new Event(THEME_EVENT)); };

  const commands: Command[] = [
    { id: "new-carousel", label: "New carousel", group: "Create", shortcut: "mod+shift+c", onSelect: onNewCarousel },
    { id: "new-email", label: "New email", group: "Create", shortcut: "mod+shift+e", onSelect: onNewEmail },
    ...recent.slice(0, 6).map((d) => ({ id: `recent-${d.kind}-${d.id}`, label: d.title, group: d.kind === "carousel" ? "Recent carousels" : "Recent emails", keywords: "open recent", onSelect: () => onOpenRecent?.(d) })),
    ...NAV.flatMap((s) => s.items.map((i) => ({ id: `go-${i.key}`, label: `Go to ${i.label}`, group: "Navigate", keywords: `${s.label} ${i.keywords ?? ""}`, onSelect: () => onNavigate(i.key) }))),
    { id: "go-home", label: "Go to Home", group: "Navigate", onSelect: () => onNavigate("home") },
    ...extraCommands,
    { id: "theme", label: theme === "dark" ? "Switch to light mode" : "Switch to dark mode", group: "View", keywords: "theme appearance", onSelect: () => applyTheme(theme === "dark" ? "light" : "dark") },
    { id: "menu", label: collapsed ? "Show the menu" : "Hide the menu", group: "View", shortcut: "mod+\\", onSelect: () => setCollapsed((v) => !v) },
    { id: "keys", label: "Keyboard shortcuts", group: "Help", shortcut: "?", onSelect: () => setKeys(true) },
    { id: "styleguide", label: "Open the style guide", group: "Help", onSelect: () => { window.location.href = "/styleguide"; } },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); return; }
      if (typing) return;
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") { e.preventDefault(); onNewCarousel(); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); onNewEmail(); }
      else if (mod && e.key === "\\") { e.preventDefault(); setCollapsed((v) => !v); }
      else if (e.key === "?") { e.preventDefault(); setKeys(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNewCarousel, onNewEmail]);

  const title = TAB_TITLES[tab] ?? "Studio";

  return (
    <div className="app" data-collapsed={collapsed} data-mobile-open={mobileOpen}>
      {mobileOpen && <div className="app__scrim" onClick={() => setMobileOpen(() => false)} />}
      <aside className="app__nav" ref={navRef} inert={collapsed && !mobileOpen ? true : undefined} aria-label="Main">
        <button type="button" className="app__brand ui-focusable" onClick={() => onNavigate("home")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/lunia-logo.png" alt="" width={24} height={24} style={{ borderRadius: 5, objectFit: "cover" }} />
          <span>Lunia Studio</span>
        </button>
        <div className="app__nav-actions">
          <Button variant="primary" size="md" icon={<IconPlus size={14} />} onClick={onNewCarousel} style={{ flex: 1 }}>New carousel</Button>
          <Tooltip label="New email" shortcut="mod+shift+e"><IconButton title="New email" outlined onClick={onNewEmail}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg></IconButton></Tooltip>
        </div>
        <button type="button" className="app__search" onClick={() => setCmd(true)}>
          <IconSearch size={14} /><span>Search or jump to</span><span className="app__search-keys"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>
        <nav className="app__sections">
          {NAV.map((s) => {
            const open = !s.collapsible || moreOpen;
            return (
              <div key={s.id} className="app__section">
                {s.collapsible ? (
                  <button type="button" className="app__section-label app__section-label--btn" aria-expanded={open} onClick={() => setMoreOpen((v) => !v)}>
                    <span>{s.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform var(--ui-dur-2) var(--ui-ease-out)" }}><path d="M9 6l6 6-6 6" /></svg>
                  </button>
                ) : (
                  <div className="app__section-label">{s.label}</div>
                )}
                {open && s.items.map((i) => (
                  <button key={i.key} type="button" className="app__item" aria-current={tab === i.key ? "page" : undefined} onClick={() => onNavigate(i.key)}>{i.label}</button>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="app__nav-foot">
          <span className="app__build" title={`Build ${process.env.NEXT_PUBLIC_BUILD_SHA}`}>lunia.life <span>{process.env.NEXT_PUBLIC_BUILD_SHA}</span></span>
          <Tooltip label={theme === "dark" ? "Light mode" : "Dark mode"}><IconButton title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} size="sm" onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}</IconButton></Tooltip>
        </div>
      </aside>

      <div className="app__main">
        <header className="app__top">
          <div className="app__top-left">
            <Tooltip label={collapsed ? "Show the menu" : "Hide the menu"} shortcut="mod+\\">
              <IconButton title={collapsed ? "Show menu" : "Hide menu"} aria-expanded={!collapsed} onClick={() => { if (window.innerWidth <= 700) setMobileOpen((v) => !v); else setCollapsed((v) => !v); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" /></svg>
              </IconButton>
            </Tooltip>
            <span className="app__crumb">{title}</span>
          </div>
          <div className="app__top-right">
            <Tooltip label="Commands" shortcut="mod+k"><Button variant="ghost" size="sm" onClick={() => setCmd(true)}><Kbd>⌘</Kbd><Kbd>K</Kbd></Button></Tooltip>
            <span className="app__avatar" aria-label="Account" title="mtnperl@gmail.com">M</span>
          </div>
        </header>
        <div className="app__view">{children}</div>
      </div>

      <CommandPalette open={cmd} onClose={() => setCmd(false)} commands={commands} placeholder="Search, jump to a screen, or run a command" />
      <Dialog open={keys} onClose={() => setKeys(false)} title="Keyboard shortcuts">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px 24px", alignItems: "center", fontSize: 13, color: "var(--ui-text)" }}>
          {([
            ["Command palette", "mod+k"], ["New carousel", "mod+shift+c"], ["New email", "mod+shift+e"], ["Show or hide the menu", "mod+\\"],
            ["Undo", "mod+z"], ["Redo", "mod+shift+z"], ["Save now", "mod+s"], ["Duplicate block", "mod+d"], ["New text block (email)", "mod+shift+n"], ["This sheet", "?"],
          ] as const).map(([l, k]) => <div key={l} style={{ display: "contents" }}><span style={{ color: "var(--ui-text-2)" }}>{l}</span><Shortcut keys={k} /></div>)}
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--ui-text-3)" }}>Editor shortcuts for slides arrive with the carousel editor slice.</p>
      </Dialog>
    </div>
  );
}
