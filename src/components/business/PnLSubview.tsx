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

type ViewMode = "period" | "monthly" | "quarterly";

type MonthlyResponse = {
  months: Array<{ label: string; range: { since: string; until: string }; pnl: PnL }>;
  totals: PnL;
};

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
  return `${n.toFixed(decimals)}%`;
}

export default function PnLSubview() {
  const [mode, setMode] = useState<ViewMode>("period");
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [monthly, setMonthly] = useState<MonthlyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchPeriod = useCallback(async (r: DateRange, bust = false) => {
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

  const fetchMonthly = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/business/pnl-monthly${bust ? "?bust=1" : ""}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load monthly P&L");
      } else {
        setMonthly(body as MonthlyResponse);
        setLastRefreshed(new Date());
      }
    } catch {
      setError("Could not reach the monthly P&L endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "period") fetchPeriod(range);
    else fetchMonthly();
  }, [mode, range, fetchPeriod, fetchMonthly]);

  const headerTrailing = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <ModeToggle mode={mode} onChange={setMode} />
      {mode === "period" && <DateRangePicker value={range} onChange={setRange} />}
      <RefreshButton
        loading={loading}
        onClick={() => (mode === "period" ? fetchPeriod(range, true) : fetchMonthly(true))}
        lastRefreshed={lastRefreshed ?? undefined}
      />
    </div>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px 80px" }}>
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
        {headerTrailing}
      </div>

      {error && (
        <Banner kind="warning">{error}</Banner>
      )}

      {mode === "period" && (
        <PeriodView pnl={pnl} loading={loading} />
      )}

      {mode === "monthly" && (
        <MatrixView monthly={monthly} loading={loading} grouping="monthly" />
      )}

      {mode === "quarterly" && (
        <MatrixView monthly={monthly} loading={loading} grouping="quarterly" />
      )}
    </div>
  );
}

