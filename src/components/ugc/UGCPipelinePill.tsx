"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { UGCPipelineStage, UGC_PIPELINE_STAGES, UGC_STAGE_LABELS } from "@/lib/types";

/**
 * The pipeline IS a progression, so it is drawn as one: a wash that firms up
 * as work advances, with colour held back for the two stages that are actually
 * outcomes. The previous grey/sky/purple/yellow/green/red ramp was six
 * unrelated hues borrowed from a project-management tool — it told you a stage
 * had changed but never which direction it had moved.
 */
const STAGE_STYLES: Record<UGCPipelineStage, { bg: string; text: string; border?: string }> = {
  invited:            { bg: "transparent",         text: "var(--muted)", border: "var(--border-strong)" },
  approved:           { bg: "var(--chip-bg)",      text: "var(--chip-fg)" },
  delivered:          { bg: "var(--chip-bg-firm)", text: "var(--chip-fg)" },
  "edited-and-ready": { bg: "transparent",         text: "var(--warning)", border: "var(--warning)" },
  posted:             { bg: "transparent",         text: "var(--success)", border: "var(--success)" },
  cancelled:          { bg: "transparent",         text: "var(--error)",   border: "var(--error)" },
};

const MENU_HEIGHT = 220; // approximate max height of the dropdown

type Props = {
  stage: UGCPipelineStage;
  onChange: (next: UGCPipelineStage) => void;
};

export default function UGCPipelinePill({ stage, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, openUp: false });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const style = STAGE_STYLES[stage] ?? STAGE_STYLES.invited;

  // Close on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // Close on scroll so the menu doesn't drift
  useEffect(() => {
    if (!menuOpen) return;
    function onScroll() { setMenuOpen(false); }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [menuOpen]);

  function openMenu() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_HEIGHT;
    setMenuPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      openUp,
    });
    setMenuOpen((v) => !v);
  }

  const menu = menuOpen
    ? createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.openUp ? undefined : menuPos.top,
            bottom: menuPos.openUp ? window.innerHeight - menuPos.top : undefined,
            left: menuPos.left,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            padding: 4,
            zIndex: 9999,
            minWidth: 170,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {UGC_PIPELINE_STAGES.map((s) => {
            const st = STAGE_STYLES[s];
            const active = s === stage;
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setMenuOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: "var(--text)",
                  background: active ? "var(--surface-h)" : "transparent",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-h)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: st.bg, flexShrink: 0,
                }} />
                <span>{UGC_STAGE_LABELS[s]}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        title="Click to change stage"
        style={{
          background: style.bg,
          border: style.border ? `1px solid ${style.border}` : "1px solid transparent",
          color: style.text,
          padding: "3px 10px",
          minHeight: 22,
          borderRadius: "var(--r-sm)",
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "opacity 0.12s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        {UGC_STAGE_LABELS[stage] ?? stage}
      </button>
      {menu}
    </>
  );
}
