"use client";
import { useId, useState, type ReactNode } from "react";
import { IcChevron } from "./icons";

/** A titled surface for rails and sidebars. Optional collapse. The header
 *  is a real button when collapsible, so it is keyboard and screen reader
 *  operable. Styles: `.ui-panel*` in src/app/ui.css. */
export function Panel({ title, actions, collapsible = false, defaultCollapsed = false, flush = false, children, bodyStyle }: {
  title?: ReactNode;
  /** Right-aligned controls in the header. */
  actions?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** No border or radius: for a panel that fills a rail edge to edge. */
  flush?: boolean;
  children: ReactNode;
  bodyStyle?: React.CSSProperties;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const bodyId = useId();
  const cls = ["ui-panel"];
  if (flush) cls.push("ui-panel--flush");
  if (collapsible) cls.push("ui-panel--collapsible");
  const header = title !== undefined && (
    collapsible ? (
      <div className="ui-panel__header" onClick={() => setCollapsed((v) => !v)}>
        <button
          type="button"
          className="ui-focusable"
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", flex: 1, minWidth: 0, borderRadius: 4 }}
          onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
        >
          <span className="ui-panel__chevron" aria-hidden="true"><IcChevron size={14} /></span>
          <span className="ui-panel__title">{title}</span>
        </button>
        {actions && <div onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", gap: 4 }}>{actions}</div>}
      </div>
    ) : (
      <div className="ui-panel__header">
        <h3 className="ui-panel__title">{title}</h3>
        {actions && <div style={{ display: "inline-flex", gap: 4 }}>{actions}</div>}
      </div>
    )
  );
  return (
    <section className={cls.join(" ")} data-collapsed={collapsed}>
      {header}
      {!collapsed && <div id={bodyId} className="ui-panel__body" style={bodyStyle}>{children}</div>}
    </section>
  );
}

/** Small uppercase heading inside a panel body. */
export function PanelSectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="ui-panel__section-title">{children}</h4>;
}