// ── Mode toggle ──────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const items: Array<{ key: ViewMode; label: string }> = [
    { key: "period", label: "Period" },
    { key: "monthly", label: "Last 12 Months" },
    { key: "quarterly", label: "Quarterly" },
  ];
  return (
    <div style={{
      display: "inline-flex",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: 2,
      background: "var(--surface-r)",
    }}>
      {items.map((item) => {
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: "5px 12px",
              borderRadius: 4,
              border: "none",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--muted)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "background 120ms ease",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Period view ──────────────────────────────────────────────────────────

function PeriodView({ pnl, loading }: { pnl: PnL | null; loading: boolean }) {
  if (!pnl && loading) {
    return <Loading text="Composing P&L…" />;
  }
  if (!pnl) {
    return <Loading text="No data yet." />;
  }

  return (
    <>
      {pnl.missing.length > 0 && (
        <Banner kind="warning">
          Some sources are unavailable: {pnl.missing.join(", ")}. The P&amp;L below is partial.
        </Banner>
      )}

      <HeadlineTiles pnl={pnl} />
      {pnl.opex.recurringMonthlyRunRate > 0 && (
        <RecurringBand monthly={pnl.opex.recurringMonthlyRunRate} />
      )}
      <PeriodStatement pnl={pnl} />
    </>
  );
}

function HeadlineTiles({ pnl }: { pnl: PnL }) {
  const tiles = [
    { label: "Net Revenue",   value: pnl.revenue.net.amount,         delta: pnl.revenue.net.delta },
    { label: "Gross Profit",  value: pnl.grossProfit.amount,         delta: pnl.grossProfit.delta, sub: `${pnl.grossMarginPct.toFixed(1)}% margin` },
    { label: "Net Income",    value: pnl.netIncome.amount,           delta: pnl.netIncome.delta,   sub: `${pnl.netMarginPct.toFixed(1)}% margin` },
  ];
  return (
    <>
      <style>{`
        @media (max-width: 700px) {
          .pnl-headline-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="pnl-headline-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 16,
      }}>
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 18,
            }}
          >
            <div style={{
              fontFamily: "var(--font-ui)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--subtle)",
              marginBottom: 8,
            }}>
              {t.label}
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              fontSize: 28,
              fontWeight: 600,
              color: t.value < 0 ? "var(--error)" : "var(--text)",
            }}>
              {fmtUsd(t.value)}
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--muted)",
            }}>
              {t.delta && (
                <span style={{ color: deltaColor(t.delta.pct, false) }}>
                  {deltaLabel(t.delta.pct)} vs prior
                </span>
              )}
              {t.sub && <span style={{ color: "var(--subtle)" }}>· {t.sub}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RecurringBand({ monthly }: { monthly: number }) {
  return (
    <div style={{
      background: "var(--accent-dim)",
      border: "1px solid var(--accent-mid)",
      borderRadius: 8,
      padding: "10px 16px",
      marginBottom: 16,
      display: "flex",
      gap: 24,
      alignItems: "baseline",
      flexWrap: "wrap",
      fontFamily: "var(--font-ui)",
      fontSize: 12,
    }}>
      <span style={{
        fontWeight: 600,
        color: "var(--accent)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        fontSize: 10,
      }}>
        Recurring run-rate
      </span>
      <span style={{ color: "var(--text)" }}>
        Monthly: <strong style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{fmtUsd(monthly)}</strong>
      </span>
      <span style={{ color: "var(--muted)" }}>
        Annualized: <strong style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>{fmtUsd(monthly * 12)}</strong>
      </span>
    </div>
  );
}

function PeriodStatement({ pnl }: { pnl: PnL }) {
  const fixedRows = (Object.entries(pnl.opex.fixedByCategory) as [ExpenseCategory, number][])
    .filter(([cat, v]) => v > 0 && cat !== "marketing" && cat !== "inventory" && cat !== "fulfilment")
    .sort((a, b) => b[1] - a[1]);

  const recurringSplit = pnl.opex.recurringFixed.amount > 0 || pnl.opex.variableOpex.amount > 0;

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
          <Row line={pnl.revenue.discounts} negative />
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
          {recurringSplit ? (
            <>
              <Row line={pnl.opex.recurringFixed} negative />
              <Row line={pnl.opex.variableOpex} negative />
            </>
          ) : (
            <Row line={pnl.opex.fixedExpenses} negative />
          )}
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

// ── Matrix view (monthly + quarterly) ────────────────────────────────────

type MatrixGrouping = "monthly" | "quarterly";

function MatrixView({ monthly, loading, grouping }: {
  monthly: MonthlyResponse | null;
  loading: boolean;
  grouping: MatrixGrouping;
}) {
  if (!monthly && loading) return <Loading text="Composing 12-month P&L…" />;
  if (!monthly) return <Loading text="No data yet." />;

  const cols = grouping === "monthly"
    ? monthly.months.map((m) => ({ label: m.label, pnl: m.pnl }))
    : groupByQuarter(monthly.months);

  return <Matrix cols={cols} totals={monthly.totals} />;
}

type MatrixCol = { label: string; pnl: PnL };

function groupByQuarter(months: MonthlyResponse["months"]): MatrixCol[] {
  // Group consecutive months in 3s, label by the first month's quarter ("Q1 2026").
  const out: MatrixCol[] = [];
  for (let i = 0; i < months.length; i += 3) {
    const chunk = months.slice(i, i + 3);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const d = new Date(`${first.range.since}T00:00:00Z`);
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    const label = `Q${q} ${d.getUTCFullYear()}`;
    out.push({ label, pnl: sumPnls(chunk.map((m) => m.pnl)) });
  }
  return out;
}

/**
 * Reduce a list of monthly PnLs into a single roll-up. Sums each line; recomputes
 * derived percentages. We don't bother to recompute unit economics here since
 * those are exposed elsewhere.
 */
function sumPnls(list: PnL[]): PnL {
  const first = list[0];
  const sumLine = (key: (p: PnL) => PnLLine): PnLLine => {
    const total = list.reduce((s, p) => s + key(p).amount, 0);
    return { label: key(first).label, amount: total };
  };
  const grossRevenue = list.reduce((s, p) => s + p.revenue.gross.amount, 0);
  const discounts = list.reduce((s, p) => s + p.revenue.discounts.amount, 0);
  const refunds = list.reduce((s, p) => s + p.revenue.refunds.amount, 0);
  const netRevenue = list.reduce((s, p) => s + p.revenue.net.amount, 0);
  const cogsTotal = list.reduce((s, p) => s + p.cogs.total.amount, 0);
  const grossProfit = list.reduce((s, p) => s + p.grossProfit.amount, 0);
  const adSpend = list.reduce((s, p) => s + p.opex.adSpend.amount, 0);
  const fixedExpenses = list.reduce((s, p) => s + p.opex.fixedExpenses.amount, 0);
  const recurringFixed = list.reduce((s, p) => s + p.opex.recurringFixed.amount, 0);
  const variableOpex = list.reduce((s, p) => s + p.opex.variableOpex.amount, 0);
  const opexTotal = list.reduce((s, p) => s + p.opex.total.amount, 0);
  const contributionMargin = list.reduce((s, p) => s + p.contributionMargin.amount, 0);
  const netIncome = list.reduce((s, p) => s + p.netIncome.amount, 0);

  return {
    range: { since: list[0].range.since, until: list[list.length - 1].range.until },
    revenue: {
      gross:     { label: "Gross sales", amount: grossRevenue },
      discounts: { label: "Discounts",   amount: discounts },
      refunds:   { label: "Returns",     amount: refunds },
      net:       { label: "Net sales",   amount: netRevenue },
    },
    cogs: {
      product:           sumLine((p) => p.cogs.product),
      fulfilment:        sumLine((p) => p.cogs.fulfilment),
      paymentProcessing: sumLine((p) => p.cogs.paymentProcessing),
      total:             { label: "Total COGS", amount: cogsTotal },
    },
    grossProfit:    { label: "Gross profit", amount: grossProfit },
    grossMarginPct: netRevenue === 0 ? 0 : (grossProfit / netRevenue) * 100,
    opex: {
      adSpend:        { label: "Ad spend (Meta)", amount: adSpend },
      fixedExpenses:  { label: "Fixed expenses", amount: fixedExpenses },
      recurringFixed: { label: "Recurring fixed", amount: recurringFixed },
      variableOpex:   { label: "Variable / one-off", amount: variableOpex },
      fixedByCategory: first.opex.fixedByCategory, // not aggregated — only used in Period view
      total:          { label: "Total OpEx", amount: opexTotal },
      recurringMonthlyRunRate: first.opex.recurringMonthlyRunRate,
    },
    contributionMargin: { label: "Contribution margin", amount: contributionMargin },
    netIncome:          { label: "Net income", amount: netIncome },
    netMarginPct:       netRevenue === 0 ? 0 : (netIncome / netRevenue) * 100,
    unitEconomics:      first.unitEconomics,
    missing:            Array.from(new Set(list.flatMap((p) => p.missing))),
  };
}

function Matrix({ cols, totals }: { cols: MatrixCol[]; totals: PnL }) {
  // Definition of every row drawn in the matrix. `kind` controls visual weight.
  type RowDef = {
    label: string;
    kind: "section" | "line" | "subtotal" | "bold" | "indent" | "ratio";
    pick: (pnl: PnL) => number;
    note?: string;
  };

  const rows: RowDef[] = [
    { label: "Revenue", kind: "section", pick: () => 0 },
    { label: "Gross sales",              kind: "line",     pick: (p) => p.revenue.gross.amount },
    { label: "Discounts",                kind: "line",     pick: (p) => -p.revenue.discounts.amount },
    { label: "Returns",                  kind: "line",     pick: (p) => -p.revenue.refunds.amount },
    { label: "Net sales",                kind: "subtotal", pick: (p) => p.revenue.net.amount },

    { label: "Cost of Goods", kind: "section", pick: () => 0 },
    { label: "Product cost",             kind: "line",     pick: (p) => -p.cogs.product.amount },
    { label: "Fulfilment",               kind: "line",     pick: (p) => -p.cogs.fulfilment.amount },
    { label: "Payment processing",       kind: "line",     pick: (p) => -p.cogs.paymentProcessing.amount },
    { label: "Total COGS",               kind: "subtotal", pick: (p) => -p.cogs.total.amount },

    { label: "Gross profit",             kind: "bold",     pick: (p) => p.grossProfit.amount },
    { label: "Gross margin %",           kind: "ratio",    pick: (p) => p.grossMarginPct },

    { label: "Operating Expenses", kind: "section", pick: () => 0 },
    { label: "Ad spend (Meta)",          kind: "line",     pick: (p) => -p.opex.adSpend.amount },
    { label: "Recurring fixed",          kind: "line",     pick: (p) => -p.opex.recurringFixed.amount },
    { label: "Variable / one-off",       kind: "line",     pick: (p) => -p.opex.variableOpex.amount },
    { label: "Total OpEx",               kind: "subtotal", pick: (p) => -p.opex.total.amount },

    { label: "Net income",               kind: "bold",     pick: (p) => p.netIncome.amount },
    { label: "Net margin %",             kind: "ratio",    pick: (p) => p.netMarginPct },
  ];

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflowX: "auto",
      maxWidth: "100%",
    }}>
      <table style={{
        borderCollapse: "collapse",
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        width: "max-content",
        minWidth: "100%",
      }}>
        <thead>
          <tr>
            <th style={{ ...stickyHeaderCell, position: "sticky", left: 0, zIndex: 2 }}>&nbsp;</th>
            {cols.map((c) => (
              <th key={c.label} style={stickyHeaderCell}>{c.label}</th>
            ))}
            <th style={{ ...stickyHeaderCell, background: "var(--surface-r)" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            if (r.kind === "section") {
              return (
                <tr key={idx}>
                  <td colSpan={cols.length + 2} style={{
                    padding: "16px 16px 6px",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    borderTop: "1px solid var(--border)",
                    background: "var(--surface)",
                    position: "sticky",
                    left: 0,
                  }}>
                    {r.label}
                  </td>
                </tr>
              );
            }
            const isRatio = r.kind === "ratio";
            const isBold = r.kind === "bold";
            const isSubtotal = r.kind === "subtotal";

            const labelCell: React.CSSProperties = {
              padding: "8px 16px",
              position: "sticky",
              left: 0,
              background: isBold ? "var(--surface-r)" : "var(--surface)",
              borderTop: isBold || isSubtotal ? "1px solid var(--border)" : "none",
              fontWeight: isBold || isSubtotal ? 600 : 400,
              color: isRatio ? "var(--muted)" : "var(--text)",
              minWidth: 220,
              zIndex: 1,
            };

            const numCellBase: React.CSSProperties = {
              padding: "8px 12px",
              textAlign: "right",
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
              borderTop: isBold || isSubtotal ? "1px solid var(--border)" : "none",
              fontWeight: isBold || isSubtotal ? 600 : 400,
              background: isBold ? "var(--surface-r)" : "transparent",
              whiteSpace: "nowrap",
              minWidth: 96,
            };

            const totalsCell: React.CSSProperties = {
              ...numCellBase,
              background: "var(--surface-r)",
              fontWeight: 600,
              borderLeft: "1px solid var(--border)",
            };

            return (
              <tr key={idx}>
                <td style={labelCell}>{r.label}</td>
                {cols.map((c) => {
                  const v = r.pick(c.pnl);
                  return (
                    <td key={c.label} style={{
                      ...numCellBase,
                      color: isRatio
                        ? "var(--muted)"
                        : (v < 0 ? "var(--error)" : "var(--text)"),
                    }}>
                      {isRatio ? fmtPct(v) : (v === 0 ? "—" : fmtUsd(v))}
                    </td>
                  );
                })}
                <td style={{
                  ...totalsCell,
                  color: isRatio
                    ? "var(--muted)"
                    : (r.pick(totals) < 0 ? "var(--error)" : "var(--text)"),
                }}>
                  {isRatio ? fmtPct(r.pick(totals)) : (r.pick(totals) === 0 ? "—" : fmtUsd(r.pick(totals)))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const stickyHeaderCell: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "right",
  position: "sticky",
  top: 0,
  background: "var(--surface)",
  borderBottom: "1px solid var(--border)",
  fontFamily: "var(--font-ui)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  minWidth: 96,
};

// ── Period statement row helpers ─────────────────────────────────────────

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

// ── Misc UI ──────────────────────────────────────────────────────────────

function Loading({ text }: { text: string }) {
  return (
    <div style={{ fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13, padding: "20px 0" }}>
      {text}
    </div>
  );
}

function Banner({ kind, children }: { kind: "warning"; children: React.ReactNode }) {
  void kind;
  return (
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
      {children}
    </div>
  );
}

