"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  decimals?: number;
};

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function KPICard({ label, value, prefix = "", suffix = "", loading = false, decimals = 0 }: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading || isNaN(value)) return;
    const duration = 1200;
    startRef.current = null;

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayValue(value * easeOut(progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, loading]);

  const formatted = isNaN(value) ? "—" : displayValue.toFixed(decimals);

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 20,
    }}>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 8,
      }}>
        {label}
      </div>

      {loading ? (
        <div className="skeleton-shimmer" style={{ width: "60%", height: 36 }} />
      ) : (
        <div style={{
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 28,
          fontWeight: 500,
          color: "var(--text)",
          lineHeight: 1,
        }}>
          {prefix}{formatted}{suffix}
        </div>
      )}
    </div>
  );
}
