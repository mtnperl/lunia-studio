"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import RefreshButton from "../dashboard/RefreshButton";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type Categorization,
  type ExpenseCategory,
  type SimpleFinAccount,
  type SimpleFinTxn,
} from "@/lib/business-types";
import type { RecurringExpense } from "@/lib/recurring-detector";

type FetchResult = {
  accounts: SimpleFinAccount[];
  transactions: SimpleFinTxn[];
  errlist: Array<{ severity?: string; description?: string }>;
};

// Stable color mapping per category so the donut and the per-row pills agree.
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  saas:          "#3b82f6",
  inventory:     "#8b5cf6",
  packaging:     "#7c3aed",
  "lab-testing": "#0ea5e9",
  fulfilment:    "#06b6d4",
  payroll:       "#10b981",
  marketing:     "#f59e0b",
  influencer:    "#ef4444",
  content:       "#d946ef",
  events:        "#f97316",
  office:        "#a855f7",
  travel:        "#ec4899",
  professional:  "#14b8a6",
  other:         "#6b7280",
  uncategorized: "#9ca3af",
};

function defaultRange(): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today.getTime() - 29 * 86_400_000);
  return {
    since: since.toISOString().slice(0, 10),
    until: today.toISOString().slice(0, 10),
  };
}

function fmtUsd(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function CashExpensesSubview() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [data, setData] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [categorizations, setCategorizations] = useState<Map<string, Categorization>>(new Map());
  const [categorizing, setCategorizing] = useState(false);
  const [recurring, setRecurring] = useState<{ recurring: RecurringExpense[]; monthlyTotal: number } | null>(null);

  const fetchData = useCallback(async (r: DateRange, bust = false) => {
    setLoading(true);
    setError(null);
    setSetupHint(null);
    try {
      const res = await fetch(`/api/simplefin?since=${r.since}&until=${r.until}${bust ? "&bust=1" : ""}`);
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 503 && body.setup) setSetupHint(body.setup);
        setError(body.error ?? "Could not load bank data");
        setData(null);
        setCategorizations(new Map());
      } else {
        setData(body as FetchResult);
        setLastRefreshed(new Date());
      }
    } catch {
      setError("Could not reach the SimpleFIN endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategorizations = useCallback(async (txns: SimpleFinTxn[], force = false) => {
    if (txns.length === 0) {
      setCategorizations(new Map());
      return;
    }
    setCategorizing(true);
    try {
      const res = await fetch("/api/simplefin/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: txns.map((t) => ({
            id: t.id,
            amount: t.amount,
            description: t.description,
            payee: t.payee,
            memo: t.memo,
          })),
          forceRefresh: force,
        }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as { categorizations: Categorization[] };
      const map = new Map<string, Categorization>();
      for (const c of body.categorizations) map.set(c.txnId, c);
      setCategorizations(map);
    } catch (err) {
      console.warn("[CashExpensesSubview] categorization failed", err);
    } finally {
      setCategorizing(false);
    }
  }, []);

  const overrideCategory = useCallback(async (txnId: string, category: ExpenseCategory) => {
    // Optimistic update.
    setCategorizations((prev) => {
      const next = new Map(prev);
      const existing = next.get(txnId);
      next.set(txnId, {
        txnId,
        category,
        confidence: 1,
        reasoning: existing?.reasoning ?? "Manual override.",
        override: true,
      });
      return next;
    });
    try {
      await fetch("/api/simplefin/categorize", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId, category }),
      });
    } catch (err) {
      console.warn("[CashExpensesSubview] override failed", err);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  useEffect(() => {
    if (data) fetchCategorizations(data.transactions);
  }, [data, fetchCategorizations]);

  // Recurring detection runs server-side over a 180d window — independent of
  // the visible date range. Refetch only on mount and on explicit refresh.
  const fetchRecurring = useCallback(async (bust = false) => {
    try {
      const res = await fetch(`/api/business/recurring${bust ? "?bust=1" : ""}`);
      if (!res.ok) return;
      const body = await res.json();
      setRecurring({
        recurring: (body.recurring ?? []) as RecurringExpense[],
        monthlyTotal: body.monthlyTotal ?? 0,
      });
    } catch (err) {
      console.warn("[CashExpensesSubview] recurring fetch failed", err);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  // Split positive balances (cash on hand) from negative balances (owed on credit
  // cards / lines of credit). Net position is the sum — what actually matters
  // for runway, but the components are what you act on.
  const cashOnHand = data
    ? data.accounts.filter((a) => a.balance >= 0).reduce((s, a) => s + a.balance, 0)
    : 0;
  const owed = data
    ? Math.abs(data.accounts.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0))
    : 0;
  const netPosition = cashOnHand - owed;
  const hasCredit = data?.accounts.some((a) => a.balance < 0) ?? false;

  // Money OUT of the account = negative amounts. Show as positive in "spent".
  const spent = data
    ? data.transactions
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
    : 0;

  // Per-category spend (money out only).
  const byCategory = useMemo(() => {
    const m = new Map<ExpenseCategory, { total: number; count: number }>();
    if (!data) return m;
    for (const t of data.transactions) {
      if (t.amount >= 0) continue;
      const cat = categorizations.get(t.id)?.category ?? "uncategorized";
      const existing = m.get(cat) ?? { total: 0, count: 0 };
      existing.total += Math.abs(t.amount);
      existing.count += 1;
      m.set(cat, existing);
    }
    return m;
  }, [data, categorizations]);

  const donutData = useMemo(
    () =>
      Array.from(byCategory.entries())
        .filter(([, v]) => v.total > 0)
        .map(([cat, v]) => ({ name: EXPENSE_CATEGORY_LABELS[cat], category: cat, value: v.total, count: v.count }))
        .sort((a, b) => b.value - a.value),
    [byCategory]
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px" }}>
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
            Cash &amp; Expenses
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            margin: "6px 0 0",
          }}>
            Live bank balances and transactions via SimpleFIN. AI categorization lands in Phase 4.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <RefreshButton
            loading={loading}
            onClick={() => fetchData(range, true)}
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
          {setupHint && (
            <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
              {setupHint}
            </div>
          )}
        </div>
      )}

      {data && data.errlist.length > 0 && (
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
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Bank connection warnings</div>
          {data.errlist.map((e, i) => (
            <div key={i}>{e.description ?? "Unknown error"}</div>
          ))}
        </div>
      )}

      {/* ── 1. Position: how much cash do we have, what do we owe ───────── */}
      <SectionLabel title="Position" subtitle="What we have, what we owe, what moved out this period." />
      <div className="kpi-grid" style={{
        display: "grid",
        gridTemplateColumns: hasCredit ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 32,
      }}>
        <SimpleStat label="Cash on Hand" value={fmtUsd(cashOnHand, 0)} loading={loading && !data} />
        {hasCredit && (
          <SimpleStat label="Owed (Credit)" value={fmtUsd(owed, 0)} loading={loading && !data} negative />
        )}
        <SimpleStat
          label="Net Position"
          value={fmtUsd(netPosition, 0)}
          loading={loading && !data}
          negative={netPosition < 0}
        />
        <SimpleStat label="Money Out (period)" value={fmtUsd(spent, 0)} loading={loading && !data} />
      </div>

      <style>{`
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .acct-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── 2. Recurring: answers "what are my operating expenses?" ─────── */}
      {recurring && recurring.recurring.length > 0 && (
        <>
          <SectionLabel
            title="Recurring Operating Expenses"
            subtitle="Subscriptions, payroll, and anything else with a regular cadence — your locked-in monthly cost base."
          />
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            marginBottom: 32,
          }}>
            <SectionHeader
              title={`${recurring.recurring.length} vendors`}
              trailing={`Monthly run-rate ${fmtUsd(recurring.monthlyTotal, 0)} · Annualized ${fmtUsd(recurring.monthlyTotal * 12, 0)}`}
            />
            <RecurringTable items={recurring.recurring} />
          </div>
        </>
      )}

      {/* ── 3. Expense breakdown: what we spent on, this period ─────────── */}
      {data && donutData.length > 0 && (
        <>
          <SectionLabel
            title="Spending Breakdown"
            subtitle="Where your bank-side outflows landed this period. Click any category in the table below to override."
          />
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20,
            marginBottom: 32,
          }}>
            <SectionHeader title={`Expense Categories${categorizing ? " · categorizing…" : ""}`} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 1.2fr", gap: 24, alignItems: "center" }}>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {donutData.map((d) => (
                      <Cell key={d.category} fill={CATEGORY_COLORS[d.category]} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(value) => fmtUsd(typeof value === "number" ? value : Number(value) || 0, 0)}
                    contentStyle={{
                      background: "var(--surface-r)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontFamily: "var(--font-ui)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {donutData.map((d) => {
                const pct = spent > 0 ? (d.value / spent) * 100 : 0;
                return (
                  <div
                    key={d.category}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "12px 1fr auto auto",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 13,
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: CATEGORY_COLORS[d.category],
                    }} />
                    <span style={{ color: "var(--text)" }}>{d.name}</span>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>{d.count} txn</span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text)",
                      fontWeight: 500,
                      minWidth: 100,
                      textAlign: "right",
                    }}>
                      {fmtUsd(d.value, 0)}{" "}
                      <span style={{ color: "var(--subtle)", fontWeight: 400, fontSize: 11 }}>
                        {pct.toFixed(0)}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </>
      )}

      {/* ── 4. Accounts: where the cash sits — compact row ──────────────── */}
      {data && data.accounts.length > 0 && (
        <>
          <SectionLabel title="Accounts" subtitle="Connected via SimpleFIN — read-only balance + transaction stream." />
          <div className="acct-row" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 32,
          }}>
            {data.accounts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--text)",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {a.name}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--subtle)",
                    marginTop: 2,
                  }}>
                    {a.org.name}
                  </div>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 18,
                  color: a.balance < 0 ? "var(--error)" : "var(--text)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {fmtUsd(a.balance)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 5. Transactions: drilldown ──────────────────────────────────── */}
      <SectionLabel title="Transactions" subtitle="Every outflow and deposit. Click any category pill to override the AI's call." />
      {/* Transactions */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
      }}>
        <SectionHeader title={`Transactions (${data?.transactions.length ?? 0})`} />
        {!data ? (
          <div style={{ fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13 }}>
            {loading ? "Loading…" : "—"}
          </div>
        ) : data.transactions.length === 0 ? (
          <div style={{ fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13 }}>
            No transactions in this period.
          </div>
        ) : (
          <TxnTable
            transactions={data.transactions}
            accounts={data.accounts}
            categorizations={categorizations}
            onOverride={overrideCategory}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Top-level section label — sits above a card and tells the user what
 * question this block answers. Helps the page scan as: Position → Recurring
 * OpEx → Spending → Accounts → Transactions.
 */
function SectionLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h2 style={{
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        fontWeight: 600,
        color: "var(--text)",
        margin: 0,
        letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--muted)",
          margin: "4px 0 0",
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: "1px solid var(--border)",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <span style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
      }}>
        {title}
      </span>
      {trailing && (
        <span style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--subtle)",
        }}>
          {trailing}
        </span>
      )}
    </div>
  );
}

const FLAG_ORDER: Record<NonNullable<RecurringExpense["flag"]> | "unflagged", number> = {
  cuttable: 0,
  review: 1,
  essential: 2,
  unflagged: 3,
};

const FLAG_STYLE: Record<NonNullable<RecurringExpense["flag"]>, { bg: string; border: string; color: string; label: string }> = {
  cuttable:  { bg: "rgba(220, 38, 38, 0.10)",  border: "var(--error)",   color: "var(--error)",   label: "CUT?" },
  review:    { bg: "rgba(245, 158, 11, 0.10)", border: "var(--warning)", color: "var(--warning)", label: "REVIEW" },
  essential: { bg: "rgba(16, 185, 129, 0.10)", border: "var(--success)", color: "var(--success)", label: "ESSENTIAL" },
};

function RecurringTable({ items }: { items: RecurringExpense[] }) {
  // Sort: cuttable first (so it grabs the eye), then review, then essential.
  const sorted = [...items].sort((a, b) => {
    const aRank = FLAG_ORDER[a.flag ?? "unflagged"];
    const bRank = FLAG_ORDER[b.flag ?? "unflagged"];
    if (aRank !== bRank) return aRank - bRank;
    return b.monthlyImpact - a.monthlyImpact;
  });

  const cuttableMonthly = sorted
    .filter((r) => r.flag === "cuttable")
    .reduce((s, r) => s + r.monthlyImpact, 0);

  return (
    <>
      {cuttableMonthly > 0 && (
        <div style={{
          marginBottom: 12,
          padding: "8px 12px",
          borderLeft: "3px solid var(--error)",
          background: "rgba(220, 38, 38, 0.06)",
          borderRadius: "0 6px 6px 0",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--text)",
        }}>
          <strong style={{ color: "var(--error)" }}>{fmtUsd(cuttableMonthly, 0)}/mo</strong>
          {" "}flagged as candidates to cut · {fmtUsd(cuttableMonthly * 12, 0)} annualized
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
        }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>Vendor</Th>
              <Th>Flag</Th>
              <Th>Category</Th>
              <Th>Cadence</Th>
              <Th align="right">Avg</Th>
              <Th align="right">Monthly</Th>
              <Th align="right">Annualized</Th>
              <Th align="right">Last seen</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const color = CATEGORY_COLORS[r.category];
              const flag = r.flag;
              const flagStyle = flag ? FLAG_STYLE[flag] : null;
              return (
                <tr key={r.payeeKey} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{r.payeeLabel}</span>
                    <span style={{ display: "block", color: "var(--subtle)", fontSize: 11, marginTop: 2 }}>
                      {r.occurrences} charges · stability {(r.amountStability * 100).toFixed(0)}%
                    </span>
                  </Td>
                  <Td>
                    {flagStyle ? (
                      <span
                        title={r.flagReason ?? ""}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: `1px solid ${flagStyle.border}`,
                          background: flagStyle.bg,
                          color: flagStyle.color,
                          fontFamily: "var(--font-ui)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {flagStyle.label}
                      </span>
                    ) : (
                      <span style={{ color: "var(--subtle)", fontSize: 11 }}>—</span>
                    )}
                    {r.flagReason && (
                      <span style={{
                        display: "block",
                        color: "var(--subtle)",
                        fontSize: 11,
                        marginTop: 4,
                        maxWidth: 280,
                        lineHeight: 1.4,
                      }}>
                        {r.flagReason}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: `1px solid ${color}`,
                      background: `${color}1a`,
                      color,
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}>
                      {EXPENSE_CATEGORY_LABELS[r.category]}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: "var(--muted)", fontSize: 12, textTransform: "capitalize" }}>
                      {r.cadence}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text)",
                    }}>
                      {fmtUsd(r.avgAmount)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--text)",
                      fontWeight: 500,
                    }}>
                      {fmtUsd(r.monthlyImpact)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--muted)",
                    }}>
                      {fmtUsd(r.monthlyImpact * 12, 0)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--muted)",
                      fontSize: 12,
                    }}>
                      {fmtDate(r.lastSeen)}
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SimpleStat({
  label, value, loading, negative,
}: {
  label: string;
  value: string;
  loading: boolean;
  negative?: boolean;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--subtle)",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 22,
        color: negative ? "var(--error)" : "var(--text)",
        fontWeight: 600,
        opacity: loading ? 0.4 : 1,
      }}>
        {loading ? "…" : value}
      </div>
    </div>
  );
}

function TxnTable({
  transactions,
  accounts,
  categorizations,
  onOverride,
}: {
  transactions: SimpleFinTxn[];
  accounts: SimpleFinAccount[];
  categorizations: Map<string, Categorization>;
  onOverride: (txnId: string, category: ExpenseCategory) => void;
}) {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const sorted = [...transactions].sort((a, b) => b.posted - a.posted);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
      }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <Th>Date</Th>
            <Th>Account</Th>
            <Th>Description</Th>
            <Th>Category</Th>
            <Th align="right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const account = accountMap.get(t.accountId);
            const isOutflow = t.amount < 0;
            const cat = categorizations.get(t.id);
            return (
              <tr key={`${t.accountId}:${t.id}`} style={{ borderTop: "1px solid var(--border)" }}>
                <Td>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {fmtDate(t.posted)}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    {account?.org.name ?? "—"}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: "var(--text)" }}>
                    {t.payee ?? t.description}
                  </span>
                  {t.memo && (
                    <span style={{ display: "block", color: "var(--subtle)", fontSize: 11, marginTop: 2 }}>
                      {t.memo}
                    </span>
                  )}
                </Td>
                <Td>
                  {isOutflow ? (
                    <CategoryPill
                      categorization={cat}
                      onChange={(next) => onOverride(t.id, next)}
                    />
                  ) : (
                    <span style={{ color: "var(--subtle)", fontSize: 11 }}>—</span>
                  )}
                </Td>
                <Td align="right">
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontVariantNumeric: "tabular-nums",
                    color: isOutflow ? "var(--text)" : "var(--success)",
                    fontWeight: 500,
                  }}>
                    {fmtUsd(t.amount)}
                  </span>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CategoryPill({
  categorization,
  onChange,
}: {
  categorization: Categorization | undefined;
  onChange: (cat: ExpenseCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Position the popover under the trigger using fixed positioning so it
  // escapes any parent overflow:hidden.
  useEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const POP_WIDTH = 240;
      const VIEWPORT_PAD = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      if (left + POP_WIDTH > vw - VIEWPORT_PAD) left = vw - POP_WIDTH - VIEWPORT_PAD;
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      let top = rect.bottom + 4;
      // If the popover would clip the viewport bottom, flip above the trigger.
      const POP_HEIGHT_ESTIMATE = Math.min(EXPENSE_CATEGORIES.length * 32 + 16, vh - 40);
      if (top + POP_HEIGHT_ESTIMATE > vh - VIEWPORT_PAD) {
        top = Math.max(VIEWPORT_PAD, rect.top - POP_HEIGHT_ESTIMATE - 4);
      }
      setPos({ top, left });
    }
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  if (!categorization) {
    return (
      <span style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        color: "var(--subtle)",
      }}>
        …
      </span>
    );
  }

  const color = CATEGORY_COLORS[categorization.category];
  const isLow = categorization.confidence < 0.6;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${(categorization.confidence * 100).toFixed(0)}% confidence — ${categorization.reasoning} · click to change`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          borderRadius: 999,
          border: `1px solid ${color}`,
          background: `${color}1a`,
          color: color,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        {EXPENSE_CATEGORY_LABELS[categorization.category]}
        <span aria-hidden style={{ fontSize: 9 }}>▾</span>
      </button>

      {isLow && !categorization.override && (
        <span title="Low confidence — review the suggestion" style={{
          fontSize: 10,
          color: "var(--warning)",
          fontWeight: 600,
        }}>
          ?
        </span>
      )}
      {categorization.override && (
        <span title="Manually set" style={{ fontSize: 10, color: "var(--subtle)" }}>
          ✓
        </span>
      )}

      {open && pos && (
        <div
          ref={popoverRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 240,
            zIndex: 1000,
            background: "var(--surface-r)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 6,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.18)",
            maxHeight: "min(70vh, 520px)",
            overflowY: "auto",
            fontFamily: "var(--font-ui)",
          }}
        >
          {EXPENSE_CATEGORIES.map((c) => {
            const itemColor = CATEGORY_COLORS[c];
            const active = c === categorization.category;
            return (
              <button
                key={c}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: active ? "var(--accent-dim)" : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  color: "var(--text)",
                  fontWeight: active ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-h)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <span style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: itemColor,
                  flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>{EXPENSE_CATEGORY_LABELS[c]}</span>
                {active && (
                  <span aria-hidden style={{ color: "var(--accent)", fontSize: 11 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th style={{
      padding: "8px 12px",
      textAlign: align ?? "left",
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--subtle)",
      borderBottom: "1px solid var(--border)",
    }}>
      {children}
    </th>
  );
}
function Td({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <td style={{
      padding: "10px 12px",
      textAlign: align ?? "left",
      verticalAlign: "top",
    }}>
      {children}
    </td>
  );
}
