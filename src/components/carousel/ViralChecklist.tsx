"use client";
// The Viral pre-publish checklist, one row per rule. Lives above the fact
// check in the Check tab for carousels on the Viral preset.
import { viralChecklist, type QcRow } from "@/lib/viral-qc";
import type { CarouselContent, VerificationRecord } from "@/lib/types";

const COLOR: Record<QcRow["state"], string> = { pass: "var(--success)", fail: "var(--error)", manual: "var(--muted)" };
const MARK: Record<QcRow["state"], string> = { pass: "Pass", fail: "Fix", manual: "Check by eye" };

export function ViralChecklist({ content, selectedHook, record }: { content: CarouselContent; selectedHook: number; record?: VerificationRecord | null }) {
  const rows = viralChecklist(content, selectedHook, record);
  const fails = rows.filter((r) => r.state === "fail").length;
  const manual = rows.filter((r) => r.state === "manual").length;
  return (
    <div style={{ border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-2)", background: "var(--ui-surface)", padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{fails === 0 ? "Checklist clear" : `${fails} to fix before publishing`}</div>
      <div style={{ fontSize: 12, color: "var(--ui-text-3)", marginBottom: 8 }}>{rows.length} rules{manual ? `, ${manual} to check by eye` : ""}</div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r, i) => (
          <li key={r.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4 }}>
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
