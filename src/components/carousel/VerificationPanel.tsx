"use client";

// Fact-verification panel for the carousel preview.
//
// Design constraints (DESIGN.md): no box-shadows in light mode, no translateY
// hover, no emoji in functional chrome, whole-pixel type scale, Inter for UI and
// Fira Code for counts. Status colour comes from --success / --warning / --error
// so it inherits both themes.
//
// The panel is organised by what a unit DEMANDS of you, not by where it sits in
// the carousel. An earlier version listed every unit as a peer row and hid the
// findings behind a one-at-a-time accordion, which buried the two claims you
// actually had to act on under four you didn't. Now:
//
//   1. Needs a decision — sources contradict it. Open, with the evidence and a
//      rewrite already drafted, because this is the only group that can stop a
//      post going out.
//   2. Not checked — the run errored on this unit, so nothing is known about it.
//   3. Clean — folded into a single line. Reassurance, not work.
//
// Only contradictions are raised. "No source found" is the ordinary outcome for
// most true sentences, and promoting it to a finding turned the panel into a
// list of things that were fine. Those claims are still checked and still
// readable behind the per-unit fold, they just do not ask anything of you.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Spinner } from "@/components/campaign/Loaders";
// verification-status, NOT verification: the latter imports the Anthropic SDK
// and the Redis-backed cache, which must never reach the client bundle.
import {
  deriveUnitStatus,
  deriveRecordStatus,
  isVacuouslyGreen,
  summarize,
  partitionFindings,
  groupUnitsByTriage,
  actionableClaims,
  hasContradiction,
  isMajorFinding,
} from "@/lib/verification-status";
import { createFrameDecoder } from "@/lib/verification-stream";
import { effectiveVerdict } from "@/lib/types";
import type { UnitFields } from "@/lib/verification-status";
import type {
  ClaimVerdict,
  SurfaceGating,
  VerificationRecord,
  VerificationStatus,
  VerifiedClaim,
  VerifiedUnit,
  VerifyFrame,
} from "@/lib/types";

