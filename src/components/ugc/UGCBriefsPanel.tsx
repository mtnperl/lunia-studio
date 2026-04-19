"use client";

import { useState, useEffect, useCallback } from "react";
import { ANGLE_LIBRARY } from "@/lib/angleLibrary";
import type { UGCBrief, BriefScript, BriefComplianceFlag } from "@/lib/types";

type PanelView = "list" | "create" | "edit";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  const styleMap: Record<string, { color: string }> = {
    draft: { color: "var(--muted)" },
    approved: { color: "var(--success)" },
    archived: { color: "var(--subtle)" },
  };
  const s = styleMap[status] ?? styleMap.draft;
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: s.color,
      border: "1px solid var(--border)",
      borderRadius: 4,
      padding: "2px 7px",
    }}>
      {status}
    </span>
  );
}

function FlagList({ flags }: { flags: BriefComplianceFlag[] }) {
  if (!flags.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
      {flags.map((f, i) => (
        <div key={i} style={{
          fontSize: 12,
          color: f.severity === "red" ? "var(--error)" : "var(--warning)",
          background: "var(--surface)",
          border: `1px solid ${f.severity === "red" ? "var(--error)" : "var(--warning)"}`,
          borderRadius: 4,
          padding: "3px 8px",
        }}>
          {f.severity === "red" ? "●" : "◐"} {f.rule} — <em>&ldquo;{f.match}&rdquo;</em>
        </div>
      ))}
    </div>
  );
}

