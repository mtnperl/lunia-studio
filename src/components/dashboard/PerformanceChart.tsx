"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";
import type { CombinedDayRow } from "@/lib/types";

type Props = {
  data: CombinedDayRow[];
  loading?: boolean;
  accentColor: string;
  accentMidColor: string;
  mutedColor: string;
  borderColor: string;
  surfaceRColor: string;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(v: number): string {
  if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "k";
  return "$" + v.toFixed(0);
}

type TooltipPayload = { name: string; value: number; color: string };

function CustomTooltip({ active, payload, label, surfaceRColor }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  surfaceRColor: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: surfaceRColor,
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 12,
      fontFamily: "var(--font-mono)",
      color: "var(--text)",
    }}>
      <div style={{ marginBottom: 4, color: "var(--muted)", fontSize: 11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
}

export default function PerformanceChart({ data, loading, accentColor, accentMidColor, mutedColor, borderColor, surfaceRColor }: Props) {
  // Return skeleton until CSS vars are resolved (prevents SVG flash with literal CSS variable strings)
  if (!accentColor || loading) {
    return <div className="skeleton-shimmer" style={{ height: 280, borderRadius: 6 }} />;
  }

  return (
    <div>
      {/* Manual legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: accentMidColor, display: "inline-block" }} />
          Ad Spend
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 2, background: accentColor, display: "inline-block" }} />
          Shopify Revenue
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={borderColor} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: mutedColor }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: mutedColor }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: mutedColor }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<CustomTooltip surfaceRColor={surfaceRColor} />} />
          <Bar yAxisId="left" dataKey="spend" name="Ad Spend" fill={accentMidColor} radius={[2, 2, 0, 0]} maxBarSize={24}>
            {data.length <= 14 && (
              <LabelList
                dataKey="spend"
                position="top"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => (v != null && typeof v === "number" ? formatCurrency(v) : "")}
                style={{ fontSize: 9, fill: mutedColor, fontFamily: "var(--font-mono)" }}
              />
            )}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="shopifyRevenue" name="Shopify Revenue" stroke={accentColor} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