type Props = {
  /** Start a run as soon as the panel mounts with no record. Set after a
   *  first save so every carousel is checked without a click. */
  autoRun?: boolean;
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
 * What the second research pass found before it proposed anything.
 *
 * "supports" is the outcome worth having: the first-pass checker flagged the
 * line, the deeper search vindicated it, and no edit is proposed at all.
 */
type Research = {
  finding: "supports" | "contradicts" | "none";
  summary: string;
  sourceUrl?: string;
  sourceTitle?: string;
  supportingQuote?: string;
};

type DraftedFix = { current: UnitFields; suggestions: Suggestion[]; research?: Research };

/**
 * Live progress of a streaming run.
 *
 * There is no `pending` state and there must not be one: every unit is
 * dispatched in a single pass, so from the first tick they are all in flight.
 * Showing some rows as "waiting" would be exactly the invented progress this
 * change exists to remove.
 */
type RunProgress = {
  order: { id: string; label: string }[];
  done: Record<string, VerifiedUnit>;
  /** Units are all in; the cross-unit consistency pass is running. */
  conflictPass: boolean;
};

/**
 * Elapsed-time readout for the running check.
 *
 * Sits beside a real count now ("3 of 6"), which the stream makes honest — the
 * earlier version had only this, because the route returned every unit at once
 * and any percentage would have been invented.
 */
function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (
    <span style={{ fontFamily: "var(--font-mono, 'Fira Code', monospace)", fontVariantNumeric: "tabular-nums" }}>
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

const STATUS_COLOR: Record<VerificationStatus, string> = {
  green: "var(--success)",
  amber: "var(--warning)",
  red: "var(--error)",
};

// Verdict words describe the content, not a grade. "Failed" read as an
// accusation against copy where nothing had failed — 13 claims simply wanted a
// look.
const STATUS_LABEL: Record<VerificationStatus, string> = {
  green: "Nothing contradicted",
  amber: "Partly unchecked",
  red: "Contradictions found",
};

/** Field keys as they appear in the editor, not as they appear in the JSON. */
const FIELD_LABEL: Record<string, string> = {
  headline: "Headline",
  subline: "Subline",
  sourceNote: "Trust liner",
  body: "Body",
  citation: "Citation",
  points: "Recap points",
  caption: "Caption",
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

/** A unit still in flight. */
function RunningDot() {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        display: "inline-block",
        background: "var(--accent)",
        // pulse is a real opacity animation. The shimmer keyframe this replaces
        // moves background-position, which does nothing to a flat background —
        // the old dot never actually animated.
        animation: "pulse 1s ease-in-out infinite",
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

/**
 * One line describing what a unit needs, not what was examined.
 *
 * Reports raw totals nowhere: counting framing lines and common-knowledge
 * advice as deficiencies made every unit look broken.
 */
function summarizeUnit(unit: VerifiedUnit): string {
  const fail = unit.claims.filter(isMajorFinding).length;
  if (fail > 0) return `${fail} claim${fail > 1 ? "s" : ""} contradicted by sources`;

  const { high, low, resolved, framing } = partitionFindings(unit);
  const unsourced = high.length + low.length;
  if (resolved.length > 0) {
    return unsourced > 0
      ? `${resolved.length} sourced, ${unsourced} unsourced`
      : `${resolved.length} claim${resolved.length > 1 ? "s" : ""} sourced`;
  }
  if (unsourced > 0) {
    return `${unsourced} claim${unsourced > 1 ? "s" : ""} checked, nothing contradicted`;
  }
  if (framing.length > 0) return "Framing only, nothing to check";
  return "Nothing to check";
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
  autoRun = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openUnits, setOpenUnits] = useState<string[]>([]);
  const [draftingUnits, setDraftingUnits] = useState<string[]>([]);
  const [pendingOverride, setPendingOverride] = useState<string | null>(null);
  const [fixes, setFixes] = useState<Record<string, DraftedFix>>({});
  /** `${unitId}::${suggestionIndex}` for every fix written into the carousel. */
  const [appliedFixes, setAppliedFixes] = useState<string[]>([]);
  const [quietOpen, setQuietOpen] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  /** verifiedAt of the record we already auto-drafted for, so a re-render can't refire. */
  const autoDraftedFor = useRef<string | null>(null);

  // Leaving the screen cancels the run — say so and mean it.
  useEffect(() => () => abortRef.current?.abort(), []);
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!autoRun || record || autoRanRef.current) return;
    autoRanRef.current = true;
    void runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, record]);

  const isOpen = (id: string) => openUnits.includes(id);
  const toggleOpen = (id: string) =>
    setOpenUnits((o) => (o.includes(id) ? o.filter((u) => u !== id) : [...o, id]));

  /** One claim row: verdict, evidence, and the override controls. */
  function renderClaim(unitId: string, claim: VerifiedClaim) {
    const overriding = pendingOverride === claim.id;
    return (
      <div key={claim.id} style={claimStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Dot status={verdictStatus(claim)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>{claim.text}</div>
            <div style={{ ...subtleStyle, marginTop: 3 }}>
              {verdictLabel(claim)}
              {claim.overriddenTo && ` (checker said: ${claim.verdict})`}
              {claim.reasoning ? `, ${claim.reasoning}` : ""}
            </div>

            {claim.supportingQuote && (
              <div style={quoteStyle}>
                <span style={{ fontStyle: "normal", color: "var(--subtle, var(--muted))" }}>
                  source says:{" "}
                </span>
                &ldquo;{claim.supportingQuote}&rdquo;
              </div>
            )}

            {claim.sourceUrl && (
              <a href={claim.sourceUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {claim.sourceTitle || claim.sourceUrl}
              </a>
            )}

            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              {claim.overriddenTo ? (
                <Button onClick={() => override(unitId, claim.id, null)} disabled={busy}>
                  {overriding ? "Saving…" : "Undo override"}
                </Button>
              ) : (
                <>
                  {effectiveVerdict(claim) !== "pass" && (
                    <Button onClick={() => override(unitId, claim.id, "pass")} disabled={busy}>
                      {overriding ? "Saving…" : "I verified this myself"}
                    </Button>
                  )}
                  {effectiveVerdict(claim) !== "fail" && (
                    <Button variant="danger" onClick={() => override(unitId, claim.id, "fail")} disabled={busy}>
                      Mark wrong
                    </Button>
                  )}
                </>
              )}
              {overriding && <Spinner size={12} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** What the second research pass concluded, above whatever it proposes. */
  function renderResearch(research: Research) {
    const backed = research.finding === "supports";
    return (
      <div
        style={{
          borderLeft: `2px solid ${backed ? "var(--success)" : "var(--border)"}`,
          paddingLeft: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
          {backed
            ? "Research backs this as written"
            : research.finding === "contradicts"
              ? "Research confirms the contradiction"
              : "No supporting research found"}
        </div>
        <div style={subtleStyle}>{research.summary}</div>
        {research.supportingQuote && (
          <div style={quoteStyle}>
            <span style={{ fontStyle: "normal", color: "var(--subtle, var(--muted))" }}>
              source says:{" "}
            </span>
            &ldquo;{research.supportingQuote}&rdquo;
          </div>
        )}
        {research.sourceUrl && (
          <a href={research.sourceUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            {research.sourceTitle || research.sourceUrl}
          </a>
        )}
      </div>
    );
  }

  /** The drafted rewrite for a unit: what changes, and the button that applies it. */
  function renderFixBox(unit: VerifiedUnit) {
    const drafted = fixes[unit.id];
    const drafting = draftingUnits.includes(unit.id);

    if (!drafted) {
      const stale = staleUnitIds.includes(unit.id);
      return (
        <div style={fixBoxStyle}>
          <div style={{ ...subtleStyle, marginBottom: 8 }}>
            {stale
              ? "Save your edits first — the drafter reads the saved version of this carousel, not what is on screen."
              : `Search the literature for this ${unit.kind} first, and rewrite it only if nothing backs it.`}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button onClick={() => suggestFix(unit.id)} disabled={drafting || busy || stale}>
              {drafting ? "Researching…" : "Look this up"}
            </Button>
            {drafting && <Spinner size={12} />}
          </div>
        </div>
      );
    }

    return (
      <div style={fixBoxStyle}>
        {drafted.research && renderResearch(drafted.research)}

        {/* Vindicated and nothing to change: the whole point of researching
            first is that this branch exists and proposes no edit. */}
        {drafted.suggestions.length === 0 && (
          <div style={subtleStyle}>
            {drafted.research?.finding === "supports"
              ? "Nothing to change. Mark the claim verified if you agree with the source above."
              : "No rewrite drafted. The line may still be fine as written, the search just could not settle it."}
          </div>
        )}

        {drafted.suggestions.map((s, si) => {
          const key = `${unit.id}::${si}`;
          const applied = appliedFixes.includes(key);
          return (
            <div key={si} style={{ marginBottom: si === drafted.suggestions.length - 1 ? 0 : 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {drafted.suggestions.length === 1
                  ? "Suggested change"
                  : si === 0
                    ? "Minimal change"
                    : "Stronger rewrite"}
              </div>
              <div style={{ ...subtleStyle, marginBottom: 8 }}>{s.rationale}</div>

              {Object.entries(s.fields).map(([fieldKey, val]) => {
                const before = drafted.current[fieldKey];
                const fmt = (v: string | string[] | undefined) =>
                  Array.isArray(v) ? v.join(" · ") : (v ?? "");
                if (fmt(before) === fmt(val)) return null;
                return (
                  <div key={fieldKey} style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--subtle, var(--muted))",
                        marginBottom: 3,
                      }}
                    >
                      {FIELD_LABEL[fieldKey] ?? fieldKey}
                    </div>
                    <div style={beforeStyle}>{fmt(before) || <em>(empty)</em>}</div>
                    <div style={afterStyle}>{fmt(val) || <em>(empty)</em>}</div>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Button
                  variant={applied ? "selected" : "primary"}
                  onClick={() => applyFix(unit.id, si, s.fields, drafted.current)}
                  disabled={busy}
                >
                  {applied ? "Applied — apply again" : "Apply this fix"}
                </Button>
                {applied && (
                  <span style={{ ...subtleStyle, color: "var(--success)" }}>
                    Written into the {unit.kind}. Save the carousel to keep it.
                  </span>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={() => {
            setFixes((f) => { const n = { ...f }; delete n[unit.id]; return n; });
            setAppliedFixes((a) => a.filter((k) => !k.startsWith(`${unit.id}::`)));
          }}
          style={{ ...subtleStyle, background: "none", border: "none", cursor: "pointer", padding: "8px 0 0", fontFamily: "inherit" }}
        >
          Discard these drafts
        </button>
      </div>
    );
  }

  /** The quiet claims a unit recorded but does not raise. */
  function renderQuietToggle(unit: VerifiedUnit) {
    const p = partitionFindings(unit);
    // Everything that was checked and not contradicted: sourced claims and
    // unsourced ones alike. None of it is raised, all of it is readable.
    const hidden = [
      ...p.resolved.filter((c) => effectiveVerdict(c) === "pass"),
      ...p.high.filter((c) => !isMajorFinding(c)),
      ...p.low,
    ];
    if (hidden.length === 0) return null;
    const showQuiet = quietOpen === unit.id;
    return (
      <div>
        <button
          onClick={() => setQuietOpen(showQuiet ? null : unit.id)}
          style={{ ...subtleStyle, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontFamily: "inherit" }}
        >
          {showQuiet ? "Hide" : "Show"} the {hidden.length} other claim{hidden.length > 1 ? "s" : ""} checked here
          {p.framing.length > 0 &&
            ` (${p.framing.length} framing line${p.framing.length > 1 ? "s" : ""} not checked)`}
        </button>
        {showQuiet && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {hidden.map((c) => renderClaim(unit.id, c))}
          </div>
        )}
      </div>
    );
  }

  /** Everything inside an expanded unit, shared by both the red and amber groups. */
  function renderUnitBody(unit: VerifiedUnit) {
    if (unit.error) {
      return (
        <div style={{ ...subtleStyle, color: "var(--warning)" }}>
          <div style={{ fontWeight: 600, marginBottom: 3 }}>Check did not complete</div>
          <div style={{ fontFamily: "var(--font-mono, 'Fira Code', monospace)", fontSize: 12, marginBottom: 4 }}>
            {unit.error}
          </div>
          This unit&apos;s text was never assessed. It is not a verdict on the content, and
          re-checking is the fix.
        </div>
      );
    }
    if (unit.claims.length === 0) {
      return (
        <div style={subtleStyle}>
          No factual claims found in this unit. That is a normal result for copy that is framing
          rather than fact.
        </div>
      );
    }
    // A rewrite is only offered against a contradiction. An unsourced claim is
    // usually correct as written, and rewriting one is churn, not a fix.
    const showFix = unit.claims.some(isMajorFinding) && !!onApplyFix;
    return (
      <>
        {actionableClaims(unit).map((c) => renderClaim(unit.id, c))}
        {showFix && renderFixBox(unit)}
        {renderQuietToggle(unit)}
      </>
    );
  }

  // ─── Network ────────────────────────────────────────────────────────────────

  async function suggestFix(unitId: string, opts?: { silent?: boolean }) {
    setDraftingUnits((u) => (u.includes(unitId) ? u : [...u, unitId]));
    if (!opts?.silent) setError(null);
    try {
      const res = await fetch("/api/verify/suggest-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: carouselId, unitId, concise }),
      });
      const data = await res.json();
      if (!res.ok) {
        // A failed auto-draft must never take over the panel. The manual
        // "Suggest a fix" button is still there, and that is the recovery.
        if (!opts?.silent) setError(data.error ?? `Could not research this claim (${res.status})`);
        return;
      }
      setFixes((f) => ({
        ...f,
        [unitId]: {
          current: data.current,
          suggestions: data.suggestions ?? [],
          research: data.research,
        },
      }));
    } catch {
      if (!opts?.silent) setError("Could not reach the research pass.");
    } finally {
      setDraftingUnits((u) => u.filter((x) => x !== unitId));
    }
  }

  /**
   * Research contradicted units as soon as a run lands.
   *
   * Red only, which is now the only thing the panel raises at all. The second
   * pass often comes back "supports" and proposes no edit — that outcome is
   * worth having ready, because it is the difference between the panel telling
   * you to change a true line and telling you it checked again and it stands.
   */
  async function autoDraftFixes(rec: VerificationRecord) {
    if (!onApplyFix) return;
    if (autoDraftedFor.current === rec.verifiedAt) return;
    autoDraftedFor.current = rec.verifiedAt;

    // Skip units the user has edited since the check. suggest-fix reads the
    // SAVED carousel, so drafting for one would rewrite text that is already
    // gone and show a "before" that never matches the screen.
    const stale = new Set(staleUnitIds);
    const queue = rec.units.filter((u) => hasContradiction(u) && !stale.has(u.id)).map((u) => u.id);
    if (queue.length === 0) return;
    // Two at a time: enough to hide the latency, gentle on the shared rate limit.
    const worker = async () => {
      for (;;) {
        const id = queue.shift();
        if (!id) return;
        await suggestFix(id, { silent: true });
      }
    };
    await Promise.all([worker(), worker()]);
  }

  function handleFrame(frame: VerifyFrame) {
    if (frame.t === "start") {
      setProgress({ order: frame.units, done: {}, conflictPass: false });
    } else if (frame.t === "unit") {
      setProgress((p) => (p ? { ...p, done: { ...p.done, [frame.unit.id]: frame.unit } } : p));
    } else if (frame.t === "phase") {
      setProgress((p) => (p ? { ...p, conflictPass: true } : p));
    } else if (frame.t === "done") {
      onRecordChange(frame.record);
      setAppliedCount(0);
      if (frame.warning) setError(frame.warning);
      void autoDraftFixes(frame.record);
    } else {
      setError(frame.message);
    }
  }

  async function runVerify() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setBusy(true);
    setVerifying(true);
    setError(null);
    setFixes({});
    setAppliedFixes([]);
    setProgress({
      order: pendingUnitLabels.map((label, i) => ({ id: `planned-${i}`, label })),
      done: {},
      conflictPass: false,
    });

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "carousel", id: carouselId, stream: true }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Verification failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const textDecoder = new TextDecoder();
      const frames = createFrameDecoder();
      let settled = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const frame of frames.push(textDecoder.decode(value, { stream: true }))) {
          handleFrame(frame);
          if (frame.t === "done" || frame.t === "error") settled = true;
        }
      }
      for (const frame of frames.flush()) {
        handleFrame(frame);
        if (frame.t === "done" || frame.t === "error") settled = true;
      }

      // The body ended without a terminal frame — the function was cut off
      // mid-run. Say so rather than leaving the panel looking finished.
      if (!settled) setError("The check stopped before it finished. Re-check to complete it.");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError("Could not reach the verifier. Check your connection and retry.");
    } finally {
      setBusy(false);
      setVerifying(false);
      setProgress(null);
      abortRef.current = null;
    }
  }

  async function override(unitId: string, claimId: string, verdict: ClaimVerdict | null) {
    setBusy(true);
    setPendingOverride(claimId);
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
      setPendingOverride(null);
    }
  }

  /**
   * Write one drafted suggestion into the carousel.
   *
   * Two things here used to be wrong, and together they read as "apply does
   * nothing":
   *
   *   1. The drafts for the unit were deleted on apply. Since applying also
   *      makes the unit stale, and a stale unit cannot be re-drafted until the
   *      carousel is saved, the entire fix box vanished the instant you clicked
   *      it — including the other option you had not chosen yet. The drafts now
   *      stay, and the button that was used says so.
   *   2. Only the suggestion's own fields were written. A second suggestion that
   *      omitted a field would inherit whatever the first one had left there.
   *      Both suggestions are written against `current`, so applying either one
   *      is a full replacement of the unit, not a patch on top of the last click.
   */
  function applyFix(unitId: string, index: number, fields: UnitFields, current: UnitFields) {
    onApplyFix?.(unitId, { ...current, ...fields });
    setAppliedCount((n) => n + 1);
    setAppliedFixes((a) => {
      const key = `${unitId}::${index}`;
      // Only one suggestion per unit is in force at a time — applying the other
      // overwrites it, so it must not read as though both landed.
      const kept = a.filter((k) => !k.startsWith(`${unitId}::`));
      return [...kept, key];
    });
  }

  // ─── Running ────────────────────────────────────────────────────────────────
  // Real progress: the route streams each unit as it settles, so the rows tick
  // off against work that actually happened.
  if (verifying) {
    const rows = progress?.order ?? [];
    const doneCount = Object.keys(progress?.done ?? {}).length;
    // The planned ids are placeholders until the start frame lands; once real
    // ids arrive, a row is done when its own id is in the map.
    const settledFor = (id: string) => progress?.done[id];

    return (
      <div style={panelStyle}>
        <div style={headerRow}>
          <div>
            <div style={titleStyle}>Checking claims</div>
            <div style={{ ...subtleStyle, marginTop: 2 }}>
              Each unit is read for factual claims, then searched against real sources.
            </div>
          </div>
          <div style={{ ...subtleStyle, fontFamily: "var(--font-mono, 'Fira Code', monospace)", textAlign: "right", flexShrink: 0 }}>
            <div>
              {doneCount} of {rows.length || "…"}
            </div>
            <Elapsed />
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((row, i) => {
            const unit = settledFor(row.id);
            return (
              <div
                key={row.id}
                style={{
                  ...rowStyle,
                  cursor: "default",
                  animation: "fadeIn 220ms ease-out both",
                  animationDelay: `${Math.min(i * 80, 400)}ms`,
                }}
              >
                {unit ? <Dot status={deriveUnitStatus(unit)} /> : <RunningDot />}
                <span style={{ fontWeight: 500, minWidth: 74, textAlign: "left" }}>{row.label}</span>
                <span style={{ ...subtleStyle, flex: 1, textAlign: "left" }}>
                  {unit
                    ? unit.error
                      ? "Could not be checked"
                      : summarizeUnit(unit)
                    : "Reading claims, searching for sources…"}
                </span>
              </div>
            );
          })}
        </div>

        {progress?.conflictPass && (
          <div style={{ ...subtleStyle, marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner size={11} /> Every unit is in. Checking them against each other for
            contradictions…
          </div>
        )}

        <div style={{ ...subtleStyle, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          Units run in parallel, so this takes about as long as the slowest one — usually
          under a minute. Leaving this screen cancels the run.
        </div>
        {error && <div style={errorStyle}>{error}</div>}
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

  // ─── Verified ───────────────────────────────────────────────────────────────

  const status = deriveRecordStatus(record);
  const counts = summarize(record);
  const groups = groupUnitsByTriage(record);
  const staleSet = new Set(staleUnitIds);
  const erroredUnits = record.units.filter((u) => u.error);
  const checkedCount = record.units.length;
  const plannedCount = record.unitsPlanned ?? checkedCount;

  // Advisory by default. The policy lives in DEFAULT_GATING and is passed in;
  // falling back to "block" here is how this footer came to claim a block that
  // stopped existing when verification went advisory.
  const amberAction = gating?.amber ?? "warn";
  const redAction = gating?.red ?? "warn";

  /** A collapsed unit row — used by the amber group and the clean fold-out. */
  function unitRow(unit: VerifiedUnit) {
    const open = isOpen(unit.id);
    const stale = staleSet.has(unit.id);
    return (
      <div key={unit.id}>
        <button
          onClick={() => toggleOpen(unit.id)}
          style={{ ...rowStyle, opacity: stale ? 0.55 : 1, background: open ? "var(--surface-h)" : "transparent" }}
        >
          <Dot status={deriveUnitStatus(unit)} />
          <span style={{ fontWeight: 500, minWidth: 82, textAlign: "left" }}>{unit.label}</span>
          <span style={{ ...subtleStyle, flex: 1, textAlign: "left" }}>
            {stale
              ? "Edited since this check"
              : unit.error
                ? unit.error
                : isVacuouslyGreen(unit)
                  ? "No factual claims to verify"
                  : summarizeUnit(unit)}
          </span>
          <span style={{ ...subtleStyle, fontSize: 12 }}>{open ? "Hide" : "Details"}</span>
        </button>
        {open && <div style={detailWrap}>{renderUnitBody(unit)}</div>}
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {/* Status */}
      <div style={headerRow}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ paddingTop: 4 }}>
            <Dot status={status} size={10} />
          </div>
          <div>
            <div style={titleStyle}>{STATUS_LABEL[status]}</div>
            <div style={{ ...subtleStyle, marginTop: 2, fontFamily: "var(--font-mono, 'Fira Code', monospace)" }}>
              {counts.findings === 0
                ? `Nothing to act on · ${checkedCount} units checked`
                : `${counts.findings} to review · ${checkedCount} units checked`}
              {counts.overridden > 0 && ` · ${counts.overridden} overridden`}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {busy && <Spinner size={12} />}
          <Button onClick={runVerify} disabled={busy}>
            {busy ? "Checking…" : "Re-check"}
          </Button>
        </div>
      </div>

      {/* Applied fixes live in the editor, not in storage, and suggest-fix and
          re-check both read storage. Saving is what closes that gap. */}
      {appliedCount > 0 && (
        <div style={{ ...noticeStyle, borderColor: "var(--accent-mid)" }}>
          {appliedCount} fix{appliedCount > 1 ? "es" : ""} applied to the carousel. Save before
          re-checking, or the check reads the text you just replaced.
        </div>
      )}

      {/* Notices */}
      {record.partial && (
        erroredUnits.length > 0 ? (
          <div style={{ ...noticeStyle, borderColor: "var(--warning)" }}>
            {erroredUnits.length} of {plannedCount} unit{plannedCount > 1 ? "s" : ""} could not be
            checked: {erroredUnits[0].error}
            {erroredUnits.length > 1 && ` (and ${erroredUnits.length - 1} more with the same fault)`}
          </div>
        ) : (
          <div style={noticeStyle}>
            Run ended early — {checkedCount} of {plannedCount} units finished. Re-check to fill the gaps.
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

      {/* ── Needs a decision ──────────────────────────────────────────────── */}
      {groups.decide.length > 0 && (
        <div style={groupStyle}>
          <div style={groupHeader}>
            <Label kind="section" style={{ color: "var(--error)", marginBottom: 0 }}>
              Needs a decision
            </Label>
            <span style={subtleStyle}>
              {groups.decide.length} unit{groups.decide.length > 1 ? "s" : ""} contradicted by sources
            </span>
          </div>
          {groups.decide.map((unit) => (
            <div key={unit.id} style={{ ...decideCard, opacity: staleSet.has(unit.id) ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Dot status="red" />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{unit.label}</span>
                <span style={{ ...subtleStyle, flex: 1 }}>
                  {staleSet.has(unit.id) ? "Edited since this check" : summarizeUnit(unit)}
                </span>
                {draftingUnits.includes(unit.id) && (
                  <span style={{ ...subtleStyle, display: "flex", alignItems: "center", gap: 6 }}>
                    <Spinner size={11} /> looking up the research
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {renderUnitBody(unit)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Worth a look ─────────────────────────────────────────────────── */}
      {groups.look.length > 0 && (
        <div style={groupStyle}>
          <div style={groupHeader}>
            <Label kind="section" style={{ color: "var(--warning)", marginBottom: 0 }}>
              Not checked
            </Label>
            <span style={subtleStyle}>
              {groups.look.length} unit{groups.look.length > 1 ? "s" : ""} the run could not read
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {groups.look.map(unitRow)}
          </div>
        </div>
      )}

      {/* ── Clean ────────────────────────────────────────────────────────── */}
      {groups.clean.length > 0 && (
        <div style={groupStyle}>
          <div style={groupHeader}>
            <Label kind="section" style={{ color: "var(--success)", marginBottom: 0 }}>
              Clean
            </Label>
            <span style={subtleStyle}>
              {groups.clean.map((u) => u.label).join(", ")}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {groups.clean.map(unitRow)}
          </div>
        </div>
      )}

      <div style={{ ...subtleStyle, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        {redAction === "block" || amberAction === "block"
          ? `${redAction === "block" ? "Contradicted" : "Unresolved"} claims block download.`
          : "Advisory only. Nothing here blocks your download, the call is yours."}
        {groups.decide.length > 0
          ? " Contradicted claims are worth a look before this goes out."
          : " Only claims the sources actively contradict are raised here."}
      </div>

      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
// Inline to match the surrounding carousel step components, which do not use
// CSS modules. No box-shadow anywhere: DESIGN.md forbids it in light mode.

// Sized a step up the DESIGN.md scale from the rest of the preview chrome. This
// panel is read, not glanced at — every row is a sentence about a claim — and at
// 12/13px it was the densest block on the page.
const panelStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  borderRadius: 10,
  padding: 20,
  fontFamily: "Inter, system-ui, sans-serif",
  fontSize: 14,
  color: "var(--text)",
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle: React.CSSProperties = { fontSize: 16, fontWeight: 600 };

const subtleStyle: React.CSSProperties = { fontSize: 13, color: "var(--muted)", lineHeight: 1.5 };

const groupStyle: React.CSSProperties = { marginTop: 20 };

const groupHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  marginBottom: 8,
  flexWrap: "wrap",
};

/** Elevation by background shift, never a shadow — DESIGN.md. */
const decideCard: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderLeft: "3px solid var(--error)",
  borderRadius: "0 8px 8px 0",
  background: "var(--bg)",
  padding: "14px 16px",
  marginBottom: 10,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 10px",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 14,
  color: "var(--text)",
  fontFamily: "inherit",
  background: "transparent",
};

const detailWrap: React.CSSProperties = {
  padding: "8px 10px 14px 28px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const claimStyle: React.CSSProperties = {
  borderLeft: "2px solid var(--border)",
  paddingLeft: 12,
};

const quoteStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--muted)",
  fontStyle: "italic",
  marginTop: 6,
  lineHeight: 1.6,
};

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--muted)",
  textDecoration: "underline",
  display: "inline-block",
  marginTop: 4,
  wordBreak: "break-all",
};

const fixBoxStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 14,
  marginBottom: 4,
  background: "var(--surface)",
};

/** Struck-through original. Colour carries no meaning beyond "this is the old one". */
const beforeStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--muted)",
  textDecoration: "line-through",
  marginBottom: 2,
};

const afterStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--text)",
  borderLeft: "2px solid var(--success)",
  paddingLeft: 8,
};

const noticeStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  fontSize: 13,
  color: "var(--muted)",
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 13,
  color: "var(--error)",
  lineHeight: 1.5,
};