function ScriptField({
  label,
  value,
  onChange,
  rows = 3,
  flags,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  flags: BriefComplianceFlag[];
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 14,
          lineHeight: 1.6,
          fontFamily: "var(--font-ui)",
          color: "var(--text)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          resize: "vertical",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => { e.target.style.borderColor = "var(--border-strong)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
      />
      <FlagList flags={flags} />
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

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ugc/briefs");
      if (res.ok) {
        const data = await res.json();
        setBriefs(Array.isArray(data) ? data : []);
      }
    } catch {
      // network error — leave briefs as []
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
  }

  async function revokeBrief(id: string) {
    if (!confirm("Revoke this share link? The creator will no longer be able to view the brief.")) return;
    await fetch(`/api/ugc/briefs/${id}/revoke`, { method: "POST" });
    await loadBriefs();
  }

  const visible = showArchived ? briefs : briefs.filter((b) => b.status !== "archived");

  if (view === "create" || (view === "edit" && editTarget)) {
    return (
      <BriefEditor
        brief={editTarget}
        onDone={async () => { await loadBriefs(); setEditTarget(null); setView("list"); }}
        onCancel={() => { setEditTarget(null); setView("list"); }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Tracker
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Briefs</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setShowArchived((v) => !v)}
            style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          <button
            onClick={() => { setEditTarget(null); setView("create"); }}
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--bg)",
              background: "var(--accent)",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            New brief
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</p>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)", fontSize: 14 }}>
          No briefs yet. Hit "New brief" to draft your first script.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visible.map((brief) => (
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
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{brief.title ?? (brief as unknown as Record<string, unknown>)["label"] as string ?? "(untitled)"}</div>
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
                {brief.status !== "archived" && !brief.revokedAt && (
                  <button onClick={() => copyShareLink(brief)} style={{ ...actionBtn, color: copiedId === brief.id ? "var(--success)" : "var(--muted)" }}>
                    {copiedId === brief.id ? "Copied!" : "Share"}
                  </button>
                )}
                {brief.revokedAt ? (
                  <span style={{ fontSize: 11, color: "var(--subtle)", padding: "4px 6px" }}>Revoked</span>
                ) : (
                  brief.status !== "archived" && (
                    <button onClick={() => revokeBrief(brief.id)} style={{ ...actionBtn, color: "var(--warning)" }}>Revoke</button>
                  )
                )}
                {brief.status !== "archived" && (
                  <button onClick={() => archiveBrief(brief.id)} style={actionBtn}>Archive</button>
                )}
                <button onClick={() => deleteBrief(brief.id)} style={{ ...actionBtn, color: "var(--error)" }}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--muted)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "4px 10px",
  cursor: "pointer",
};

// --- Brief Editor (create + edit) ---
function BriefEditor({
  brief,
  onDone,
  onCancel,
}: {
  brief: UGCBrief | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isNew = !brief;

  // Step 1: angle/concept selection (only for new briefs)
  const [step, setStep] = useState<1 | 2>(isNew ? 1 : 2);
  const [angleKey, setAngleKey] = useState(brief?.angle ?? "");
  const [conceptId, setConceptId] = useState<string>(brief?.conceptId ?? "");
  const [conceptLabel, setConceptLabel] = useState(brief?.conceptLabel ?? "");
  const [title, setTitle] = useState(brief?.title ?? "");
  const [extraNotes, setExtraNotes] = useState("");
  const [creatorName, setCreatorName] = useState(brief?.creatorName ?? "");

  const [script, setScript] = useState<BriefScript>(
    brief?.script ?? { videoHook: "", textHook: "", narrative: "", cta: "" },
  );
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
      // If we have a Claude-generated custom concept, serialize it into extraNotes
      // so generate-script can use it as a seed (concept seeds only exist in ANGLE_LIBRARY).
      let notesWithConcept = extraNotes;
      if (customConcept && !conceptId) {
        const conceptSeed = `Custom concept seed:\n- Video hook: ${customConcept.videoHook}\n- Text hook: ${customConcept.textHook}\n- Narrative arc: ${customConcept.narrativeArc}`;
        notesWithConcept = [conceptSeed, extraNotes].filter(Boolean).join("\n\n");
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
          body: JSON.stringify({ angle: angleKey, conceptId: conceptId || null, conceptLabel, title, script, creatorName: creatorName || null }),
        });
        if (res.ok) { onDone(); return; }
        const d = await res.json(); setGenError(d.error ?? "Save failed");
      } else {
        const res = await fetch(`/api/ugc/briefs/${brief!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, conceptLabel, script, creatorName: creatorName || null, complianceFlags: flags }),
        });
        if (res.ok) { onDone(); return; }
        const d = await res.json(); setGenError(d.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  function updateScriptField(field: keyof BriefScript, value: string) {
    setScript((prev) => ({ ...prev, [field]: value }));
  }

  const fieldFlags = (field: keyof BriefScript) =>
    flags.filter((f) => f.rule.toLowerCase().includes(field.toLowerCase()) ||
      script[field]?.includes(f.match));

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Briefs
      </button>
      <h1 style={{ margin: "0 0 24px", fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>
        {isNew ? "New brief" : "Edit brief"}
      </h1>

      {/* Step 1: configure */}
      {step === 1 && (
        <div>
          <Field label="Creator name (optional)">
            <input
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Michelle M."
              style={inputStyle}
            />
          </Field>

          <Field label="Creator notes (used by AI for angle + concept suggestions)">
            <textarea
              value={extraNotes}
              onChange={(e) => { setExtraNotes(e.target.value); setSuggestions([]); }}
              rows={3}
              placeholder="e.g. Nurse practitioner, 48, perimenopause symptoms, skeptical of supplements but curious about science"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={suggestAngle}
                disabled={!extraNotes.trim() || suggesting}
                style={ghostBtn}
              >
                {suggesting ? "Thinking..." : "Suggest angle"}
              </button>
              {suggestions.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Click a suggestion to apply</span>
              )}
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {suggestions.map((s) => {
                  const a = ANGLE_LIBRARY.find((x) => x.key === s.angleKey);
                  if (!a) return null;
                  return (
                    <button
                      key={s.angleKey}
                      onClick={() => { setAngleKey(s.angleKey); setConceptId(""); setConceptLabel(""); setCustomConcept(null); setSuggestions([]); }}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        background: angleKey === s.angleKey ? "var(--accent-dim)" : "var(--surface)",
                        border: `1px solid ${angleKey === s.angleKey ? "var(--accent-mid)" : "var(--border)"}`,
                        borderRadius: 6,
                        cursor: "pointer",
                        transition: "background 120ms ease",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.label}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginTop: 2 }}>{s.reason}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field label="Angle">
            <select
              value={angleKey}
              onChange={(e) => { setAngleKey(e.target.value); setConceptId(""); setConceptLabel(""); setCustomConcept(null); setSuggestions([]); }}
              style={selectStyle}
            >
              <option value="">— select angle —</option>
              {ANGLE_LIBRARY.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
            {selectedAngle && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{selectedAngle.description}</p>}
          </Field>

          {selectedAngle && (
            <Field label="Concept">
              <select
                value={conceptId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setConceptId(cid);
                  setCustomConcept(null);
                  const c = selectedAngle.concepts.find((x) => x.id === cid);
                  setConceptLabel(c?.label ?? "");
                }}
                style={selectStyle}
              >
                <option value="">— choose concept or generate one —</option>
                {selectedAngle.concepts.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              {!conceptId && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={generateConcept}
                    disabled={generatingConcept}
                    style={ghostBtn}
                  >
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
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}><strong>Text:</strong> {customConcept.textHook}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}><strong>Arc:</strong> {customConcept.narrativeArc}</p>
            </div>
          )}

          <Field label="Concept label (editable)">
            <input
              value={conceptLabel}
              onChange={(e) => setConceptLabel(e.target.value)}
              placeholder="e.g. The 3am wake-up fix"
              style={inputStyle}
            />
          </Field>

          <Field label="Brief title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Michelle — perimenopause sleep angle"
              style={inputStyle}
            />
          </Field>

          {genError && <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{genError}</p>}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={generateScript}
              disabled={!angleKey || !conceptLabel || !title || generating}
              style={primaryBtn(generating || !angleKey || !conceptLabel || !title)}
            >
              {generating ? "Generating..." : "Generate draft"}
            </button>
          </div>

          {selectedConcept && (
            <div style={{ marginTop: 32, padding: 16, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", margin: "0 0 10px" }}>Concept seed</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}><strong>Hook:</strong> {selectedConcept.videoHook}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: "0 0 6px" }}><strong>Text:</strong> {selectedConcept.textHook}</p>
              <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}><strong>Arc:</strong> {selectedConcept.narrativeArc}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: editor */}
      {step === 2 && (
        <div>
          {isNew && (
            <div style={{ marginBottom: 20, padding: 12, background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, color: "var(--muted)" }}>
              <strong style={{ color: "var(--text)" }}>{title}</strong> — {ANGLE_LIBRARY.find((a) => a.key === angleKey)?.label} / {conceptLabel}
              <button onClick={() => setStep(1)} style={{ marginLeft: 12, fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                change
              </button>
            </div>
          )}

          {!isNew && (
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <Field label="Brief title" style={{ flex: 1 }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
              </Field>
            </div>
          )}

          <ScriptField label="Video hook" value={script.videoHook} onChange={(v) => updateScriptField("videoHook", v)} rows={2} flags={[]} />
          <ScriptField label="Text hook" value={script.textHook} onChange={(v) => updateScriptField("textHook", v)} rows={2} flags={[]} />
          <ScriptField label="Narrative" value={script.narrative} onChange={(v) => updateScriptField("narrative", v)} rows={8} flags={[]} />
          <ScriptField label="CTA" value={script.cta} onChange={(v) => updateScriptField("cta", v)} rows={2} flags={[]} />

          {flags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Compliance flags</p>
              <FlagList flags={flags} />
            </div>
          )}

          {genError && <p style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{genError}</p>}

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={save} disabled={saving} style={primaryBtn(saving)}>
              {saving ? "Saving..." : "Save as draft"}
            </button>
            {isNew && (
              <button onClick={generateScript} disabled={generating} style={ghostBtn}>
                {generating ? "Regenerating..." : "Regenerate"}
              </button>
            )}
            {!isNew && (
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
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: "var(--font-ui)",
  color: "var(--text)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  outline: "none",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: "var(--font-ui)",
  color: "var(--text)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  outline: "none",
  boxSizing: "border-box",
};

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 500,
    color: disabled ? "var(--subtle)" : "var(--bg)",
    background: disabled ? "var(--surface)" : "var(--accent)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "9px 20px",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 150ms ease",
  };
}

const ghostBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--muted)",
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "9px 16px",
  cursor: "pointer",
};
