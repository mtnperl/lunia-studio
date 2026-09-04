"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { IcCheck, IcClose } from "./icons";

export type ToastKind = "neutral" | "success" | "warning" | "danger";
export type ToastInput = {
  title: string;
  description?: string;
  kind?: ToastKind;
  /** One optional action, for example Undo. */
  action?: { label: string; onClick: () => void };
  /** ms. Defaults to 5000, or 8000 when there is an action. `0` keeps it until dismissed. */
  duration?: number;
};
type ToastRecord = ToastInput & { id: number; leaving?: boolean };

const ToastCtx = createContext<{ toast: (t: ToastInput) => number; dismiss: (id: number) => void } | null>(null);

/** Mount once near the root. Toasts stack bottom-right, announce through a
 *  polite live region, pause their timer on hover, and never block input. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, number>>(new Map());

  // Two phases: mark it leaving so the CSS transition can play, then drop it.
  const dismiss = useCallback((id: number) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 160);
    const t = timers.current.get(id);
    if (t) { window.clearTimeout(t); timers.current.delete(id); }
  }, []);

  const arm = useCallback((rec: ToastRecord) => {
    const ms = rec.duration ?? (rec.action ? 8000 : 5000);
    if (ms <= 0) return;
    const t = window.setTimeout(() => dismiss(rec.id), ms);
    timers.current.set(rec.id, t);
  }, [dismiss]);

  const toast = useCallback((input: ToastInput) => {
    const rec: ToastRecord = { ...input, id: ++seq.current };
    setItems((xs) => [...xs.slice(-3), rec]);
    arm(rec);
    return rec.id;
  }, [arm]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="ui-toast-region" role="region" aria-label="Notifications">
        <div aria-live="polite" aria-atomic="false" style={{ display: "contents" }}>
          {items.map((t) => (
            <div
              key={t.id}
              className={`ui-toast ui-toast--${t.kind ?? "neutral"}`}
              data-leaving={t.leaving || undefined}
              role={t.kind === "danger" ? "alert" : "status"}
              onMouseEnter={() => { const h = timers.current.get(t.id); if (h) { window.clearTimeout(h); timers.current.delete(t.id); } }}
              onMouseLeave={() => { if (!timers.current.has(t.id)) arm(t); }}
            >
              {t.kind && t.kind !== "neutral" && (
                <span className="ui-toast__icon" aria-hidden="true">
                  {t.kind === "success" ? <IcCheck size={16} /> : <span style={{ fontWeight: 700 }}>!</span>}
                </span>
              )}
              <div className="ui-toast__body">
                <div className="ui-toast__title">{t.title}</div>
                {t.description && <div className="ui-toast__desc">{t.description}</div>}
                {t.action && (
                  <div style={{ marginTop: 6 }}>
                    <button type="button" className="ui-toast__action" onClick={() => { t.action?.onClick(); dismiss(t.id); }}>{t.action.label}</button>
                  </div>
                )}
              </div>
              <button type="button" className="ui-toast__close" aria-label="Dismiss" onClick={() => dismiss(t.id)}><IcClose size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

/** `const { toast } = useToast(); toast({ title: "Saved" })` */
export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
