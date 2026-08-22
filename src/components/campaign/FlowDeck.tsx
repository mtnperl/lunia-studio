"use client";
// A deck of campaign emails produced by importing a Klaviyo flow. Each email is
// its own CampaignContent, edited one at a time in the existing CampaignEditor
// (Copy HTML / Save / Improve with Claude all come along for free). Switching
// emails remounts the editor via `key` so its internal state resets cleanly.
import { useState, useRef, useEffect } from "react";
import type { CampaignContent, CampaignBlock } from "@/lib/types";
import { blocksToSourceText } from "@/lib/campaign-layout-prompts";
import {
  CAMPAIGN_SHAPES,
  savedShapeToCampaignShape,
  type CampaignShape,
  type SavedShape,
} from "@/lib/campaign-shapes";
import ShapeGallery from "./ShapeGallery";
import CampaignEditor, { type SeededPending } from "./CampaignEditor";
import { Spinner } from "./Loaders";

export type DeckEmail = {
  emailId: string;
  position: number;
  subject: string;
  topic: string;
  content: CampaignContent;
  savedId: string | null;
  flagged?: boolean;
  /** True when this email's copy/images came from the deterministic fallback
   *  structuring instead of the LLM pass (no text, LLM error, or unparseable
   *  response) — worth a closer look, the hero/CTA guesses may be off. */
  usedFallback?: boolean;
};

