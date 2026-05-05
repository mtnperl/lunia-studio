"use client";
import { useCallback, useEffect, useState } from "react";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import RefreshButton from "../dashboard/RefreshButton";
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type PnL,
  type PnLLine,
} from "@/lib/business-types";

function defaultRange(): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // Default = MTD (1st of this month → today). The spreadsheet thinks in months,
  // so the P&L should too.
  const since = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  return {
    since: since.toISOString().slice(0, 10),
    until: today.toISOString().slice(0, 10),
  };
}

function fmtUsd(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n: number, decimals = 1): string {
  return `${n >= 0 ? "" : ""}${n.toFixed(decimals)}%`;
}

export default function PnLSubview() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchPnl = useCallback(async (r: DateRange, bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/pnl?since=${r.since}&until=${r.until}${bust ? "&bust=1" : ""}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load P&L");
      } else {
        setPnl(body as PnL);
        setLastRefreshed(new Date());
      }
    } catch {
      setError("Could not reach the P&L endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPnl(range);
  }, [range, fetchPnl]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 80px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        paddingBottom: 20,
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-ui)",
            fontSize: 24,
            fontWeight: 600,
            margin: 0,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}>
            Profit &amp; Loss
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            margin: "6px 0 0",
          }}>
            Live statement composed from Shopify revenue, COGS assumptions, Meta ad spend, and SimpleFIN-categorized expenses.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <RefreshButton
            loading={loading}
            onClick={() => fetchPnl(range, true)}
            lastRefreshed={lastRefreshed ?? undefined}
          />
        </div>
      </div>

      {error && (
        <div style={{
          borderLeft: "3px solid var(--warning)",
          background: "var(--surface-r)",
          padding: "12px 16px",
          borderRadius: "0 6px 6px 0",
          fontSize: 13,
          color: "var(--warning)",
          fontFamily: "var(--font-ui)",
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {pnl && pnl.missing.length > 0 && (
        <div style={{
          borderLeft: "3px solid var(--warning)",
          background: "var(--surface-r)",
          padding: "12px 16px",
          borderRadius: "0 6px 6px 0",
          fontSize: 12,
          color: "var(--warning)",
          fontFamily: "var(--font-ui)",
          marginBottom: 24,
        }}>
          Some sources are unavailable: {pnl.missing.join(", ")}. The P&amp;L below is partial.
        </div>
      )}

      {!pnl ? (
        <div style={{ fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13 }}>
          {loading ? "Composing P&L…" : "No data yet."}
        </div>
      ) : (
        <Statement pnl={pnl} />
      )}
    </div>
  );
}

function Statement({ pnl }: { pnl: PnL }) {
  const fixedRows = (Object.entries(pnl.opex.fixedByCategory) as [ExpenseCategory, number][])
    .filter(([cat, v]) => v > 0 && cat !== "marketing" && cat !== "inventory" && cat !== "fulfilment")
    .sort((a, b) => b[1] - a[1]);

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: "8px 0",
      overflowX: "auto",
    }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
      }}>
        <thead>
          <tr>
            <Th />
            <Th align="right">Amount</Th>
            <Th align="right">vs prior</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          <SectionRow label="Revenue" />
          <Row line={pnl.revenue.gross} />
          <Row line={pnl.revenue.refunds} negative />
          <Row line={pnl.revenue.net} subtotal />

          <SectionRow label="Cost of Goods" />
          <Row line={pnl.cogs.product} negative />
          <Row line={pnl.cogs.fulfilment} negative />
          <Row line={pnl.cogs.paymentProcessing} negative />
          <Row line={pnl.cogs.total} subtotal negative />

          <Row line={pnl.grossProfit} bold trailing={`Gross margin ${pnl.grossMarginPct.toFixed(1)}%`} />

          <SectionRow label="Operating Expenses" />
          <Row line={pnl.opex.adSpend} negative />
          <Row line={pnl.opex.fixedExpenses} negative />
          {fixedRows.map(([cat, amt]) => (
            <Row
              key={cat}
              indent
              line={{ label: EXPENSE_CATEGORY_LABELS[cat], amount: amt }}
              negative
              dimmed
            />
          ))}
          <Row line={pnl.opex.total} subtotal negative />

          <Row line={pnl.contributionMargin} trailing="Gross profit − Meta ad spend" />
          <Row
            line={pnl.netIncome}
            bold
            trailing={`Net margin ${pnl.netMarginPct.toFixed(1)}%`}
          />
        </tbody>
      </table>
    </div>
  );
}

// ── row helpers ──────────────────────────────────────────────────────────

function Row({
  line, negative, subtotal, bold, indent, dimmed, trailing,
}: {
  line: PnLLine;
  negative?: boolean;
  subtotal?: boolean;
  bold?: boolean;
  indent?: boolean;
  dimmed?: boolean;
  trailing?: string;
}) {
  const sign = negative ? -1 : 1;
  const display = sign * line.amount;
  return (
    <tr style={{
      borderTop: subtotal || bold ? "1px solid var(--border)" : "none",
      background: bold ? "var(--surface-r)" : "transparent",
    }}>
      <td style={{
        padding: "8px 16px",
        paddingLeft: indent ? 36 : 16,
        color: dimmed ? "var(--muted)" : "var(--text)",
        fontWeight: bold || subtotal ? 600 : 400,
      }}>
        {line.label}
        {line.note && (
          <span style={{ marginLeft: 8, color: "var(--subtle)", fontSize: 11 }}>
            {line.note}
          </span>
        )}
      </td>
      <td style={{
        padding: "8px 16px",
        textAlign: "right",
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        color: negative && line.amount > 0 ? "var(--text)" : (display < 0 ? "var(--error)" : "var(--text)"),
        fontWeight: bold || subtotal ? 600 : 400,
      }}>
        {fmtUsd(display)}
      </td>
      <td style={{
        padding: "8px 16px",
        textAlign: "right",
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 11,
        color: deltaColor(line.delta?.pct ?? 0, negative),
        whiteSpace: "nowrap",
      }}>
        {line.delta ? deltaLabel(line.delta.pct) : "—"}
      </td>
      <td style={{
        padding: "8px 16px",
        color: "var(--subtle)",
        fontSize: 11,
        whiteSpace: "nowrap",
      }}>
        {trailing ?? ""}
      </td>
    </tr>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={4} style={{
        padding: "16px 16px 6px",
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
        borderTop: "1px solid var(--border)",
      }}>
        {label}
      </td>
    </tr>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th style={{
      padding: "6px 16px",
      textAlign: align ?? "left",
      fontWeight: 600,
      fontSize: 10,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--subtle)",
      borderBottom: "1px solid var(--border)",
    }}>
      {children}
    </th>
  );
}

function deltaLabel(pct: number): string {
  if (!Number.isFinite(pct) || pct === 0) return "—";
  const sign = pct > 0 ? "▲" : "▼";
  return `${sign} ${fmtPct(Math.abs(pct))}`;
}

function deltaColor(pct: number, negativeIsGood?: boolean): string {
  if (pct === 0) return "var(--subtle)";
  // For expense rows (negativeIsGood = true), an INCREASE is bad.
  const isPositive = negativeIsGood ? pct < 0 : pct > 0;
  return isPositive ? "var(--success)" : "var(--error)";
}
