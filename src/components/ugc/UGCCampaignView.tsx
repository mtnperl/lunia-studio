"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UGCBrief,
  UGCCampaign,
  UGCCreator,
  UGCPipelineStage,
  UGCSourcingPlatform,
  UGC_PIPELINE_STAGES,
} from "@/lib/types";
import UGCPipelinePill from "./UGCPipelinePill";
import UGCCSVImportModal from "./UGCCSVImportModal";
import UGCCRTLoader from "./UGCCRTLoader";
import type { ComplianceLevel, ComplianceResult, ComplianceViolation } from "@/lib/compliance";

type Props = {
  campaignId: string;
  onBack: () => void;
};

type Dirty = Record<string, Partial<UGCCreator>>;

export default function UGCCampaignView({ campaignId, onBack }: Props) {
  const [campaign, setCampaign] = useState<UGCCampaign | null>(null);
  const [briefs, setBriefs] = useState<UGCBrief[]>([]);
  const [dirty, setDirty] = useState<Dirty>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [captionBusy, setCaptionBusy] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, { caption1?: ComplianceResult; caption2?: ComplianceResult }>>({});
  const [outreachModal, setOutreachModal] = useState<{ creator: UGCCreator } | null>(null);
  const [scriptModalCreatorId, setScriptModalCreatorId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"readyToPost" | "totalSpend" | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [c, b] = await Promise.all([
      fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/ugc/briefs").then((r) => r.ok ? r.json() : []),
    ]);
    setCampaign(c);
    setBriefs(Array.isArray(b) ? b : []);
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  // beforeunload guard for dirty state
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (Object.keys(dirty).length === 0) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Debounced save
  useEffect(() => {
    if (Object.keys(dirty).length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, 300);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  async function flush() {
    const snapshot = dirty;
    setDirty({});
    await Promise.all(
      Object.entries(snapshot).map(async ([cid, patch]) => {
        try {
          await fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/creator/${encodeURIComponent(cid)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
        } catch {
          /* toast could go here; retaining silent to avoid spam */
        }
      }),
    );
    await load();
  }

  function patchLocal(cid: string, patch: Partial<UGCCreator>) {
    setCampaign((c) => {
      if (!c) return c;
      return {
        ...c,
        creators: c.creators.map((cr) => (cr.id === cid ? { ...cr, ...patch } : cr)),
      };
    });
    setDirty((d) => ({ ...d, [cid]: { ...(d[cid] ?? {}), ...patch } }));
  }

  async function addCreator() {
    if (adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/creator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New creator" }),
      });
      if (res.ok) await load();
    } finally {
      setAdding(false);
    }
  }

  async function deleteCreator(cid: string) {
    if (!confirm("Delete this creator?")) return;
    await fetch(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/creator/${encodeURIComponent(cid)}`, {
      method: "DELETE",
    });
    await load();
  }

  async function generateCaptions(c: UGCCreator) {
    setCaptionBusy(c.id);
    try {
      const briefLabel = briefs.find((b) => b.id === c.briefId)?.title ?? "";
      const res = await fetch("/api/ugc/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorName: c.name, angle: c.angle, briefLabel }),
      });
      if (!res.ok) return;
      const body = (await res.json()) as {
        caption1: string;
        caption2: string;
        flags: { caption1: ComplianceResult; caption2: ComplianceResult };
      };
      patchLocal(c.id, { caption1: body.caption1, caption2: body.caption2 });
      setFlags((f) => ({ ...f, [c.id]: body.flags }));
    } finally {
      setCaptionBusy(null);
    }
  }

  function exportSheet() {
    window.open(`/api/ugc/campaign/${encodeURIComponent(campaignId)}/export`, "_blank");
  }

  if (!campaign) {
    return (
      <div style={{ padding: 40, fontFamily: "var(--font-ui)" }}>
        <UGCCRTLoader label="LOADING CAMPAIGN" />
      </div>
    );
  }

  const creators = campaign.creators;
  const hasDelivered = (c: UGCCreator) =>
    c.stage === "delivered" || c.stage === "edited-and-ready" || c.stage === "posted";
  const deliveredCreators = creators.filter(hasDelivered);
  const deliveredSpend = deliveredCreators.reduce((s, c) => s + (c.cost || 0), 0);
  const approvedCount = creators.filter((c) => c.stage !== "invited" && c.stage !== "cancelled").length;
  const delivered = deliveredCreators.length;
  const readyToPostCount = creators.filter((c) => c.stage === "edited-and-ready").length;
  const editedReadyCount = creators.filter((c) => c.stage === "edited-and-ready" || c.stage === "posted").length;
  const postedCount = creators.filter((c) => c.stage === "posted").length;
  const costPerDelivered = delivered > 0 ? deliveredSpend / delivered : 0;
  const byAngle: Record<string, number> = {};
  for (const c of creators) {
    const a = c.angle.trim() || "(unassigned)";
    byAngle[a] = (byAngle[a] ?? 0) + 1;
  }

  const pct = (n: number) => creators.length > 0 ? Math.round((n / creators.length) * 100) : 0;

  const filteredCreators =
    filter === "readyToPost"
      ? creators.filter((c) => c.stage === "edited-and-ready")
      : filter === "totalSpend"
        ? creators.filter((c) => hasDelivered(c) && (c.cost || 0) > 0)
        : creators;

  const scriptModalCreator = scriptModalCreatorId
    ? creators.find((c) => c.id === scriptModalCreatorId) ?? null
    : null;
  const scriptModalBrief = scriptModalCreator?.briefId
    ? briefs.find((b) => b.id === scriptModalCreator.briefId) ?? null
    : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 80px", fontFamily: "var(--font-ui)" }}>
      {importOpen && (
        <UGCCSVImportModal
          campaignId={campaignId}
          onClose={() => setImportOpen(false)}
          onImported={load}
        />
      )}
      {outreachModal && (
        <OutreachModal
          creator={outreachModal.creator}
          brief={briefs.find((b) => b.id === outreachModal.creator.briefId) ?? null}
          onClose={() => setOutreachModal(null)}
        />
      )}
      {scriptModalCreator && (
        <ScriptModal
          creator={scriptModalCreator}
          brief={scriptModalBrief}
          onClose={() => setScriptModalCreatorId(null)}
        />
      )}

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>
          ← Campaigns
        </button>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.06em" }}>
          {Object.keys(dirty).length > 0 ? "SAVING…" : "SAVED"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 16, marginBottom: 20, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>{campaign.label}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostBtn onClick={() => setImportOpen(true)}>Import XLSX</GhostBtn>
          <GhostBtn onClick={exportSheet}>Export XLSX</GhostBtn>
        </div>
      </div>

      {/* Rollups */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat
          label="Ready to post"
          value={String(readyToPostCount)}
          active={filter === "readyToPost"}
          onClick={() => setFilter(filter === "readyToPost" ? null : "readyToPost")}
        />
        <Stat
          label="Total spend"
          value={`$${deliveredSpend.toLocaleString()}`}
          tooltip="Only includes creators who have delivered at least one video."
          active={filter === "totalSpend"}
          onClick={() => setFilter(filter === "totalSpend" ? null : "totalSpend")}
        />
        <Stat label="Cost / delivered" value={delivered ? `$${Math.round(costPerDelivered).toLocaleString()}` : "—"} />
        <Stat label="Approved" value={`${pct(approvedCount)}%`} />
        <Stat label="Delivered" value={`${pct(delivered)}%`} />
        <Stat label="Edited & ready" value={`${pct(editedReadyCount)}%`} />
        <Stat label="Posted" value={`${pct(postedCount)}%`} />
      </div>

      {filter && (
        <div style={{ marginBottom: 16, fontSize: 12, color: "var(--muted)" }}>
          Filtered by <strong style={{ color: "var(--text)" }}>{filter === "readyToPost" ? "Ready to post" : "Total spend"}</strong>
          {" "}· {filteredCreators.length} of {creators.length} creator{creators.length === 1 ? "" : "s"}
          <button
            onClick={() => setFilter(null)}
            style={{ marginLeft: 10, background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: 0 }}
          >
            clear
          </button>
        </div>
      )}

      {Object.keys(byAngle).length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {Object.entries(byAngle).map(([angle, count]) => (
            <span key={angle} style={{
              fontSize: 11, color: "var(--muted)",
              padding: "3px 10px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 9999, letterSpacing: "0.02em",
            }}>
              {angle} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "var(--surface-r)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 10, color: "var(--subtle)" }}>
              <Th>Name</Th>
              <Th>Angle</Th>
              <Th>Brief</Th>
              <Th style={{ width: 60 }}>Script</Th>
              <Th>Platform</Th>
              <Th>Cost</Th>
              <Th>Shipped</Th>
              <Th>Stage</Th>
              <Th>Versions</Th>
              <Th style={{ width: 40 }}>{"\u00A0"}</Th>
            </tr>
          </thead>
          <tbody>
            {filteredCreators.map((c) => {
              const isExpanded = expanded === c.id;
              return (
                <CreatorRow
                  key={c.id}
                  creator={c}
                  briefs={briefs}
                  expanded={isExpanded}
                  captionBusy={captionBusy === c.id}
                  flags={flags[c.id]}
                  onToggle={() => setExpanded(isExpanded ? null : c.id)}
                  onPatch={(p) => patchLocal(c.id, p)}
                  onDelete={() => deleteCreator(c.id)}
                  onGenerate={() => generateCaptions(c)}
                  onOutreach={() => setOutreachModal({ creator: c })}
                  onOpenScript={() => setScriptModalCreatorId(c.id)}
                />
              );
            })}
            {filteredCreators.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                  {creators.length === 0
                    ? "No creators yet. Add one below, or import a spreadsheet."
                    : "No creators match the active filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <GhostBtn onClick={addCreator} disabled={adding}>
          {adding ? "Adding…" : "+ Add creator"}
        </GhostBtn>
      </div>
    </div>
  );
}

function CreatorRow({
  creator: c, briefs, expanded, captionBusy, flags,
  onToggle, onPatch, onDelete, onGenerate, onOutreach, onOpenScript,
}: {
  creator: UGCCreator;
  briefs: UGCBrief[];
  expanded: boolean;
  captionBusy: boolean;
  flags: { caption1?: ComplianceResult; caption2?: ComplianceResult } | undefined;
  onToggle: () => void;
  onPatch: (p: Partial<UGCCreator>) => void;
  onDelete: () => void;
  onGenerate: () => void;
  onOutreach: () => void;
  onOpenScript: () => void;
}) {
  const assignedBrief = c.briefId ? briefs.find((b) => b.id === c.briefId) : null;
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ borderTop: "1px solid var(--border)", cursor: "pointer", background: expanded ? "var(--surface-h)" : undefined }}
      >
        <Td onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <InlineText value={c.name} onChange={(v) => onPatch({ name: v })} />
            <button
              onClick={onOutreach}
              title="Generate outreach message"
              style={{
                flexShrink: 0,
                background: "none", border: "1px solid var(--border)",
                borderRadius: 4, padding: "2px 7px",
                fontSize: 10, color: "var(--muted)", cursor: "pointer",
                letterSpacing: "0.04em", fontFamily: "var(--font-ui)",
              }}
            >
              DM
            </button>
          </div>
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <InlineText value={c.angle} onChange={(v) => onPatch({ angle: v })} placeholder="–" />
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <select
            value={c.briefId ?? ""}
            onChange={(e) => onPatch({ briefId: e.target.value || null })}
            style={selectStyle}
          >
            <option value="">—</option>
            {briefs.filter((b) => b.status !== "archived" || b.id === c.briefId).map((b) => (
              <option key={b.id} value={b.id}>{b.title?.trim() || "Untitled brief"}</option>
            ))}
          </select>
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onOpenScript}
            disabled={!assignedBrief}
            title={assignedBrief ? "Open script" : "Assign a brief to view script"}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 12,
              color: assignedBrief ? "var(--text)" : "var(--subtle)",
              cursor: assignedBrief ? "pointer" : "not-allowed",
              fontFamily: "var(--font-ui)",
            }}
          >
            📄
          </button>
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <select
            value={c.sourcingPlatform}
            onChange={(e) => onPatch({ sourcingPlatform: e.target.value as UGCSourcingPlatform })}
            style={selectStyle}
          >
            <option value="BACKSTAGE">BACKSTAGE</option>
            <option value="upwork">upwork</option>
            <option value="other">other</option>
          </select>
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <InlineNumber value={c.cost} onChange={(v) => onPatch({ cost: v })} prefix="$" />
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={c.goodsShipped}
            onChange={(e) => onPatch({ goodsShipped: e.target.checked })}
          />
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <UGCPipelinePill
            stage={c.stage}
            onChange={(next: UGCPipelineStage) => onPatch({ stage: next })}
          />
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <InlineNumber value={c.versionsDelivered} onChange={(v) => onPatch({ versionsDelivered: Math.max(0, Math.min(99, Math.round(v))) })} />
        </Td>
        <Td onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <button
            title="Delete"
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 14 }}
          >
            ×
          </button>
        </Td>
      </tr>

      {expanded && (
        <tr style={{ background: "var(--surface-h)", borderTop: "1px solid var(--border)" }}>
          <td colSpan={10} style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <CaptionBox
                label="Caption 1"
                value={c.caption1}
                level={flags?.caption1?.level ?? inferLevel(c.caption1)}
                violations={flags?.caption1?.violations ?? []}
                onChange={(v) => onPatch({ caption1: v })}
              />
              <CaptionBox
                label="Caption 2"
                value={c.caption2}
                level={flags?.caption2?.level ?? inferLevel(c.caption2)}
                violations={flags?.caption2?.violations ?? []}
                onChange={(v) => onPatch({ caption2: v })}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
              <GhostBtn onClick={onGenerate} disabled={captionBusy}>
                {captionBusy ? "Drafting…" : "✨ Draft captions"}
              </GhostBtn>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Notes: <InlineText value={c.notes} onChange={(v) => onPatch({ notes: v })} placeholder="–" wide />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function inferLevel(text: string): ComplianceLevel {
  if (!text) return "green";
  if (/\b(cure|cures|cured|treat|treats|treated|prevent|prevents|prevented|diagnose|diagnoses|diagnosed)\b/i.test(text)) return "red";
  if (/—/.test(text)) return "amber";
  if ((text.match(/!/g)?.length ?? 0) > 1) return "amber";
  return "green";
}

function CaptionBox({ label, value, level, violations, onChange }: {
  label: string;
  value: string;
  level: ComplianceLevel;
  violations: ComplianceViolation[];
  onChange: (v: string) => void;
}) {
  const color = level === "red" ? "var(--error)" : level === "amber" ? "var(--warning)" : "var(--success)";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>{label}</span>
        <span
          title={violations.map((v) => `${v.rule}: "${v.match}"`).join(" · ") || "compliance: ok"}
          style={{
            width: 8, height: 8, borderRadius: 9999, background: color,
          }}
        />
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: 8, background: "var(--surface)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 6,
          fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.45,
          resize: "vertical",
        }}
      />
    </div>
  );
}

function InlineText({ value, onChange, placeholder, wide }: {
  value: string; onChange: (v: string) => void; placeholder?: string; wide?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: wide ? "100%" : undefined,
        minWidth: 80,
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 4,
        padding: "4px 6px",
        fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
    />
  );
}

function InlineNumber({ value, onChange, prefix }: {
  value: number; onChange: (v: number) => void; prefix?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      style={{
        width: 80,
        background: "transparent",
        border: "1px solid transparent",
        borderRadius: 4,
        padding: "4px 6px",
        fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
      aria-label={prefix ? `${prefix} value` : "number"}
    />
  );
}

const selectStyle: React.CSSProperties = {
  background: "transparent", color: "var(--text)",
  border: "1px solid transparent", borderRadius: 4,
  padding: "4px 6px",
  fontFamily: "var(--font-ui)", fontSize: 12,
};

function Stat({ label, value, onClick, active, tooltip }: {
  label: string; value: string;
  onClick?: () => void; active?: boolean; tooltip?: string;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      title={tooltip}
      style={{
        padding: 14,
        background: active ? "var(--surface-h)" : "var(--surface)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 8,
        cursor: clickable ? "pointer" : "default",
        transition: "background 120ms ease, border-color 120ms ease",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "var(--accent)" : "var(--subtle)" }}>{label}</div>
        {active && <span style={{ fontSize: 10, color: "var(--accent)" }}>✓</span>}
        {tooltip && !active && (
          <span style={{ fontSize: 10, color: "var(--subtle)", border: "1px solid var(--border)", borderRadius: 9999, width: 12, height: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>i</span>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", fontSize: 18, color: "var(--text)", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function GhostBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "7px 12px",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: 6,
        fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--text)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 500, ...style }}>{children}</th>;
}

function Td({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return <td onClick={onClick} style={{ padding: "8px 10px", verticalAlign: "middle", color: "var(--text)" }}>{children}</td>;
}

function OutreachModal({ creator, brief, onClose }: {
  creator: UGCCreator;
  brief: UGCBrief | null;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setBusy(true);
    setErr("");
    try {
      const briefUrl = brief
        ? `${window.location.origin}/ugc/share/${brief.publicBriefId}`
        : undefined;
      const res = await fetch("/api/ugc/outreach-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: creator.name,
          angle: creator.angle || undefined,
          conceptLabel: brief?.conceptLabel || undefined,
          briefTitle: brief?.title || undefined,
          briefUrl,
          deliverables: brief?.doc?.deliverables || undefined,
          notes: creator.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error ?? "Generation failed"); return; }
      const data = await res.json();
      setMessage(data.message ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 560,
          background: "var(--surface-r)", border: "1px solid var(--border)",
          borderRadius: 10, padding: 24,
          fontFamily: "var(--font-ui)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Outreach — {creator.name}</h2>
            {brief && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>{brief.title}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer" }}>×</button>
        </div>

        {busy ? (
          <UGCCRTLoader label="DRAFTING MESSAGE" size="sm" />
        ) : err ? (
          <div style={{ color: "var(--error)", fontSize: 13, marginBottom: 12 }}>{err}</div>
        ) : (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={12}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: 12, background: "var(--surface)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 6,
              fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6,
              resize: "vertical",
            }}
          />
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={copy}
            disabled={busy || !message}
            style={{
              padding: "9px 16px",
              background: copied ? "var(--success)" : "var(--accent)",
              color: "var(--bg)",
              border: "none", borderRadius: 6,
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
              cursor: busy || !message ? "default" : "pointer",
              opacity: busy || !message ? 0.5 : 1,
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={generate}
            disabled={busy}
            style={{
              padding: "9px 14px",
              background: "transparent", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 6,
              fontFamily: "var(--font-ui)", fontSize: 13,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

function ScriptModal({ creator, brief, onClose }: {
  creator: UGCCreator;
  brief: UGCBrief | null;
  onClose: () => void;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);

  async function copyCaption() {
    if (!brief?.caption) return;
    try {
      await navigator.clipboard.writeText(brief.caption);
      setCaptionCopied(true);
      setTimeout(() => setCaptionCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 640, height: "100%",
          background: "var(--surface-r)", borderLeft: "1px solid var(--border)",
          padding: "24px 28px 40px", overflowY: "auto",
          fontFamily: "var(--font-ui)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: 4 }}>
              Script for {creator.name || "(unnamed creator)"}
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>
              {brief?.title?.trim() || "Untitled brief"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>

        {!brief ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No brief is assigned to this creator. Assign one in the table to view a script.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <ScriptSection label="Video hook" value={brief.script.videoHook} />
            <ScriptSection label="Text hook" value={brief.script.textHook} />
            <ScriptSection label="Narrative" value={brief.script.narrative} />
            <ScriptSection label="CTA" value={brief.script.cta} />
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)" }}>Caption</span>
                {brief.caption ? (
                  <button
                    onClick={copyCaption}
                    style={{
                      fontSize: 11, background: "transparent",
                      color: captionCopied ? "var(--success)" : "var(--muted)",
                      border: `1px solid ${captionCopied ? "var(--success)" : "var(--border)"}`,
                      borderRadius: 4, padding: "3px 9px", cursor: "pointer",
                    }}
                  >
                    {captionCopied ? "Copied!" : "Copy"}
                  </button>
                ) : null}
              </div>
              <div style={{
                whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6,
                padding: "10px 12px", background: "var(--surface)",
                border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)",
              }}>
                {brief.caption?.trim() || "— No caption yet. Open the brief editor to generate one."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScriptSection({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: 6 }}>{label}</div>
      <div style={{
        whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6,
        padding: "10px 12px", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)",
      }}>
        {value?.trim() || "—"}
      </div>
    </div>
  );
}

export { UGC_PIPELINE_STAGES };
