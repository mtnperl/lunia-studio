"use client";
import type { ReactNode } from "react";
import type { PnL } from "@/lib/business-types";

type Status = "good" | "warn" | "bad";

const STATUS_COLOR: Record<Status, string> = {
  good: "var(--success)",
  warn: "var(--warning)",
  bad: "var(--error)",
};

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

type Props = {
  pnl: PnL;
  range: { since: string; until: string };
  /** Cost to acquire one customer, this range. */
  cac: number;
  /** Revenue per qualified customer over the trailing 365 days, gross of margin. */
  grossLtv: number;
  qualifiedRevenue: number;
  qualifiedCustomers: number;
  /** New qualified customers in the selected range — the CAC denominator. */
  newInRange: number;
  minOrderValue: number;
  marginPct: number;
  /** Gross LTV × margin — the gross profit one customer leaves behind. */
  contribution: number;
  monthlyContribution: number;
  ratio: number;
  ratioStatus: Status;
  payback: number;
  paybackStatus: Status;
  /** Drop the bottom margin when nothing follows the panel. */
  tightBottom?: boolean;
};

/**
 * The full worked calculation behind LTV:CAC and CAC payback — each stage with
 * the live values that produced it, so the ratios are auditable in place
 * rather than by reading the composer.
 */
export default function UnitEconomicsDerivation({
  pnl,
  range,
  cac,
  grossLtv,
  qualifiedRevenue,
  qualifiedCustomers,
  newInRange,
  minOrderValue,
  marginPct,
  contribution,
  monthlyContribution,
  ratio,
  ratioStatus,
  payback,
  paybackStatus,
  tightBottom = false,
}: Props) {
  return (
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            marginBottom: tightBottom ? 0 : 24,
          }}>
            <div style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: 4,
            }}>
              How these numbers are built
            </div>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)", margin: "0 0 18px", lineHeight: 1.5 }}>
              Every input feeding the two ratios above, in order. Values are live, not illustrative.
            </p>

            <Step n={1} title="CAC — cost to acquire one customer" note={`Meta spend and new customers are both from the selected range (${range.since} → ${range.until}).`}>
              <Row label="Meta ad spend" value={money(pnl.opex.adSpend.amount)} />
              <Row label="New qualified customers" value={newInRange.toLocaleString()} />
              <Result expr={`${money(pnl.opex.adSpend.amount)} ÷ ${newInRange.toLocaleString()}`} value={money(cac)} />
            </Step>

            <Step n={2} title="Gross LTV — revenue per customer, trailing 365 days" note={`Only orders ≥ $${minOrderValue} count. Refunded orders are excluded from revenue but the customer is still counted.`}>
              <Row label="Qualified revenue (365d)" value={money(qualifiedRevenue)} />
              <Row label="Qualified customers" value={qualifiedCustomers.toLocaleString()} />
              <Result expr={`${money(qualifiedRevenue)} ÷ ${qualifiedCustomers.toLocaleString()}`} value={money(grossLtv)} />
            </Step>

            <Step n={3} title="Gross margin — what survives COGS" note="Product cost and fulfilment come from Business → Assumptions, not supplier invoices. This margin is computed over the selected range, not the 365-day window.">
              <Row label="Gross sales" value={money(pnl.revenue.gross.amount)} />
              <Row label="Discounts" value={`− ${money(pnl.revenue.discounts.amount)}`} />
              <Row label="Returns" value={`− ${money(pnl.revenue.refunds.amount)}`} />
              <Row label="Net sales" value={money(pnl.revenue.net.amount)} strong />
              <Row label="Product cost" value={`− ${money(pnl.cogs.product.amount)}`} hint={pnl.cogs.product.note} />
              <Row label="Fulfilment" value={`− ${money(pnl.cogs.fulfilment.amount)}`} hint={pnl.cogs.fulfilment.note} />
              <Row label="Payment processing" value={`− ${money(pnl.cogs.paymentProcessing.amount)}`} hint={pnl.cogs.paymentProcessing.note} />
              <Row label="Gross profit" value={money(pnl.grossProfit.amount)} strong />
              <Result expr={`${money(pnl.grossProfit.amount)} ÷ ${money(pnl.revenue.net.amount)}`} value={`${marginPct.toFixed(1)}%`} />
            </Step>

            <Step n={4} title="Gross profit per customer">
              <Result expr={`${money(grossLtv)} gross LTV × ${marginPct.toFixed(1)}% margin`} value={money(contribution)} />
            </Step>

            <Step n={5} title="LTV:CAC — profit earned per dollar spent">
              <Result expr={`${money(contribution)} ÷ ${money(cac)}`} value={`${ratio.toFixed(2)}x`} status={ratioStatus} />
            </Step>

            <Step n={6} title="CAC payback — months to earn the acquisition cost back" note="Assumes contribution accrues evenly across the 365-day window. Real reorder behaviour is lumpier, so treat this as a floor, not a schedule." last>
              <Row label="Monthly contribution" value={`${money(contribution)} ÷ 12 = ${money(monthlyContribution)}`} />
              <Result expr={`${money(cac)} ÷ ${money(monthlyContribution)}`} value={`${payback.toFixed(1)} mo`} status={paybackStatus} />
            </Step>
          </div>
  );
}

/** One numbered stage of the derivation. */
function Step({ n, title, note, last = false, children }: {
  n: number;
  title: string;
  note?: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div style={{
      paddingBottom: last ? 0 : 18,
      marginBottom: last ? 0 : 18,
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--subtle)",
          minWidth: 14,
        }}>
          {n}
        </span>
        <span style={{
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text)",
        }}>
          {title}
        </span>
      </div>
      <div style={{ paddingLeft: 22 }}>
        {children}
        {note && (
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--subtle)",
            margin: "10px 0 0",
            lineHeight: 1.5,
          }}>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/** An input line inside a Step — label left, figure right. */
function Row({ label, value, hint, strong = false }: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
      padding: "3px 0",
    }}>
      <span style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: strong ? "var(--text)" : "var(--muted)",
        fontWeight: strong ? 600 : 400,
      }}>
        {label}
        {hint && <span style={{ color: "var(--subtle)", fontWeight: 400 }}> · {hint}</span>}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 12,
        color: strong ? "var(--text)" : "var(--muted)",
        fontWeight: strong ? 600 : 400,
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}

/** The equals-line that closes a Step. */
function Result({ expr, value, status }: {
  expr: string;
  value: string;
  status?: Status;
}) {
  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      marginTop: 8,
      paddingTop: 8,
      borderTop: "1px solid var(--border)",
    }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 12,
        color: "var(--muted)",
      }}>
        {expr}
      </span>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 15,
        fontWeight: 600,
        color: status ? STATUS_COLOR[status] : "var(--text)",
        whiteSpace: "nowrap",
      }}>
        = {value}
      </span>
    </div>
  );
}
