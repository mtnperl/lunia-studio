"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, IconButton, Tooltip, Kbd, Tabs, CommandPalette, useToast, IcUndo, IcRedo, IcDownload, type Command } from "@/components/ui";

export type SaveState = "saved" | "saving" | "dirty" | "offline";

/** The editor shell: top bar, left rail, canvas, right rail. Every editor
 *  renders inside this. The rails are slots; the shell owns the document
 *  title, save status, undo and redo, view tabs, the primary export action,
 *  and the command palette shortcut. */
export function Shell<V extends string>({
  title, onTitle, kindLabel, saveState, canUndo, canRedo, onUndo, onRedo,
  views, view, onView, exportLabel, onExport, commands, left, right, children, leftWidth, rightWidth, topExtra,
}: {
  title: string;
  onTitle: (t: string) => void;
  kindLabel: string;
  saveState: SaveState;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  views: { value: V; label: string }[]; view: V; onView: (v: V) => void;
  exportLabel: string; onExport: () => void;
  commands: Command[];
  left: ReactNode; right: ReactNode; children: ReactNode;
  leftWidth?: number; rightWidth?: number;
  topExtra?: ReactNode;
}) {
  const [cmd, setCmd] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); return; }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); onUndo(); }
      else if (mod && e.key.toLowerCase() === "z" && e.shiftKey) { e.preventDefault(); onRedo(); }
      else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); toast({ title: "Saved", description: "Autosave is on. Cmd S saves right away." }); }
      else if (mod && e.key.toLowerCase() === "e") { e.preventDefault(); onExport(); }
      else if (e.key === "?") { e.preventDefault(); setCmd(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onUndo, onRedo, onExport, toast]);

  const saveText = { saved: "Saved", saving: "Saving", dirty: "Unsaved changes", offline: "Offline, changes kept locally" }[saveState];

  return (
    <div className="shell" style={{ ["--shell-left" as string]: leftWidth ? `${leftWidth}px` : undefined, ["--shell-right" as string]: rightWidth ? `${rightWidth}px` : undefined }}>
      <header className="shell__top">
        <div className="shell__top-left">
          <Tooltip label="Back to library"><Link href="/proposal" className="ui-icon-btn" aria-label="Back to library"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></Link></Tooltip>
          <span className="shell__crumb">{kindLabel}</span>
          <span className="shell__crumb" aria-hidden="true">/</span>
          <input className="shell__title" aria-label="Document title" value={title} onChange={(e) => onTitle(e.target.value)} />
          <span className={`shell__save shell__save--${saveState}`} role="status">
            {saveState === "saving" && <span className="ui-spinner" style={{ width: 10, height: 10 }} />}
            {saveState === "saved" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>}
            {saveText}
          </span>
        </div>
        <div className="shell__top-center">
          <Tabs value={view} onChange={onView} items={views} ariaLabel="View" />
          {topExtra}
        </div>
        <div className="shell__top-right">
          <Tooltip label="Undo" shortcut="mod+z"><IconButton title="Undo" onClick={onUndo} disabled={!canUndo}><IcUndo /></IconButton></Tooltip>
          <Tooltip label="Redo" shortcut="mod+shift+z"><IconButton title="Redo" onClick={onRedo} disabled={!canRedo}><IcRedo /></IconButton></Tooltip>
          <Tooltip label="Commands" shortcut="mod+k"><Button variant="ghost" onClick={() => setCmd(true)}><Kbd>⌘</Kbd><Kbd>K</Kbd></Button></Tooltip>
          <Button variant="primary" icon={<IcDownload size={14} />} onClick={onExport}>{exportLabel}</Button>
        </div>
      </header>
      <div className="shell__body">
        <aside className="shell__left" aria-label="Structure">{left}</aside>
        <main className="shell__canvas">{children}</main>
        <aside className="shell__right" aria-label="Properties">{right}</aside>
      </div>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} commands={commands} />
    </div>
  );
}

export function RailHead({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return <div className="shell__rail-head"><span className="grow">{children}</span>{actions}</div>;
}

/** Tracks a document value with an undo stack. Coalesces rapid edits to the
 *  same key so typing a headline is one undo step, not forty. */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[]; lastKey?: string; lastAt: number }>({ past: [], present: initial, future: [], lastAt: 0 });
  const set = (updater: (prev: T) => T, key?: string) => {
    setState((s) => {
      const next = updater(s.present);
      if (next === s.present) return s;
      const now = Date.now();
      const coalesce = key && s.lastKey === key && now - s.lastAt < 800;
      return { past: coalesce ? s.past : [...s.past.slice(-49), s.present], present: next, future: [], lastKey: key, lastAt: now };
    });
  };
  const undo = () => setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], lastAt: 0 } : s));
  const redo = () => setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), lastAt: 0 } : s));
  const reset = (v: T) => setState({ past: [], present: v, future: [], lastAt: 0 });
  return { value: state.present, set, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

/** Simulated autosave: dirty for a beat, saving, then saved. */
export function useAutosave(dep: unknown): SaveState {
  const [s, setS] = useState<SaveState>("saved");
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (first) { setFirst(false); return; }
    setS("dirty");
    const a = window.setTimeout(() => setS("saving"), 900);
    const b = window.setTimeout(() => setS("saved"), 1700);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return s;
}

/** Element that is editable in place. Enter commits (Shift Enter for a new
 *  line), Escape cancels. Selection is drawn by the parent. */
export function Editable({ value, onChange, as: Tag = "div", style, className, multiline = false, onFocus, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  as?: "div" | "h1" | "h2" | "p" | "span";
  style?: React.CSSProperties;
  className?: string;
  multiline?: boolean;
  onFocus?: () => void;
  placeholder?: string;
}) {
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      aria-label={placeholder}
      className={className}
      style={{ outline: "none", cursor: "text", ...style }}
      onFocus={onFocus}
      onInput={(e: React.FormEvent<HTMLElement>) => onChange((e.currentTarget as HTMLElement).textContent ?? "")}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Escape") { (e.currentTarget as HTMLElement).blur(); }
        if (e.key === "Enter" && !e.shiftKey && !multiline) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
      }}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      dangerouslySetInnerHTML={{ __html: escapeHtml(value) }}
    />
  );
}
function escapeHtml(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>"); }

/** Fit a fixed-size stage into its container. Returns [scale, attach]; pass `attach` as the container's ref. */
export function useFitScale(width: number, height: number, padding = 48, max = 1) {
  const [scale, setScale] = useState(0.5);
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(max, (r.width - padding * 2) / width, (r.height - padding * 2) / height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, width, height, padding, max]);
  return [scale, setEl] as const;
}

/** Simulated streaming generation. Calls `onStep` for each step, then done. */
export function useStreamingGeneration(steps: { label: string; ms: number }[], onStep: (i: number) => void, onDone: () => void) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(-1);
  const start = () => {
    setRunning(true); setCurrent(0);
    let t = 0;
    steps.forEach((s, i) => {
      t += s.ms;
      window.setTimeout(() => { onStep(i); setCurrent(i + 1); if (i === steps.length - 1) { setRunning(false); onDone(); } }, t);
    });
  };
  return { running, current, start };
}
