"use client";

// Fact-verification panel for the carousel preview.
//
// Design constraints (DESIGN.md): no box-shadows in light mode, no translateY
// hover, no emoji in functional chrome, whole-pixel type scale, Inter for UI and
// Fira Code for counts. Status colour comes from --success / --warning / --error
// so it inherits both themes.
//
// The panel's job is to make "is this true?" answerable at a glance and
// arguable on demand. Three levels:
//   1. One overall chip you can read in half a second.
//   2. A row per unit, colour-coded, with a one-line reason.
//   3. Expand a row for the actual claims, sources and quotes — and the
//      override control, because the checker is wrong sometimes.

import { useState } from "react";
import { Button } from "@/components/ui/Button";
// verification-status, NOT verification: the latter imports the Anthropic SDK
// and the Redis-backed cache, which must never reach the client bundle.
import {
  deriveUnitStatus,
  deriveRecordStatus,
  isVacuouslyGreen,
  summarize,
} from "@/lib/verification-status";
import { effectiveVerdict } from "@/lib/types";
import type {
  ClaimVerdict,
  SurfaceGating,
  VerificationRecord,
  VerificationStatus,
  VerifiedClaim,
  VerifiedUnit,
} from "@/lib/types";

type Props = {
  carouselId: string;
  record?: VerificationRecord;
  gating?: SurfaceGating;
  /** Unit ids whose text changed since verification. Rendered as stale. */
  staleUnitIds?: string[];
  onRecordChange: (record: VerificationRecord) => void;
};

const STATUS_COLOR: Record<VerificationStatus, string> = {
  green: "var(--success)",
  amber: "var(--warning)",
  red: "var(--error)",
};

const STATUS_LABEL: Record<VerificationStatus, string> = {
  green: "Verified",
  amber: "Needs review",
  red: "Failed",
};

