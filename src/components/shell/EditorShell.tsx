"use client";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Button, IconButton, Tooltip, Tabs, Menu, IcUndo, IcRedo, IcDownload, type MenuItem } from "@/components/ui";

export type SaveState = "saved" | "saving" | "dirty" | "unsaved";

/** The editor shell: top bar, left rail, canvas, right rail. Layout in
 *  src/app/shell.css (`.shell*`). Rails are slots. The shell owns the title
 *  row, save state, view tabs and the primary export action; the editor owns
 *  everything inside the slots. Renders inside the app shell's view area. */
export function EditorShell<V extends string>({
  kindLabel, title, onBack, saveState, saveActions, views, view, onView,
  undo, exportLabel, exportMenu, onExport, exportNote, exportTone, left, right, children, leftWidth = 200, rightWidth = 320, topExtra,
}: {
  kindLabel: string;
  title: ReactNode;
  onBack?: () => void;
  saveState?: SaveState;
  /** Save or Update, Copy link, and so on. */
  saveActions?: ReactNode;
  views?: { value: V; label: string }[];
  view?: V;
  onView?: (v: V) => void;
  undo?: { canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void };
  exportLabel: string;
  exportMenu?: MenuItem[];
  onExport?: () => void;
  /** Shown beside the export button and as its title: a fact-check or staleness warning. */
  exportNote?: string;
  exportTone?: "warning" | "danger";
  left: ReactNode;
  right: ReactNode;
  children: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  topExtra?: ReactNode;
}) {
  const [exp, setExp] = useState(false);
  const exportRef = useRef<HTMLButtonElement | null>(null);
  const saveText = saveState ? { saved: "Saved", saving: "Saving", dirty: "Unsaved changes", unsaved: "Not saved yet" }[saveState] : null;

  return (
    <div className="shell shell--embedded" style={{ ["--shell-left" as string]: `${leftWidth}px`, ["--shell-right" as string]: `${rightWidth}px` }}>
      <header className="shell__top">
        <div className="shell__top-left">
          {onBack && (
            <Tooltip label="Back to the library">
              <IconButton title="Back to the library" onClick={onBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </IconButton>
            </Tooltip>
          )}
          <span className="shell__crumb">{kindLabel}</span>
          <span className="shell__crumb" aria-hidden="true">/</span>
          <span className="shell__title" style={{ padding: "4px 8px" }} title={typeof title === "string" ? title : undefined}>{title}</span>
          {saveText && (
            <span className={`shell__save shell__save--${saveState}`} role="status">
              {saveState === "saving" && <span className="ui-spinner" style={{ width: 10, height: 10 }} />}
              {saveState === "saved" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>}
              {saveText}
            </span>
          )}
          {saveActions}
        </div>
        <div className="shell__top-center">
          {views && view !== undefined && onView && <Tabs value={view} onChange={onView} items={views} ariaLabel="View" />}
          {topExtra}
        </div>
        <div className="shell__top-right">
          {undo && (
            <>
              <Tooltip label="Undo" shortcut="mod+z"><IconButton title="Undo" onClick={undo.onUndo} disabled={!undo.canUndo}><IcUndo /></IconButton></Tooltip>
              <Tooltip label="Redo" shortcut="mod+shift+z"><IconButton title="Redo" onClick={undo.onRedo} disabled={!undo.canRedo}><IcRedo /></IconButton></Tooltip>
            </>
          )}
          {exportNote && <span className={`shell__export-note${exportTone ? ` shell__export-note--${exportTone}` : ""}`} role="status">{exportNote}</span>}
          <Button ref={exportRef} variant="primary" icon={<IcDownload size={14} />} onClick={() => (exportMenu ? setExp(true) : onExport?.())} title={exportNote} aria-haspopup={exportMenu ? "menu" : undefined} aria-expanded={exportMenu ? exp : undefined} style={exportTone ? { boxShadow: `inset 0 0 0 2px var(--ui-${exportTone})` } : undefined}>{exportLabel}</Button>
          {exportMenu && <Menu open={exp} onClose={() => setExp(false)} anchorRef={exportRef} placement="bottom-end" items={exportMenu} ariaLabel="Export" />}
        </div>
      </header>
      <div className="shell__body">
        <aside className="shell__left" aria-label="Slides">{left}</aside>
        <main className="shell__canvas">{children}</main>
        <aside className="shell__right" aria-label="Properties">{right}</aside>
      </div>
    </div>
  );
}

export function RailHead({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return <div className="shell__rail-head"><span className="grow">{children}</span>{actions}</div>;
}
