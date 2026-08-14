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

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
// verification-status, NOT verification: the latter imports the Anthropic SDK
// and the Redis-backed cache, which must never reach the client bundle.
import {
  deriveUnitStatus,
  deriveRecordStatus,
  isVacuouslyGreen,
  summarize,
  partitionFindings,
} from "@/lib/verification-status";
import { effectiveVerdict } from "@/lib/types";
import type { UnitFields } from "@/lib/verification-status";
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
  /** Labels of the units about to be checked, so the loader can name them. */
  pendingUnitLabels?: string[];
  onRecordChange: (record: VerificationRecord) => void;
  /** Writes an accepted fix back into the carousel content. */
  onApplyFix?: (unitId: string, fields: UnitFields) => void;
  /** Concise mode changes the body word budget the rewrite must respect. */
  concise?: boolean;
};

type Suggestion = { rationale: string; fields: UnitFields };

/**
 * Elapsed-time readout for the running check.
 *
 * Deliberately NOT a progress bar. The route returns every unit at once, so any
 * percentage would be invented — and a bar that crawls to 90% and sits there is
 * worse than no bar. Elapsed seconds are true, and the unit list tells you what
 * the wait is actually for.
 */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return (
    <span style={{ fontFamily: "var(--font-mono, 'Fira Code', monospace)", fontVariantNumeric: "tabular-nums" }}>
      {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}

/** Shimmer row shown per unit while the check runs. */
function PendingRow({ label }: { label: string }) {
  return (
    <div style={{ ...rowStyle, cursor: "default" }}>
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "var(--muted)",
          flexShrink: 0,
          animation: "shimmer 1s ease-in-out infinite",
        }}
      />
      <span style={{ fontWeight: 500, minWidth: 74, textAlign: "left" }}>{label}</span>
      <span style={{ ...subtleStyle, flex: 1, textAlign: "left" }}>
        Reading claims, searching for sources…
      </span>
    </div>
  );
}

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
  pendingUnitLabels = [],
  onRecordChange,
  onApplyFix,
  concise = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fixingUnit, setFixingUnit] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Record<string, { current: UnitFields; suggestions: Suggestion[] }>>({});
  const [quietOpen, setQuietOpen] = useState<string | null>(null);

  /** One claim row: verdict, evidence, and the override controls. */
  function renderClaim(unitId: string, claim: VerifiedClaim) {
    return (
      <div key={claim.id} style={claimStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Dot status={verdictStatus(claim)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{claim.text}</div>
            <div style={{ ...subtleStyle, marginTop: 3 }}>
              {verdictLabel(claim)}
              {claim.overriddenTo && ` (checker said: ${claim.verdict})`}
              {claim.reasoning ? `, ${claim.reasoning}` : ""}
            </div>

            {claim.supportingQuote && (
              <div style={quoteStyle}>&ldquo;{claim.supportingQuote}&rdquo;</div>
            )}

            {claim.sourceUrl && (
              <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {claim.sourceTitle || claim.sourceUrl}
              </a>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {claim.overriddenTo ? (
                <Button onClick={() => override(unitId, claim.id, null)} disabled={busy}>
                  Undo override
                </Button>
              ) : (
                <>
                  {effectiveVerdict(claim) !== "pass" && (
                    <Button onClick={() => override(unitId, claim.id, "pass")} disabled={busy}>
                      I verified this myself
                    </Button>
                  )}
                  {effectiveVerdict(claim) !== "fail" && (
                    <Button variant="danger" onClick={() => override(unitId, claim.id, "fail")} disabled={busy}>
                      Mark wrong
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function suggestFix(unitId: string) {
    setFixingUnit(unitId);
    setError(null);
    try {
      const res = await fetch("/api/verify/suggest-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carouselId, unitId, concise }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Could not draft a fix (${res.status})`);
        return;
      }
      setFixes((f) => ({ ...f, [unitId]: { current: data.current, suggestions: data.suggestions } }));
    } catch {
      setError("Could not reach the fix drafter.");
    } finally {
      setFixingUnit(null);
    }
  }

  function applyFix(unitId: string, fields: UnitFields) {
    onApplyFix?.(unitId, fields);
    // Clear the drafts for this unit — they describe text that no longer
    // exists. The unit will show as stale until it is re-checked, which is
    // correct: a fix is an edit, and an edit invalidates the verdict.
    setFixes((f) => {
      const next = { ...f };
      delete next[unitId];
      return next;
    });
  }

  async function runVerify() {
    setBusy(true);
    setVerifying(true);
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
      setVerifying(false);
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

  // ─── Running ────────────────────────────────────────────────────────────────
  // Shown whether or not a previous record exists, so a re-check never leaves
  // stale verdicts on screen looking like live ones.
  if (verifying) {
    const labels = pendingUnitLabels.length > 0 ? pendingUnitLabels : ["Content"];
    return (
      <div style={panelStyle}>
        <div style={headerRow}>
          <div>
            <div style={titleStyle}>Checking {labels.length} units</div>
            <div style={{ ...subtleStyle, marginTop: 2 }}>
              Each unit is read for factual claims, then searched against real sources.
              Elapsed <Elapsed />
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {labels.map((label) => (
            <PendingRow key={label} label={label} />
          ))}
        </div>
        <div style={{ ...subtleStyle, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          Units run in parallel, so this takes about as long as the slowest one — usually
          under a minute. Leaving this screen cancels the run.
        </div>
      </div>
    );
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
            Verify
          </Button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
      </div>
    );
  }

  const erroredUnits = record.units.filter((u) => !!u.error);
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
            {/* Lead with what needs acting on, not with everything examined.
                The old line read "0 verified · 17 unresolved" on content that
                was largely fine, which is why the panel felt like noise. */}
            <div style={{ ...subtleStyle, marginTop: 2, fontFamily: "var(--font-mono, 'Fira Code', monospace)" }}>
              {counts.findings === 0
                ? `Nothing to act on · ${counts.total} units checked`
                : `${counts.findings} to review · ${counts.total} units checked`}
              {counts.overridden > 0 && ` · ${counts.overridden} overridden`}
            </div>
          </div>
        </div>
        <Button onClick={runVerify} disabled={busy}>
          {busy ? "Checking…" : "Re-check"}
        </Button>
      </div>

      {/* `partial` covers two very different situations and the old copy
          conflated them into "6 of 6 units finished", which read as nonsense.
          Say which one actually happened. */}
      {record.partial && (
        erroredUnits.length > 0 ? (
          <div style={{ ...noticeStyle, borderColor: "var(--warning)" }}>
            {erroredUnits.length} of {record.units.length} unit
            {record.units.length > 1 ? "s" : ""} could not be checked:{" "}
            {erroredUnits[0].error}
            {erroredUnits.length > 1 && ` (and ${erroredUnits.length - 1} more with the same fault)`}
          </div>
        ) : (
          <div style={noticeStyle}>
            Run ended early — {record.units.length} of {record.unitsPlanned ?? record.units.length}{" "}
            units finished. Re-check to fill the gaps.
          </div>
        )
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
                  {/* An errored unit has no claims because the check never
                      completed — saying "nothing checkable" there is actively
                      misleading, and the old copy said "normal for a hook" even
                      on slides. Distinguish the two cases. */}
                  {unit.error ? (
                    <div style={{ ...subtleStyle, color: "var(--warning)" }}>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>Check did not complete</div>
                      <div style={{ fontFamily: "var(--font-mono, 'Fira Code', monospace)", fontSize: 11, lineHeight: 1.5 }}>
                        {unit.error}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        This unit&rsquo;s text was never assessed. It is not a verdict on the
                        content, and re-checking is the fix.
                      </div>
                    </div>
                  ) : (
                    unit.claims.length === 0 && (
                      <div style={subtleStyle}>
                        No factual claims found in this {unit.kind === "hook" ? "hook" : "unit"}.
                        That is a normal result for copy that is framing rather than fact.
                      </div>
                    )
                  )}
                  {/* Fix flow. Offered whenever something in the unit is not a
                      clean pass, since an unsourced claim is just as worth
                      rewriting as a contradicted one. */}
                  {!unit.error && unit.claims.some((c) => effectiveVerdict(c) !== "pass") && onApplyFix && (
                    <div style={fixBoxStyle}>
                      {!fixes[unit.id] ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <span style={subtleStyle}>
                            Rewrite this {unit.kind} against what the sources actually say.
                          </span>
                          <Button onClick={() => suggestFix(unit.id)} disabled={fixingUnit === unit.id}>
                            {fixingUnit === unit.id ? "Drafting…" : "Suggest a fix"}
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {fixes[unit.id].suggestions.map((s, si) => (
                            <div key={si} style={{ borderTop: si > 0 ? "1px solid var(--border)" : "none", paddingTop: si > 0 ? 12 : 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                                {si === 0 ? "Minimal change" : "Stronger rewrite"}
                              </div>
                              <div style={{ ...subtleStyle, marginBottom: 8 }}>{s.rationale}</div>

                              {/* Field-level before/after, so you can see exactly
                                  what changes rather than trusting a summary. */}
                              {Object.entries(s.fields).map(([key, val]) => {
                                const before = fixes[unit.id].current[key];
                                const fmt = (v: string | string[] | undefined) =>
                                  Array.isArray(v) ? v.join(" · ") : (v ?? "");
                                if (fmt(before) === fmt(val)) return null;
                                return (
                                  <div key={key} style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--subtle, var(--muted))", marginBottom: 3 }}>
                                      {key}
                                    </div>
                                    <div style={beforeStyle}>{fmt(before) || <em>(empty)</em>}</div>
                                    <div style={afterStyle}>{fmt(val) || <em>(empty)</em>}</div>
                                  </div>
                                );
                              })}

                              <Button variant="primary" onClick={() => applyFix(unit.id, s.fields)} disabled={busy}>
                                Apply this fix
                              </Button>
                            </div>
                          ))}
                          <button
                            onClick={() => setFixes((f) => { const n = { ...f }; delete n[unit.id]; return n; })}
                            style={{ ...subtleStyle, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "inherit" }}
                          >
                            Discard these drafts
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(() => {
                    const p = partitionFindings(unit);
                    const failures = unit.claims.filter((c) => effectiveVerdict(c) === "fail");
                    // Surface: contradictions and high-risk gaps. Collapse the
                    // rest. Framing never appears — it is not a claim.
                    const shown = [...failures, ...p.high.filter((c) => effectiveVerdict(c) !== "fail")];
                    const hidden = [...p.low, ...p.resolved.filter((c) => effectiveVerdict(c) === "pass")];
                    const showQuiet = quietOpen === unit.id;
                    return (
                      <>
                        {shown.map((claim) => renderClaim(unit.id, claim))}
                        {hidden.length > 0 && (
                          <div>
                            <button
                              onClick={() => setQuietOpen(showQuiet ? null : unit.id)}
                              style={{ ...subtleStyle, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "inherit" }}
                            >
                              {showQuiet ? "Hide" : "Show"} {hidden.length} low-risk claim
                              {hidden.length > 1 ? "s" : ""} checked
                              {p.framing.length > 0 && ` (${p.framing.length} framing line${p.framing.length > 1 ? "s" : ""} not checked)`}
                            </button>
                            {showQuiet && (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                                {hidden.map((claim) => renderClaim(unit.id, claim))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}

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

/**
 * One line describing what a unit needs, not what was examined.
 *
 * The previous version reported raw totals ("2/9 sourced, 7 without a source"),
 * which counted framing lines and common-knowledge advice as deficiencies and
 * made every unit look broken.
 */
function summarizeUnit(unit: VerifiedUnit): string {
  const fail = unit.claims.filter((c) => effectiveVerdict(c) === "fail").length;
  if (fail > 0) return `${fail} claim${fail > 1 ? "s" : ""} contradicted by sources`;

  const { high, low, resolved, framing } = partitionFindings(unit);
  if (high.length > 0) {
    return `${high.length} claim${high.length > 1 ? "s" : ""} needs a source`;
  }
  if (resolved.length > 0) {
    return low.length > 0
      ? `${resolved.length} sourced, ${low.length} minor unsourced`
      : `${resolved.length} claim${resolved.length > 1 ? "s" : ""} sourced`;
  }
  if (low.length > 0) return `${low.length} minor claim${low.length > 1 ? "s" : ""}, nothing notable`;
  if (framing.length > 0) return "Framing only, nothing to check";
  return "Nothing to check";
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

const fixBoxStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 10,
  marginBottom: 4,
  background: "var(--bg)",
};

/** Struck-through original. Colour carries no meaning beyond "this is the old one". */
const beforeStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--muted)",
  textDecoration: "line-through",
  marginBottom: 2,
};

const afterStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--text)",
  borderLeft: "2px solid var(--success)",
  paddingLeft: 8,
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
