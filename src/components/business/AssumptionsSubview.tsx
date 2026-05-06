"use client";
import { useEffect, useState } from "react";
import {
  DEFAULT_ASSUMPTIONS,
  type BusinessAssumptions,
} from "@/lib/business-types";

type FieldGroup = {
  title: string;
  fields: { key: keyof BusinessAssumptions; label: string; suffix?: string; step?: number; help?: string }[];
};

const GROUPS: FieldGroup[] = [
  {
    title: "Cost of Goods",
    fields: [
      { key: "cogsPerUnit", label: "COGS per unit", suffix: "USD", step: 0.5, help: "Per-bottle landed cost (ingredients + manufacturing)" },
      { key: "fulfilmentPerOrder", label: "Fulfilment per order", suffix: "USD", step: 0.5, help: "Pick + pack + outbound shipping per order" },
      { key: "paymentProcessingPct", label: "Payment processing", suffix: "%", step: 0.1, help: "% of order value (Stripe/Shop Pay rate)" },
      { key: "paymentProcessingFlat", label: "Payment processing flat", suffix: "USD", step: 0.05, help: "Per-transaction flat fee" },
      { key: "returnsRate", label: "Returns / refunds rate", suffix: "%", step: 0.5, help: "Used for the Refunds line on the P&L" },
    ],
  },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function AssumptionsSubview() {
  const [values, setValues] = useState<BusinessAssumptions>(DEFAULT_ASSUMPTIONS);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/business/assumptions");
        const data = await res.json();
        if (!cancelled) setValues(data as BusinessAssumptions);
      } catch {
        if (!cancelled) setErrorMsg("Could not load assumptions — using defaults.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key: keyof BusinessAssumptions, raw: string) {
    const num = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(num)) return;
    setValues((v) => ({ ...v, [key]: num }));
    setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/business/assumptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  function handleReset() {
    setValues(DEFAULT_ASSUMPTIONS);
    setStatus("idle");
  }

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
            Assumptions
          </h1>
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--muted)",
            margin: "6px 0 0",
          }}>
            Cost inputs only. Customer economics (LTV, sub mix, repeat rate) come from real Shopify data — no longer assumptions. Update when COGS or fees change.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {status === "saved" && (
            <span style={{ fontSize: 12, color: "var(--success)", fontFamily: "var(--font-ui)" }}>
              Saved
            </span>
          )}
          {status === "error" && errorMsg && (
            <span style={{ fontSize: 12, color: "var(--error)", fontFamily: "var(--font-ui)" }}>
              {errorMsg}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={status === "saving"}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              cursor: status === "saving" ? "not-allowed" : "pointer",
            }}
          >
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={status === "saving" || loading}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "#fff",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              cursor: status === "saving" || loading ? "not-allowed" : "pointer",
              opacity: status === "saving" || loading ? 0.6 : 1,
            }}
          >
            {status === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .assumptions-fields { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {loading ? (
        <div style={{ fontFamily: "var(--font-ui)", color: "var(--muted)", fontSize: 13 }}>
          Loading…
        </div>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "20px 20px 16px",
              }}
            >
              <div style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: "1px solid var(--border)",
              }}>
                {group.title}
              </div>
              <div className="assumptions-fields" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                {group.fields.map((f) => (
                  <FieldRow
                    key={f.key}
                    label={f.label}
                    suffix={f.suffix}
                    help={f.help}
                    value={values[f.key]}
                    step={f.step ?? 1}
                    onChange={(v) => update(f.key, v)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({
  label, suffix, help, value, step, onChange,
}: {
  label: string;
  suffix?: string;
  help?: string;
  value: number;
  step: number;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        color: "var(--muted)",
      }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            paddingRight: suffix ? 56 : 12,
            border: "1px solid var(--border)",
            borderRadius: 6,
            background: "var(--bg)",
            color: "var(--text)",
            fontFamily: "var(--font-mono)",
            fontVariantNumeric: "tabular-nums",
            fontSize: 13,
          }}
        />
        {suffix && (
          <span style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--subtle)",
            pointerEvents: "none",
          }}>
            {suffix}
          </span>
        )}
      </div>
      {help && (
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)" }}>
          {help}
        </span>
      )}
    </label>
  );
}
