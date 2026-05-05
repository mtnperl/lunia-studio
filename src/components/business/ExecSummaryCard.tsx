"use client";
import { useEffect, useState } from "react";

type Props = {
  /** Provide a stable cache key so we don't re-call on every render. */
  cacheKey: string;
};

type FetchState =
  | { status: "loading" }
  | { status: "ok"; summary: string }
  | { status: "empty"; reason: string }
  | { status: "error"; message: string };

export default function ExecSummaryCard({ cacheKey }: Props) {
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    async function run() {
      try {
        // Pull the latest P&L (last 30d, no prior to keep it snappy).
        const today = new Date();
        const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const since = new Date(todayUtc.getTime() - 29 * 86_400_000).toISOString().slice(0, 10);
        const until = todayUtc.toISOString().slice(0, 10);

        const pnlRes = await fetch(`/api/business/pnl?since=${since}&until=${until}`);
        if (!pnlRes.ok) {
          if (!cancelled) setState({ status: "empty", reason: "P&L unavailable" });
          return;
        }
        const pnl = await pnlRes.json();

        const sumRes = await fetch("/api/business/exec-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pnl }),
        });
        if (cancelled) return;

        const body = await sumRes.json();
        if (!sumRes.ok) {
          setState({ status: "error", message: body.error ?? "Could not generate summary" });
          return;
        }
        if (!body.summary) {
          setState({ status: "empty", reason: body.reason ?? "Not enough data" });
          return;
        }
        setState({ status: "ok", summary: body.summary });
      } catch {
        if (!cancelled) setState({ status: "error", message: "Network error" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  if (state.status === "empty") return null;

  return (
    <div style={{
      maxWidth: 1100,
      margin: "20px auto 0",
      padding: "0 24px",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 8,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}>
          Today’s Read
        </div>
        {state.status === "loading" && (
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            fontStyle: "italic",
          }}>
            Reading the numbers…
          </div>
        )}
        {state.status === "error" && (
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            color: "var(--warning)",
          }}>
            {state.message}
          </div>
        )}
        {state.status === "ok" && (
          <div style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--text)",
            lineHeight: 1.6,
          }}>
            {state.summary}
          </div>
        )}
      </div>
    </div>
  );
}
