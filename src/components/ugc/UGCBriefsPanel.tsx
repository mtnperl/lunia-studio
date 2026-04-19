"use client";

import { useState, useEffect, useCallback } from "react";
import { ANGLE_LIBRARY } from "@/lib/angleLibrary";
import type { UGCBrief, BriefScript, BriefComplianceFlag, UGCBriefDoc } from "@/lib/types";
import UGCCRTLoader from "./UGCCRTLoader";

type PanelView = "list" | "create" | "edit";

const DEFAULT_BRAND = `Lunia Life is a hormone-support supplement brand for women in perimenopause and menopause (ages 35-60). Our flagship product supports hormonal balance, sleep quality, energy, and mood through clinically-informed botanicals. We are a direct-to-consumer brand built on trust, education, and real women's stories — not before-and-after photos or drug claims.`;

const EMPTY_DOC: UGCBriefDoc = {
  aboutBrand: DEFAULT_BRAND,
  whoWereLookingFor: "",
  theConcept: "",
  theSetup: "",
  whereToFilm: "",
  deliverables: "1 raw video (60-90 sec), B-roll footage if applicable, product shot in natural light. Delivered via Google Drive within 14 days of receiving the product.",
};

const EMPTY_SCRIPT: BriefScript = { videoHook: "", textHook: "", narrative: "", cta: "" };

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  const color = status === "approved" ? "var(--success)" : status === "archived" ? "var(--subtle)" : "var(--muted)";
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase",
      color, border: "1px solid var(--border)", borderRadius: 4, padding: "2px 7px",
    }}>
      {status}
    </span>
  );
}

function FlagList({ flags }: { flags: BriefComplianceFlag[] }) {
  if (!flags?.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
      {flags.map((f, i) => (
        <div key={i} style={{
          fontSize: 12,
          color: f.severity === "red" ? "var(--error)" : "var(--warning)",
          background: "var(--surface)",
          border: `1px solid ${f.severity === "red" ? "var(--error)" : "var(--warning)"}`,
          borderRadius: 4, padding: "3px 8px",
        }}>
          {f.severity === "red" ? "●" : "◐"} {f.rule} — <em>&ldquo;{f.match}&rdquo;</em>
        </div>
      ))}
    </div>
  );
}

function ScriptField({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: "100%", padding: "10px 12px", fontSize: 14, lineHeight: 1.6,
          fontFamily: "var(--font-ui)", color: "var(--text)", background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 6, resize: "vertical",
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--border-strong)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

function DocField({ label, value, onChange, rows = 4, hint }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: hint ? 2 : 6 }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: "var(--subtle)", margin: "0 0 6px" }}>{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: "100%", padding: "10px 12px", fontSize: 14, lineHeight: 1.6,
          fontFamily: "var(--font-ui)", color: "var(--text)", background: "var(--surface)",
          border: "1px solid var(--border)", borderRadius: 6, resize: "vertical",
          outline: "none", boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--border-strong)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
      />
    </div>
  );
}