/** Small filled dot. Deliberately not an emoji — DESIGN.md forbids those here. */
function Dot({ status, size = 8 }: { status: VerificationStatus; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: STATUS_COLOR[status],
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

function verdictLabel(claim: VerifiedClaim): string {
  const v = effectiveVerdict(claim);
  if (claim.overriddenTo) {
    return v === "pass" ? "Approved by you" : v === "fail" ? "Rejected by you" : "Set unresolved by you";
  }
  return v === "pass" ? "Source found" : v === "fail" ? "Contradicted" : "No source found";
}

function verdictStatus(claim: VerifiedClaim): VerificationStatus {
  const v = effectiveVerdict(claim);
  return v === "pass" ? "green" : v === "fail" ? "red" : "amber";
}

export default function VerificationPanel({
  carouselId,
  record,
  gating,
  staleUnitIds = [],
  onRecordChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function runVerify() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "carousel", id: carouselId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Verification failed (${res.status})`);
        return;
      }
      onRecordChange(data.record);
      if (data.warning) setError(data.warning);
    } catch {
      setError("Could not reach the verifier. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  async function override(unitId: string, claimId: string, verdict: ClaimVerdict | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verify", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carouselId, unitId, claimId, verdict }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Could not save the override (${res.status})`);
        return;
      }
      onRecordChange(data.record);
    } catch {
      setError("Could not save the override.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Never verified ─────────────────────────────────────────────────────────
  if (!record) {
    return (
      <div style={panelStyle}>
        <div style={headerRow}>
          <div>
            <div style={titleStyle}>Fact check</div>
            <div style={{ ...subtleStyle, marginTop: 2 }}>
              Not checked yet. Nothing here has been verified against a source.
            </div>
          </div>
          <Button variant="primary" onClick={runVerify} disabled={busy}>
            {busy ? "Checking…" : "Verify"}
          </Button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
      </div>
    );
  }

  const status = deriveRecordStatus(record);
  const counts = summarize(record);
  const amberAction = gating?.amber ?? "warn";
  const redAction = gating?.red ?? "block";

  return (
    <div style={panelStyle}>
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Dot status={status} size={10} />
          <div style={{ minWidth: 0 }}>
            <div style={titleStyle}>{STATUS_LABEL[status]}</div>
            <div style={{ ...subtleStyle, marginTop: 2, fontFamily: "var(--font-mono, 'Fira Code', monospace)" }}>
              {counts.green} verified · {counts.amber} unresolved · {counts.red} failed
              {counts.overridden > 0 && ` · ${counts.overridden} overridden`}
            </div>
          </div>
        </div>
        <Button onClick={runVerify} disabled={busy}>
          {busy ? "Checking…" : "Re-check"}
        </Button>
      </div>

      {record.partial && (
        <div style={noticeStyle}>
          Incomplete run — {record.units.length} of {record.unitsPlanned ?? record.units.length} units
          finished. Re-check to fill the gaps.
        </div>
      )}

      {staleUnitIds.length > 0 && (
        <div style={noticeStyle}>
          {staleUnitIds.length} unit{staleUnitIds.length > 1 ? "s were" : " was"} edited after this
          check. Those verdicts no longer apply.
        </div>
      )}

      {record.conflicts.map((c, i) => (
        <div key={i} style={{ ...noticeStyle, borderColor: "var(--warning)" }}>
          Contradiction between {c.unitIds.join(" and ")}: {c.description}
        </div>
      ))}

      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
        {record.units.map((unit) => {
          const s = deriveUnitStatus(unit);
          const stale = staleUnitIds.includes(unit.id);
          const open = expanded === unit.id;
          return (
            <div key={unit.id}>
              <button
                onClick={() => setExpanded(open ? null : unit.id)}
                style={{
                  ...rowStyle,
                  opacity: stale ? 0.55 : 1,
                  background: open ? "var(--surface-h)" : "transparent",
                }}
              >
                <Dot status={s} />
                <span style={{ fontWeight: 500, minWidth: 74, textAlign: "left" }}>{unit.label}</span>
                <span style={{ ...subtleStyle, flex: 1, textAlign: "left" }}>
                  {stale
                    ? "Edited since this check"
                    : unit.error
                      ? unit.error
                      : isVacuouslyGreen(unit)
                        ? "No factual claims to verify"
                        : summarizeUnit(unit)}
                </span>
                <span style={{ ...subtleStyle, fontSize: 11 }}>{open ? "Hide" : "Details"}</span>
              </button>

              {open && (
                <div style={detailWrap}>
                  {unit.claims.length === 0 && (
                    <div style={subtleStyle}>
                      Nothing checkable in this unit. That is a normal result for a hook.
                    </div>
                  )}
                  {unit.claims.map((claim) => (
                    <div key={claim.id} style={claimStyle}>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <Dot status={verdictStatus(claim)} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, lineHeight: 1.45 }}>{claim.text}</div>
                          <div style={{ ...subtleStyle, marginTop: 3 }}>
                            {verdictLabel(claim)}
                            {claim.overriddenTo && ` (checker said: ${claim.verdict})`}
                            {claim.reasoning ? ` — ${claim.reasoning}` : ""}
                          </div>

                          {claim.supportingQuote && (
                            <div style={quoteStyle}>&ldquo;{claim.supportingQuote}&rdquo;</div>
                          )}

                          {claim.sourceUrl && (
                            <a
                              href={claim.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={linkStyle}
                            >
                              {claim.sourceTitle || claim.sourceUrl}
                            </a>
                          )}

                          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                            {claim.overriddenTo ? (
                              <Button onClick={() => override(unit.id, claim.id, null)} disabled={busy}>
                                Undo override
                              </Button>
                            ) : (
                              <>
                                {effectiveVerdict(claim) !== "pass" && (
                                  <Button onClick={() => override(unit.id, claim.id, "pass")} disabled={busy}>
                                    I verified this myself
                                  </Button>
                                )}
                                {effectiveVerdict(claim) !== "fail" && (
                                  <Button
                                    variant="danger"
                                    onClick={() => override(unit.id, claim.id, "fail")}
                                    disabled={busy}
                                  >
                                    Mark wrong
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ ...subtleStyle, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        {redAction === "block"
          ? "Failed claims block download."
          : "Failed claims are shown but do not block download."}{" "}
        {amberAction === "block"
          ? "Unresolved claims also block."
          : amberAction === "require_ack"
            ? "Unresolved claims need acknowledging first."
            : "Unresolved claims warn only."}
      </div>

      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

function summarizeUnit(unit: VerifiedUnit): string {
  const total = unit.claims.length;
  if (total === 0) return "Nothing checkable";
  const pass = unit.claims.filter((c) => effectiveVerdict(c) === "pass").length;
  const fail = unit.claims.filter((c) => effectiveVerdict(c) === "fail").length;
  if (fail > 0) return `${fail} claim${fail > 1 ? "s" : ""} contradicted by sources`;
  const unres = total - pass;
  if (unres > 0) return `${pass}/${total} sourced, ${unres} without a source`;
  return `${pass}/${total} claims sourced`;
}

// ─── styles ───────────────────────────────────────────────────────────────────
// Inline to match the surrounding carousel step components, which do not use
// CSS modules. No box-shadow anywhere: DESIGN.md forbids it in light mode.

const panelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  borderRadius: 10,
  padding: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  color: "var(--text)",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600 };

const subtleStyle: React.CSSProperties = { fontSize: 12, color: "var(--muted)", lineHeight: 1.4 };

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "7px 8px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  color: "var(--text)",
  fontFamily: "inherit",
};

const detailWrap: React.CSSProperties = {
  padding: "6px 8px 10px 26px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const claimStyle: React.CSSProperties = {
  borderLeft: "2px solid var(--border)",
  paddingLeft: 10,
};

const quoteStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--muted)",
  fontStyle: "italic",
  marginTop: 5,
  lineHeight: 1.5,
};

const linkStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--muted)",
  textDecoration: "underline",
  display: "inline-block",
  marginTop: 4,
  wordBreak: "break-all",
};

const noticeStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "7px 9px",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--muted)",
  lineHeight: 1.45,
};

const errorStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "var(--error)",
  lineHeight: 1.45,
};
