"use client";
import { useCallback, useEffect, useState } from "react";
import DateRangePicker, { type DateRange } from "../dashboard/DateRangePicker";
import RefreshButton from "../dashboard/RefreshButton";
import type { SimpleFinAccount, SimpleFinTxn } from "@/lib/business-types";

type FetchResult = {
  accounts: SimpleFinAccount[];
  transactions: SimpleFinTxn[];
  errlist: Array<{ severity?: string; description?: string }>;
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

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const totalCash = data
    ? data.accounts.reduce((s, a) => s + (a.balance || 0), 0)
    : 0;

  // Money OUT of the account = negative amounts. Show as positive in "spent".
  const spent = data
    ? data.transactions
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0)
    : 0;

  const incoming = data
    ? data.transactions
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0)
    : 0;

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

      {/* Top totals */}
      <div className="kpi-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <SimpleStat label="Total Cash" value={fmtUsd(totalCash, 0)} loading={loading && !data} />
        <SimpleStat label="Money In (period)" value={fmtUsd(incoming, 0)} loading={loading && !data} />
        <SimpleStat label="Money Out (period)" value={fmtUsd(spent, 0)} loading={loading && !data} />
      </div>

      <style>{`
        @media (max-width: 700px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .acct-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Per-account balances */}
      {data && data.accounts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHeader title="Accounts" />
          <div className="acct-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 12,
          }}>
            {data.accounts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  color: "var(--subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 6,
                }}>
                  {a.org.name}
                </div>
                <div style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  color: "var(--text)",
                  fontWeight: 500,
                  marginBottom: 8,
                }}>
                  {a.name}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 22,
                  color: a.balance < 0 ? "var(--error)" : "var(--text)",
                  fontWeight: 600,
                }}>
                  {fmtUsd(a.balance)}
                </div>
                {a.availableBalance != null && a.availableBalance !== a.balance && (
                  <div style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--muted)",
                    marginTop: 4,
                  }}>
                    Available {fmtUsd(a.availableBalance)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
          <TxnTable transactions={data.transactions} accounts={data.accounts} />
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: "1px solid var(--border)",
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
    </div>
  );
}

function SimpleStat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
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
        color: "var(--text)",
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
}: {
  transactions: SimpleFinTxn[];
  accounts: SimpleFinAccount[];
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
            <Th align="right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const account = accountMap.get(t.accountId);
            const isOutflow = t.amount < 0;
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