// --- Main Panel ---
export default function UGCBriefsPanel({ onBack }: { onBack: () => void }) {
  const [view, setView] = useState<PanelView>("list");
  const [briefs, setBriefs] = useState<UGCBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<UGCBrief | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"ai" | "manual">("ai");

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ugc/briefs");
      if (res.ok) {
        const data = await res.json();
        setBriefs(Array.isArray(data) ? data : []);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBriefs(); }, [loadBriefs]);

  function openEdit(brief: UGCBrief) {
    setEditTarget(brief);
    setView("edit");
  }

  async function approveBrief(id: string) {
    await fetch(`/api/ugc/briefs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await loadBriefs();
  }

  async function archiveBrief(id: string) {
    await fetch(`/api/ugc/briefs/${id}/archive`, { method: "POST" });
    await loadBriefs();
  }

  async function deleteBrief(id: string) {
    if (!confirm("Delete this brief permanently?")) return;
    await fetch(`/api/ugc/briefs/${id}`, { method: "DELETE" });
    await loadBriefs();
  }

  async function copyShareLink(brief: UGCBrief) {
    const url = `${window.location.origin}/ugc/share/${brief.publicBriefId}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(brief.id);
    setTimeout(() => setCopiedId(null), 2000);
    // Mark as shared if not already
    if (!brief.sharedAt) {
      await fetch(`/api/ugc/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedAt: Date.now() }),
      });
      await loadBriefs();
    }
  }

  async function revokeBrief(id: string) {
    if (!confirm("Revoke this share link? The creator will see an access revoked page.")) return;
    await fetch(`/api/ugc/briefs/${id}/revoke`, { method: "POST" });
    await loadBriefs();
  }

  async function reshareBrief(id: string) {
    await fetch(`/api/ugc/briefs/${id}/reshare`, { method: "POST" });
    await loadBriefs();
  }

  const visible = showArchived ? briefs : briefs.filter((b) => b.status !== "archived");

  if (view === "create") {
    return (
      <BriefEditor
        brief={null}
        mode={createMode}
        onDone={async () => { await loadBriefs(); setView("list"); }}
        onCancel={() => setView("list")}
      />
    );
  }
  if (view === "edit" && editTarget) {
    return (
      <BriefEditor
        brief={editTarget}
        mode="edit"
        onDone={async () => { await loadBriefs(); setEditTarget(null); setView("list"); }}
        onCancel={() => { setEditTarget(null); setView("list"); }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Tracker
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Briefs</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button
            onClick={() => { setCreateMode("manual"); setView("create"); }}
            style={{
              fontSize: 13, fontWeight: 500, color: "var(--text)",
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 6, padding: "8px 14px", cursor: "pointer",
            }}
          >
            Write manually
          </button>
          <button
            onClick={() => { setCreateMode("ai"); setView("create"); }}
            style={{
              fontSize: 13, fontWeight: 500, color: "var(--bg)",
              background: "var(--accent)", border: "none",
              borderRadius: 6, padding: "8px 16px", cursor: "pointer",
            }}
          >
            Generate with AI
          </button>
        </div>
      </div>

      {loading ? (
        <UGCCRTLoader label="LOADING BRIEFS" />
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)", fontSize: 14 }}>
          No briefs yet. Generate one with AI or write manually.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((brief) => {
            const hasBeenShared = !!brief.sharedAt;
            const isRevoked = !!brief.revokedAt;
            return (
              <div
                key={brief.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 130px 90px 70px auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "var(--surface)",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  transition: "background 150ms ease",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-h)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>
                    {brief.title ?? (brief as unknown as Record<string, unknown>)["label"] as string ?? "(untitled)"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{brief.conceptLabel}</div>
                  {(brief.complianceFlags?.length ?? 0) > 0 && (
                    <div style={{ marginTop: 4, fontSize: 11, color: brief.complianceFlags?.some((f) => f.severity === "red") ? "var(--error)" : "var(--warning)" }}>
                      {brief.complianceFlags!.length} flag{brief.complianceFlags!.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {ANGLE_LIBRARY.find((a) => a.key === brief.angle)?.label ?? brief.angle}
                </div>
                <StatusPill status={brief.status} />
                <div style={{ fontSize: 12, color: "var(--subtle)", fontFamily: "var(--font-mono)" }}>
                  {fmtDate(brief.updatedAt)}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button onClick={() => openEdit(brief)} style={actionBtn}>Edit</button>
                  {brief.status !== "approved" && brief.status !== "archived" && (
                    <button onClick={() => approveBrief(brief.id)} style={{ ...actionBtn, color: "var(--success)" }}>Approve</button>
                  )}
                  {brief.status !== "archived" && !isRevoked && (
                    <button
                      onClick={() => copyShareLink(brief)}
                      style={{ ...actionBtn, color: copiedId === brief.id ? "var(--success)" : "var(--muted)" }}
                    >
                      {copiedId === brief.id ? "Copied!" : "Share"}
                    </button>
                  )}
                  {/* Revoke only after the brief has been shared */}
                  {hasBeenShared && !isRevoked && brief.status !== "archived" && (
                    <button onClick={() => revokeBrief(brief.id)} style={{ ...actionBtn, color: "var(--warning)" }}>Revoke</button>
                  )}
                  {/* Reshare after revoke */}
                  {isRevoked && (
                    <button onClick={() => reshareBrief(brief.id)} style={{ ...actionBtn, color: "var(--accent)" }}>Reshare</button>
                  )}
                  {brief.status !== "archived" && (
                    <button onClick={() => archiveBrief(brief.id)} style={actionBtn}>Archive</button>
                  )}
                  <button onClick={() => deleteBrief(brief.id)} style={{ ...actionBtn, color: "var(--error)" }}>Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: "var(--muted)",
  background: "none", border: "1px solid var(--border)",
  borderRadius: 4, padding: "4px 10px", cursor: "pointer",
};

// ─── Brief Editor ────────────────────────────────────────────────────────────

type EditorMode = "ai" | "manual" | "edit";

function BriefEditor({
  brief,
  mode,
  onDone,
  onCancel,
}: {
  brief: UGCBrief | null;
  mode: EditorMode;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isNew = !brief;
  const isManual = mode === "manual";

  // Step 1 only for AI-generated new briefs
  const [step, setStep] = useState<1 | 2>(isNew && !isManual ? 1 : 2);
  const [angleKey, setAngleKey] = useState(brief?.angle ?? "");
  const [conceptId, setConceptId] = useState<string>(brief?.conceptId ?? "");
  const [conceptLabel, setConceptLabel] = useState(brief?.conceptLabel ?? "");
  const [title, setTitle] = useState(brief?.title ?? "");
  const [extraNotes, setExtraNotes] = useState("");
  const [creatorName, setCreatorName] = useState(brief?.creatorName ?? "");

  const [doc, setDoc] = useState<UGCBriefDoc>(brief?.doc ?? EMPTY_DOC);
  const [script, setScript] = useState<BriefScript>(brief?.script ?? EMPTY_SCRIPT);
  const [flags, setFlags] = useState<BriefComplianceFlag[]>(brief?.complianceFlags ?? []);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState("");

  // Suggest-angle state
  const [suggestions, setSuggestions] = useState<{ angleKey: string; reason: string }[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  // Generate-concept state
  const [customConcept, setCustomConcept] = useState<{ label: string; videoHook: string; textHook: string; narrativeArc: string } | null>(null);
  const [generatingConcept, setGeneratingConcept] = useState(false);

  const selectedAngle = ANGLE_LIBRARY.find((a) => a.key === angleKey) ?? null;
  const selectedConcept = selectedAngle?.concepts.find((c) => c.id === conceptId) ?? null;

  function updateDoc(field: keyof UGCBriefDoc, value: string) {
    setDoc((prev) => ({ ...prev, [field]: value }));
  }

  async function suggestAngle() {
    if (!extraNotes.trim()) return;
    setSuggesting(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ugc/suggest-angle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorNotes: extraNotes }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } finally {
      setSuggesting(false);
    }
  }

  async function generateConcept() {
    if (!angleKey) return;
    setGeneratingConcept(true);
    setCustomConcept(null);
    try {
      const res = await fetch("/api/ugc/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle: angleKey, creatorNotes: extraNotes || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomConcept(data.concept);
        setConceptLabel(data.concept.label);
        setConceptId("");
      }
    } finally {
      setGeneratingConcept(false);
    }
  }

  async function generateScript() {
    setGenerating(true);
    setGenError("");
    try {
      let notesWithConcept = extraNotes;
      if (customConcept && !conceptId) {
        const seed = `Custom concept seed:\n- Video hook: ${customConcept.videoHook}\n- Text hook: ${customConcept.textHook}\n- Narrative arc: ${customConcept.narrativeArc}`;
        notesWithConcept = [seed, extraNotes].filter(Boolean).join("\n\n");
      }
      const res = await fetch("/api/ugc/briefs/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle: angleKey, conceptId: conceptId || null, conceptLabel, title, extraNotes: notesWithConcept || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setGenError(d.error ?? "Generation failed"); return; }
      const data = await res.json();
      setScript(data.script);
      setFlags(data.flags);
      setStep(2);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch("/api/ugc/briefs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            angle: angleKey || "other",
            conceptId: conceptId || null,
            conceptLabel: conceptLabel || title,
            title,
            doc,
            script,
            creatorName: creatorName || null,
          }),
        });
        if (res.ok) { onDone(); return; }
        const d = await res.json(); setGenError(d.error ?? "Save failed");
      } else {
        const res = await fetch(`/api/ugc/briefs/${brief!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, conceptLabel, doc, script, creatorName: creatorName || null, complianceFlags: flags }),
        });
        if (res.ok) { onDone(); return; }
        const d = await res.json(); setGenError(d.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  const isSectionDivider = (label: string) => (
    <div style={{
      marginTop: 32, marginBottom: 20,
      borderTop: "1px solid var(--border)",
      paddingTop: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--subtle)",
    }}>
      {label}
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Briefs
      </button>
      <h1 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>
        {isNew ? (isManual ? "Write brief" : "New brief") : "Edit brief"}
      </h1>

      {/* ── Step 1: AI angle/concept selection (new AI briefs only) ── */}
      {step === 1 && !isManual && (
        <div>
          <Field label="Creator name (optional)">
            <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="e.g. Michelle M." style={inputStyle} />
          </Field>

          <Field label="Creator notes (used by AI for angle + concept suggestions)">
            <textarea
              value={extraNotes}
              onChange={(e) => { setExtraNotes(e.target.value); setSuggestions([]); }}
              rows={3}
              placeholder="e.g. Nurse practitioner, 48, perimenopause symptoms, skeptical of supplements"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={suggestAngle} disabled={!extraNotes.trim() || suggesting} style={ghostBtn}>
                {suggesting ? "Thinking..." : "Suggest angle"}
              </button>
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {suggestions.map((s) => {
                  const a = ANGLE_LIBRARY.find((x) => x.key === s.angleKey);
                  if (!a) return null;
                  return (
                    <button key={s.angleKey} onClick={() => { setAngleKey(s.angleKey); setConceptId(""); setConceptLabel(""); setCustomConcept(null); setSuggestions([]); }}
                      style={{ textAlign: "left", padding: "10px 12px", background: angleKey === s.angleKey ? "var(--accent-dim)" : "var(--surface)", border: `1px solid ${angleKey === s.angleKey ? "var(--accent-mid)" : "var(--border)"}`, borderRadius: 6, cursor: "pointer" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.label}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 2 }}>{s.reason}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field label="Angle">
            <select value={angleKey} onChange={(e) => { setAngleKey(e.target.value); setConceptId(""); setConceptLabel(""); setCustomConcept(null); setSuggestions([]); }} style={selectStyle}>
              <option value="">— select angle —</option>
              {ANGLE_LIBRARY.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
            {selectedAngle && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{selectedAngle.description}</p>}
          </Field>

          {selectedAngle && (
            <Field label="Concept">
              <select value={conceptId} onChange={(e) => { const cid = e.target.value; setConceptId(cid); setCustomConcept(null); const c = selectedAngle.concepts.find((x) => x.id === cid); setConceptLabel(c?.label ?? ""); }} style={selectStyle}>
                <option value="">— choose concept or generate one —</option>
                {selectedAngle.concepts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {!conceptId && (
                <div style={{ marginTop: 8 }}>
                  <button onClick={generateConcept} disabled={generatingConcept} style={ghostBtn}>
                    {generatingConcept ? "Generating..." : "Generate concept for me"}
                  </button>
                </div>
              )}
            </Field>
          )}

          {customConcept && !conceptId && (
            <div style={{ marginBottom: 20, padding: 14, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 10px" }}>Generated concept</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>{customConcept.label}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}><strong>Hook:</strong> {customConcept.videoHook}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}><strong>Arc:</strong> {customConcept.narrativeArc}</p>
            </div>
          )}

          <Field label="Concept label (editable)">
            <input value={conceptLabel} onChange={(e) => setConceptLabel(e.target.value)} placeholder="e.g. The 3am wake-up fix" style={inputStyle} />
          </Field>

          <Field label="Brief title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Michelle — perimenopause sleep angle" style={inputStyle} />
          </Field>

          {genError && <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{genError}</p>}

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={generateScript} disabled={!angleKey || !conceptLabel || !title || generating} style={primaryBtn(generating || !angleKey || !conceptLabel || !title)}>
              {generating ? "Generating..." : "Generate draft"}
            </button>
          </div>

          {selectedConcept && (
            <div style={{ marginTop: 32, padding: 16, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 10px" }}>Concept seed</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}><strong>Hook:</strong> {selectedConcept.videoHook}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}><strong>Arc:</strong> {selectedConcept.narrativeArc}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2 / Edit / Manual: full brief editor ── */}
      {(step === 2 || isManual || !isNew) && (
        <div>
          {isNew && !isManual && (
            <div style={{ marginBottom: 20, padding: 12, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
              <strong style={{ color: "var(--text)" }}>{title}</strong> — {ANGLE_LIBRARY.find((a) => a.key === angleKey)?.label} / {conceptLabel}
              <button onClick={() => setStep(1)} style={{ marginLeft: 12, fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>change</button>
            </div>
          )}

          {/* Core fields always visible */}
          <Field label="Brief title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Perimenopause — Sleep angle" style={inputStyle} />
          </Field>
          <Field label="Creator name (optional)">
            <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="e.g. Michelle M." style={inputStyle} />
          </Field>
          {isManual && (
            <Field label="Angle">
              <select value={angleKey} onChange={(e) => setAngleKey(e.target.value)} style={selectStyle}>
                <option value="">— select angle —</option>
                {ANGLE_LIBRARY.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </Field>
          )}

          {/* ── Brief document ── */}
          {isSectionDivider("Brief document")}
          <DocField label="About the brand" value={doc.aboutBrand} onChange={(v) => updateDoc("aboutBrand", v)} rows={5}
            hint="Who Lunia Life is and why it matters" />
          <DocField label="Who we're looking for" value={doc.whoWereLookingFor} onChange={(v) => updateDoc("whoWereLookingFor", v)} rows={4}
            hint="Creator profile, audience, communication style" />
          <DocField label="The concept" value={doc.theConcept} onChange={(v) => updateDoc("theConcept", v)} rows={4}
            hint="The content angle and what the video is about" />
          <DocField label="The setup" value={doc.theSetup} onChange={(v) => updateDoc("theSetup", v)} rows={4}
            hint="How the video should be structured — hook, message, call to action" />
          <DocField label="Where to film" value={doc.whereToFilm} onChange={(v) => updateDoc("whereToFilm", v)} rows={3}
            hint="Location guidance, lighting, environment" />
          <DocField label="Deliverables" value={doc.deliverables} onChange={(v) => updateDoc("deliverables", v)} rows={4}
            hint="What the creator must deliver and by when" />

          {/* ── Video script ── */}
          {isSectionDivider("Video script")}
          <ScriptField label="Video hook" value={script.videoHook} onChange={(v) => setScript((s) => ({ ...s, videoHook: v }))} rows={2} />
          <ScriptField label="Text hook" value={script.textHook} onChange={(v) => setScript((s) => ({ ...s, textHook: v }))} rows={2} />
          <ScriptField label="Narrative" value={script.narrative} onChange={(v) => setScript((s) => ({ ...s, narrative: v }))} rows={8} />
          <ScriptField label="CTA" value={script.cta} onChange={(v) => setScript((s) => ({ ...s, cta: v }))} rows={2} />

          {flags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Compliance flags</p>
              <FlagList flags={flags} />
            </div>
          )}

          {genError && <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{genError}</p>}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={save} disabled={saving || !title} style={primaryBtn(saving || !title)}>
              {saving ? "Saving..." : "Save as draft"}
            </button>
            {!isManual && (
              <button onClick={generateScript} disabled={generating} style={ghostBtn}>
                {generating ? "Regenerating..." : "Regenerate script"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  fontFamily: "var(--font-ui)", color: "var(--text)",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, outline: "none", cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  fontFamily: "var(--font-ui)", color: "var(--text)",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 6, outline: "none", boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 13, fontWeight: 500,
    color: disabled ? "var(--subtle)" : "var(--bg)",
    background: disabled ? "var(--surface)" : "var(--accent)",
    border: "1px solid var(--border)", borderRadius: 6,
    padding: "9px 20px", cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 150ms ease",
  };
}

const ghostBtn: React.CSSProperties = {
  fontSize: 13, fontWeight: 500,
  color: "var(--text)", background: "transparent",
  border: "1px solid var(--border)", borderRadius: 6,
  padding: "9px 16px", cursor: "pointer",
};