export default function FlowDeck({
  flowName,
  initialEmails,
  onExit,
}: {
  flowName: string;
  initialEmails: DeckEmail[];
  onExit: () => void;
}) {
  const [emails, setEmails] = useState<DeckEmail[]>(initialEmails);
  const [index, setIndex] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllMsg, setSaveAllMsg] = useState<string | null>(null);
  const current = emails[index];

  // ── Flow-level "Make it all visual" ──────────────────────────────────────
  // Restructures every email in the flow. Deliberately SEQUENTIAL and driven
  // from the client, one HTTP request per email: a server-side loop over six
  // emails would not fit a single function invocation, and firing six at once
  // buys nothing (checkRateLimit is an hourly counter, not a concurrency gate,
  // so parallel and sequential consume identical budget).
  //
  // Nothing is applied here. Each result is parked as a per-email pending
  // review, and the editor shows its before/after diff when you open that
  // email — the restructure is not fact-checked in code, so a human still has
  // to look at every one.
  type BatchStatus = "queued" | "running" | "done" | "failed" | "skipped";
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchStatus, setBatchStatus] = useState<Record<string, BatchStatus>>({});
  const [batchError, setBatchError] = useState<Record<string, string>>({});
  const [pendingByEmail, setPendingByEmail] = useState<Record<string, SeededPending>>({});
  // One shape for the WHOLE flow, so a series can be made to look like a
  // series. Defaults to model-chosen on purpose: emails in a flow do different
  // jobs, and forcing one shape on all of them would make the welcome and the
  // last call look identical. This is an override for coherence, not the
  // default behaviour.
  const [flowShape, setFlowShape] = useState<CampaignShape>(CAMPAIGN_SHAPES[0]!);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [savedShapes, setSavedShapes] = useState<SavedShape[]>([]);

  useEffect(() => {
    if (!shapePickerOpen) return;
    let alive = true;
    fetch("/api/campaign/shapes")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setSavedShapes(d as SavedShape[]); })
      .catch(() => { /* built-ins are enough */ });
    return () => { alive = false; };
  }, [shapePickerOpen]);
  // Set on unmount and by Stop. Read inside the loop so leaving the deck halts
  // the queue instead of letting it run on against a dead component.
  const abortRef = useRef(false);
  useEffect(() => () => { abortRef.current = true; }, []);

  function updateCurrent(patch: Partial<DeckEmail>) {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  /** Restructure one email. Returns true when a review was parked. */
  async function restructureOne(email: DeckEmail): Promise<boolean> {
    setBatchStatus((p) => ({ ...p, [email.emailId]: "running" }));
    setBatchError((p) => { const n = { ...p }; delete n[email.emailId]; return n; });
    try {
      const res = await fetch("/api/campaign/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: email.content.blocks,
          subject: email.content.subjectLines[email.content.selectedSubject] ?? email.subject,
          topic: email.topic,
          // The whole flow runs in one shape. The id, never its guidance:
          // guidance is resolved server-side.
          shapeId: flowShape.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.blocks)) {
        setBatchStatus((p) => ({ ...p, [email.emailId]: "failed" }));
        setBatchError((p) => ({ ...p, [email.emailId]: data.error ?? `Failed (${res.status})` }));
        return false;
      }
      setPendingByEmail((p) => ({
        ...p,
        [email.emailId]: {
          blocks: data.blocks as CampaignBlock[],
          meta: { topBanner: data.topBanner, promoBand: data.promoBand, ctaLabel: data.ctaLabel, theme: flowShape.theme },
          mode: "replace",
        },
      }));
      setBatchStatus((p) => ({ ...p, [email.emailId]: "done" }));
      return true;
    } catch (err) {
      setBatchStatus((p) => ({ ...p, [email.emailId]: "failed" }));
      setBatchError((p) => ({ ...p, [email.emailId]: err instanceof Error ? err.message : "Network error" }));
      return false;
    }
  }

  async function restructureAll() {
    if (batchRunning) return;
    abortRef.current = false;
    setBatchRunning(true);
    // Emails with almost no copy have nothing to restructure; mark them
    // skipped up front rather than spending a call to be told so.
    const plan = emails.map((e) => ({
      email: e,
      enough: blocksToSourceText(e.content.blocks).length >= 40,
    }));
    setBatchStatus(Object.fromEntries(plan.map((p) => [p.email.emailId, p.enough ? "queued" : "skipped"])));
    setBatchError({});
    try {
      for (const { email, enough } of plan) {
        if (abortRef.current) break;
        if (!enough) continue;
        await restructureOne(email);
      }
    } finally {
      setBatchRunning(false);
    }
  }

  function clearPendingFor(emailId: string) {
    setPendingByEmail((p) => { const n = { ...p }; delete n[emailId]; return n; });
  }

  async function saveAll() {
    if (savingAll) return;
    setSavingAll(true);
    setSaveAllMsg(null);
    try {
      const updated = await Promise.all(
        emails.map(async (e) => {
          try {
            const res = await fetch("/api/campaign/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: e.savedId ?? undefined, topic: e.topic, content: e.content }),
            });
            const data = await res.json();
            return res.ok && data.id ? { ...e, savedId: data.id as string } : e;
          } catch {
            return e;
          }
        }),
      );
      setEmails(updated);
      const ok = updated.filter((e) => e.savedId).length;
      setSaveAllMsg(ok === updated.length ? `Saved all ${ok} to the gallery ✓` : `Saved ${ok}/${updated.length} — retry the rest`);
    } finally {
      setSavingAll(false);
    }
  }

  return (
    <div>
      {/* Deck header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Imported from Klaviyo
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{flowName}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saveAllMsg && <span style={{ fontSize: 12, color: "var(--muted)" }}>{saveAllMsg}</span>}
          {batchRunning ? (
            <button
              onClick={() => { abortRef.current = true; }}
              title="Stop after the email currently in flight. Restructures already produced stay available to review."
              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <Spinner size={12} color="var(--text)" /> Stop
            </button>
          ) : (
            <>
            <button
              onClick={() => setShapePickerOpen((v) => !v)}
              title="Choose one shape for every email in this flow, so the series looks like a series. Defaults to letting the model pick per email."
              style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, background: shapePickerOpen ? "var(--accent-dim)" : "var(--surface)", color: "var(--text)", border: `1px solid ${shapePickerOpen ? "var(--accent)" : "var(--border)"}`, borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
            >
              Shape: {flowShape.name}
            </button>
            <button
              onClick={restructureAll}
              title={`Restructure every email in this flow${flowShape.guidance ? ` into the ${flowShape.name} shape` : ", letting the model pick a layout for each"}. Nothing is applied — each email gets a before/after review.`}
              style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
            >
              ✨ Make it all visual
            </button>
            </>
          )}
          <button
            onClick={saveAll}
            disabled={savingAll}
            className="btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {savingAll && <Spinner size={12} color="var(--bg)" />}
            {savingAll ? "Saving…" : "Save all to gallery"}
          </button>
          <button
            onClick={onExit}
            style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
          >
            New
          </button>
        </div>
      </div>

      {shapePickerOpen && (
        <div style={{ marginBottom: 16 }}>
          <ShapeGallery
            shapes={[...CAMPAIGN_SHAPES, ...savedShapes.map(savedShapeToCampaignShape)]}
            busyShapeId={null}
            onPick={(shape) => { setFlowShape(shape); setShapePickerOpen(false); }}
            onClose={() => setShapePickerOpen(false)}
          />
        </div>
      )}

      {/* Batch restructure progress. Rows stay after the run so a failure is
          still actionable (per-row Retry) rather than a transient toast. */}
      {Object.keys(batchStatus).length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 16, background: "var(--surface)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
              Make it all visual
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {(() => {
                const v = Object.values(batchStatus);
                const done = v.filter((x) => x === "done").length;
                const failed = v.filter((x) => x === "failed").length;
                const skipped = v.filter((x) => x === "skipped").length;
                const queued = v.filter((x) => x === "queued" || x === "running").length;
                return [
                  `${done} ready to review`,
                  failed ? `${failed} failed` : null,
                  skipped ? `${skipped} skipped` : null,
                  queued ? `${queued} queued` : null,
                ].filter(Boolean).join(" · ");
              })()}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {emails.map((e) => {
              const st = batchStatus[e.emailId];
              if (!st) return null;
              const mark =
                st === "done" ? "✓" : st === "failed" ? "!" : st === "running" ? "•" : st === "skipped" ? "–" : "○";
              const color =
                st === "done" ? "var(--accent)" : st === "failed" ? "var(--error)" : "var(--muted)";
              return (
                <div key={e.emailId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ width: 12, textAlign: "center", color, fontWeight: 700 }}>{mark}</span>
                  <button
                    onClick={() => setIndex(emails.findIndex((x) => x.emailId === e.emailId))}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={st === "done" ? "Open this email to review its before/after" : e.subject}
                  >
                    E{e.position} · {e.subject || "(no subject)"}
                  </button>
                  <span style={{ fontSize: 11, color, whiteSpace: "nowrap" }}>
                    {st === "skipped" ? "too little copy" : st === "failed" ? (batchError[e.emailId] ?? "failed") : st}
                  </span>
                  {st === "failed" && !batchRunning && (
                    <button
                      onClick={() => restructureOne(e)}
                      style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit" }}
                    >Retry</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Email switcher E1 … EN */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {emails.map((e, i) => {
          const active = i === index;
          return (
            <button
              key={e.emailId}
              onClick={() => setIndex(i)}
              title={e.subject || `Email ${i + 1}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                maxWidth: 220, padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-dim)" : "var(--surface)",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: active ? "var(--accent)" : "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                E{e.position}
                {e.savedId && <span title="Saved to gallery" style={{ color: "var(--accent)" }}>✓</span>}
                {e.flagged && <span title="No content found — fill this one in manually" style={{ color: "var(--error)" }}>!</span>}
                {!e.flagged && e.usedFallback && <span title="AI structuring didn't run — hero/CTA/blocks were guessed, review closely" style={{ color: "var(--warning)" }}>~</span>}
                {pendingByEmail[e.emailId] && <span title="A restructure is waiting for your review" style={{ color: "var(--accent)" }}>✨</span>}
              </span>
              <span style={{ fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 196 }}>
                {e.subject || "(no subject)"}
              </span>
            </button>
          );
        })}
      </div>

      {current?.flagged && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
          This email had no readable HTML or text in Klaviyo, so it came in empty. Add copy and images below, or skip it.
        </div>
      )}

      {!current?.flagged && current?.usedFallback && (
        <div style={{ background: "rgba(184,96,64,0.08)", border: "1px solid rgba(184,96,64,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--muted)" }}>
          AI structuring did not run for this email (no response, or it could not be parsed), so the hero image, CTA, and text blocks were assembled with a simple fallback instead of being intelligently chosen. Double-check them before saving.
        </div>
      )}

      {current && (
        <CampaignEditor
          // initialPending is read once on mount, so the key carries whether a
          // review is parked: a restructure landing for the email you are
          // already looking at remounts the editor and the review appears,
          // instead of only showing up if you navigate away and back.
          // Accepting/discarding flips it back, and the accepted content has
          // already been pushed up through onChange by then.
          key={`${current.emailId}${pendingByEmail[current.emailId] ? ":pending" : ""}`}
          topic={current.topic}
          content={current.content}
          savedId={current.savedId}
          onChange={(next: CampaignContent) => updateCurrent({ content: next })}
          onSaved={(id: string) => updateCurrent({ savedId: id })}
          initialPending={pendingByEmail[current.emailId] ?? null}
          onPendingResolved={() => clearPendingFor(current.emailId)}
        />
      )}
    </div>
  );
}
