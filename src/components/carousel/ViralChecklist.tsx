"use client";
// The Viral pre-publish checklist, one row per rule. Sits under the fact
// check in the Check tab, muted: it is a reminder list, not the headline.
import { Fragment } from "react";
import { viralChecklist, type QcRow } from "@/lib/viral-qc";
import type { CarouselContent, VerificationRecord } from "@/lib/types";

const COLOR: Record<QcRow["state"], string> = { pass: "var(--ui-text-3)", fail: "var(--error)", manual: "var(--ui-text-3)" };
const MARK: Record<QcRow["state"], string> = { pass: "Pass", fail: "Fix", manual: "By eye" };

export function ViralChecklist({ content, selectedHook, record }: { content: CarouselContent; selectedHook: number; record?: VerificationRecord | null }) {
  const rows = viralChecklist(content, selectedHook, record);
  const fails = rows.filter((r) => r.state === "fail").length;
  const manual = rows.filter((r) => r.state === "manual").length;
  return (
    <div style={{ borderTop: "1px solid var(--ui-border)", padding: "12px 4px 0", marginTop: 12, color: "var(--ui-text-3)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Viral checklist{fails ? ` · ${fails} to fix` : ""}</div>
      <div style={{ fontSize: 12, color: "var(--ui-text-3)", marginBottom: 8 }}>{rows.length} rules{manual ? `, ${manual} to check by eye` : ""}</div>
      {content.spine && (
        <dl style={{ margin: "0 0 10px", padding: "8px 10px", borderRadius: "var(--ui-radius-2)", background: "var(--ui-surface-2, rgba(0,0,0,0.03))", fontSize: 12, lineHeight: 1.4, display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px" }}>
          {(["moment", "villain", "turn", "payoff"] as const).map((k) => (
            <Fragment key={k}><dt style={{ margin: 0, fontWeight: 600, textTransform: "capitalize" }}>{k}</dt><dd style={{ margin: 0 }}>{content.spine?.[k]}</dd></Fragment>
          ))}
        </dl>
      )}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => (
          <li key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: COLOR[r.state], minWidth: 44, paddingTop: 2 }}>{MARK[r.state]}</span>
            <span style={{ flex: 1 }}>
              <span>{i + 1}. {r.label}</span>
              {r.detail && <span style={{ display: "block", fontSize: 12, color: "var(--ui-text-3)" }}>{r.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
