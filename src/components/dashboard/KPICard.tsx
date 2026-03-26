"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  decimals?: number;
  tooltip?: string;
};

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function KPICard({ label, value, prefix = "", suffix = "", loading = false, decimals = 0, tooltip }: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
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
      transition: "border-color 120ms ease",
      position: "relative",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-s)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
    >
      {/* Label row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        marginBottom: 8,
      }}>
        <span style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}>
          {label}
        </span>

        {tooltip && (
          <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 13,
              height: 13,
              borderRadius: "50%",
              border: "1px solid var(--border-s)",
              color: "var(--subtle)",
              fontSize: 8,
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              cursor: "default",
              lineHeight: 1,
              userSelect: "none",
              flexShrink: 0,
            }}>
              i
            </span>
            {showTooltip && (
              <div style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface-r)",
                border: "1px solid var(--border-s)",
                borderRadius: 6,
                padding: "8px 10px",
                fontSize: 11,
                fontFamily: "var(--font-ui)",
                color: "var(--muted)",
                whiteSpace: "nowrap",
                zIndex: 50,
                pointerEvents: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                maxWidth: 240,
                whiteSpaceCollapse: "preserve",
              } as React.CSSProperties}>
                {tooltip}
                {/* Arrow */}
                <span style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: "5px solid var(--border-s)",
                }} />
              </div>
            )}
          </span>
        )}
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
