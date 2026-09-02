"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";
import { IconButton } from "./IconButton";
import { IcClose } from "./icons";

/** Modal dialog on the native `<dialog>` element: the browser supplies the
 *  focus trap, inert background, Escape handling and `::backdrop`. Focus
 *  returns to the opener on close. Styles: `.ui-dialog*` in src/app/ui.css. */
export function Dialog({ open, onClose, title, children, footer, wide = false, className, dismissible = true, ariaLabel }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  className?: string;
  /** When false, Escape and backdrop clicks do nothing. Use for busy states. */
  dismissible?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => { e.preventDefault(); if (dismissible) onClose(); };
    // Backdrop click: the event target is the <dialog> element itself only
    // when the click landed outside its content (the dialog has no padding).
    // Do not use pointer coordinates here: a keyboard-activated button fires
    // a click at 0,0, which a coordinate test reads as "outside".
    const onClick = (e: MouseEvent) => {
      if (!dismissible) return;
      if (e.target === el) onClose();
    };
    el.addEventListener("cancel", onCancel);
    el.addEventListener("click", onClick);
    return () => { el.removeEventListener("cancel", onCancel); el.removeEventListener("click", onClick); };
  }, [onClose, dismissible]);

  return (
    <dialog ref={ref} className={`ui-dialog${wide ? " ui-dialog--wide" : ""}${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
      {open && (
        <>
          {title !== undefined && (
            <div className="ui-dialog__header">
              <h2 className="ui-dialog__title">{title}</h2>
              {dismissible && <IconButton title="Close" size="sm" onClick={onClose}><IcClose size={16} /></IconButton>}
            </div>
          )}
          <div className="ui-dialog__body">{children}</div>
          {footer && <div className="ui-dialog__footer">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for destructive actions (red confirm button). */
  tone?: "default" | "danger";
};

const ConfirmCtx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Replaces `window.confirm`. `const confirm = useConfirm(); if (await
 *  confirm({ title: "Delete this carousel?", tone: "danger" })) ...` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ opts: ConfirmOptions; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ opts, resolve })), []);
  const settle = (v: boolean) => { state?.resolve(v); setState(null); };
  const variant: ButtonVariant = state?.opts.tone === "danger" ? "danger" : "primary";
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Dialog
        open={state !== null}
        onClose={() => settle(false)}
        title={state?.opts.title}
        footer={
          <>
            <Button onClick={() => settle(false)}>{state?.opts.cancelLabel ?? "Cancel"}</Button>
            <Button variant={variant} autoFocus onClick={() => settle(true)}>{state?.opts.confirmLabel ?? "Confirm"}</Button>
          </>
        }
      >
        {state?.opts.description}
      </Dialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
