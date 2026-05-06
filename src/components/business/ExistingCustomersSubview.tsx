"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshButton from "../dashboard/RefreshButton";
import type { CustomerCohort, CustomerSummary } from "@/lib/business-types";

type Filter = "subscribers" | "one-time" | "all";
type SortKey = "revenue" | "orders" | "lastOrder" | "firstOrder";

function fmtUsd(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function displayName(c: CustomerSummary): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (c.email) return c.email;
  return c.key;
}

export default function ExistingCustomersSubview() {
  const [cohort, setCohort] = useState<CustomerCohort | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [filter, setFilter] = useState<Filter>("subscribers");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [search, setSearch] = useState("");

  const fetchCohort = useCallback(async (bust = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shopify/customer-cohort${bust ? "?bust=1" : ""}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not load customer cohort");
      } else {
        setCohort(body as CustomerCohort);
        setLastRefreshed(new Date());
      }
    } catch {
      setError("Could not reach the cohort endpoint");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCohort();
  }, [fetchCohort]);

  const filtered = useMemo(() => {
    if (!cohort) return [];
    let rows = cohort.customers;
    if (filter === "subscribers") rows = rows.filter((c) => c.isRepeatCustomer);
    else if (filter === "one-time") rows = rows.filter((c) => !c.isRepeatCustomer);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.firstName ?? "").toLowerCase().includes(q) ||
        (c.lastName ?? "").toLowerCase().includes(q),
      );
    }

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "revenue":     return b.totalRevenue - a.totalRevenue;
        case "orders":      return b.orderCount - a.orderCount;
        case "lastOrder":   return b.lastOrderDate.localeCompare(a.lastOrderDate);
        case "firstOrder":  return b.firstOrderDate.localeCompare(a.firstOrderDate);
      }
    });
    return rows;
  }, [cohort, filter, sortKey, search]);

  const subscriberRevenue = useMemo(() => {
    if (!cohort) return 0;
    return cohort.customers
      .filter((c) => c.isRepeatCustomer)
      .reduce((s, c) => s + c.totalRevenue, 0);
  }, [cohort]);

  const totalRevenue = useMemo(() => {
    if (!cohort) return 0;
    return cohort.customers.reduce((s, c) => s + c.totalRevenue, 0);
  }, [cohort]);

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
            Existing Customers
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            margin: "6px 0 0",
          }}>
            Subscriber = anyone who ordered more than once in the last 12 months. The repeat-buyer base is the engine of the business.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <RefreshButton
            loading={loading}
            onClick={() => fetchCohort(true)}
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

      {/* Headline tiles */}
      <style>{`
        @media (max-width: 700px) {
          .ec-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
          .ec-controls { flex-direction: column; align-items: stretch !important; }
          .ec-controls > * { width: 100%; }
        }
      `}</style>
      <div className="ec-grid-4" style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <Tile
          label="Subscribers"
          primary={cohort?.repeatCustomers.toLocaleString() ?? "—"}
          hint={cohort && cohort.totalCustomers > 0
            ? `${cohort.repeatRatePct.toFixed(1)}% of ${cohort.totalCustomers.toLocaleString()} total`
            : "Repeat buyers"}
        />
        <Tile
          label="One-time"
          primary={cohort?.oneTimeCustomers.toLocaleString() ?? "—"}
          hint="Single order in the window"
        />
        <Tile
          label="Subscriber revenue"
          primary={fmtUsd(subscriberRevenue)}
          hint={totalRevenue > 0 ? `${((subscriberRevenue / totalRevenue) * 100).toFixed(0)}% of total` : "—"}
          highlight
        />
        <Tile
          label="Avg subscriber LTV"
          primary={fmtUsd(cohort?.avgLifetimeRevenue.repeat ?? 0)}
          hint={cohort && cohort.repeatCustomers > 0
            ? `${cohort.avgOrdersPerCustomer.repeat.toFixed(1)} orders / customer`
            : "—"}
        />
      </div>

      {/* Controls */}
      <div className="ec-controls" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["subscribers", "one-time", "all"] as Filter[]).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent)" : "var(--muted)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f === "subscribers" ? "Subscribers" : f === "one-time" ? "One-time" : "All"}
                {cohort && (
                  <span style={{ marginLeft: 6, color: "var(--subtle)", fontWeight: 400 }}>
                    {f === "subscribers"
                      ? cohort.repeatCustomers
                      : f === "one-time"
                        ? cohort.oneTimeCustomers
                        : cohort.totalCustomers}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            style={{
              padding: "6px 10px",
              fontSize: 13,
              background: "var(--surface-r)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "var(--font-ui)",
              minWidth: 240,
            }}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              background: "var(--surface-r)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text)",
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
            }}
          >
            <option value="revenue">Sort: Revenue</option>
            <option value="orders">Sort: Orders</option>
            <option value="lastOrder">Sort: Last order</option>
            <option value="firstOrder">Sort: First order</option>
          </select>
        </div>
      </div>

      {/* Customer table */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        overflowX: "auto",
      }}>
        {!cohort && loading && (
          <div style={{ padding: 20, fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13 }}>
            Loading…
          </div>
        )}
        {cohort && filtered.length === 0 && (
          <div style={{ padding: 24, fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
            No customers match.
          </div>
        )}
        {cohort && filtered.length > 0 && (
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
          }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th align="right">Orders</Th>
                <Th align="right">Revenue</Th>
                <Th align="right">Avg / order</Th>
                <Th align="right">First order</Th>
                <Th align="right">Last order</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const status = c.isRepeatCustomer ? "Subscriber" : "One-time";
                const statusColor = c.isRepeatCustomer ? "var(--accent)" : "var(--muted)";
                const statusBg = c.isRepeatCustomer ? "var(--accent-dim)" : "transparent";
                return (
                  <tr key={c.key} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>{displayName(c)}</span>
                      {c.email && c.email !== displayName(c) && (
                        <span style={{ display: "block", color: "var(--subtle)", fontSize: 11, marginTop: 2 }}>
                          {c.email}
                        </span>
                      )}
                      {c.hasSubscriptionOrder && (
                        <span style={{
                          display: "inline-block",
                          marginTop: 4,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--surface-r)",
                          color: "var(--muted)",
                          fontSize: 10,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          fontWeight: 600,
                        }}>
                          Sub plan
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: statusBg,
                        border: `1px solid ${c.isRepeatCustomer ? "var(--accent-mid)" : "var(--border)"}`,
                        color: statusColor,
                        fontFamily: "var(--font-ui)",
                        fontSize: 11,
                        fontWeight: 500,
                      }}>
                        {status}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--text)",
                        fontWeight: c.isRepeatCustomer ? 600 : 400,
                      }}>
                        {c.orderCount}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--text)",
                        fontWeight: 500,
                      }}>
                        {fmtUsd(c.totalRevenue)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--muted)",
                      }}>
                        {fmtUsd(c.totalRevenue / Math.max(1, c.orderCount))}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--muted)",
                        fontSize: 12,
                      }}>
                        {c.firstOrderDate}
                      </span>
                    </Td>
                    <Td align="right">
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--muted)",
                        fontSize: 12,
                      }}>
                        {c.lastOrderDate}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {cohort && filtered.length > 0 && (
        <div style={{
          marginTop: 12,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--subtle)",
          textAlign: "right",
        }}>
          {filtered.length.toLocaleString()} customer{filtered.length === 1 ? "" : "s"} shown · {cohort.totalCustomers.toLocaleString()} total in 365d window
        </div>
      )}
    </div>
  );
}

function Tile({ label, primary, hint, highlight }: { label: string; primary: string; hint?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? "var(--accent-dim)" : "var(--surface)",
      border: `1px solid ${highlight ? "var(--accent-mid)" : "var(--border)"}`,
      borderRadius: 8,
      padding: 16,
    }}>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: highlight ? "var(--accent)" : "var(--subtle)",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 22,
        fontWeight: 600,
        color: "var(--text)",
      }}>
        {primary}
      </div>
      {hint && (
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: highlight ? "var(--accent)" : "var(--subtle)",
          marginTop: 4,
        }}>
          {hint}
        </div>
      )}
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
      whiteSpace: "nowrap",
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
