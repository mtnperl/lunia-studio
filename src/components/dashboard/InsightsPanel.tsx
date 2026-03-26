"use client";
import type { Insight } from "@/lib/types";

type Props = {
  insights: Insight[];
  loading?: boolean;
  error?: string;
};

const TYPE_COLOR: Record<Insight["type"], string> = {
  positive: "var(--success)",
  warning:  "var(--warning)",
  neutral:  "var(--border-strong)",
};

export default function InsightsPanel({ insights, loading = false, error }: Props) {
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 72, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        borderLeft: "3px solid var(--warning)",
        background: "var(--surface-r)",
        padding: "12px 16px",
        borderRadius: "0 6px 6px 0",
        fontSize: 13,
        color: "var(--warning)",
      }}>
        {error}
      </div>
    );
  }

  if (!insights.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {insights.map((ins, i) => (
        <div
          key={i}
          style={{
            borderLeft: `3px solid ${TYPE_COLOR[ins.type]}`,
            background: "var(--surface)",
            borderRadius: "0 6px 6px 0",
            padding: "12px 14px",
            animation: "fadeIn 0.22s ease-out forwards",
            animationDelay: `${i * 80}ms`,
            opacity: 0,
          }}
        >
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            fontWeight: 600,
            color: TYPE_COLOR[ins.type],
            marginBottom: 4,
            letterSpacing: "0.01em",
          }}>
            {ins.title}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>
            {ins.body}
          </div>
        </div>
      ))}
    </div>
  );
}
