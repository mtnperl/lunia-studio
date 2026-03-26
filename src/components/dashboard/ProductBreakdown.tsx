"use client";
import type { ShopifyProduct } from "@/lib/types";

type Props = {
  products: ShopifyProduct[];
  loading?: boolean;
};

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

export default function ProductBreakdown({ products, loading = false }: Props) {
  const thStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    textAlign: "left",
    background: "var(--surface-r)",
    whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
  };

  if (loading) {
    return (
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-shimmer" style={{ height: 36, marginBottom: 6, borderRadius: 4 }} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return <p style={{ color: "var(--muted)", padding: 24, margin: 0 }}>No product data for this period.</p>;
  }

  const top10 = products.slice(0, 10);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>Product</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Orders</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((p, i) => (
            <tr
              key={i}
              style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-h)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ ...tdStyle, color: "var(--text)", maxWidth: 280 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.productTitle}
                  {p.variantTitle && (
                    <span style={{ color: "var(--muted)", marginLeft: 6 }}>· {p.variantTitle}</span>
                  )}
                </span>
              </td>
              <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--muted)" }}>
                {p.orders.toLocaleString()}
              </td>
              <td style={{ ...tdStyle, ...MONO, textAlign: "right", color: "var(--text)", fontWeight: 500 }}>
                ${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
