"use client";
import { useState, useEffect } from "react";
import { Script, SavedCarousel } from "@/lib/types";
import { getLibrary } from "@/lib/storage";
import { IconSparkles, IconGrid, IconArrowRight, IconPencil } from "@/components/Icons";

const DRAFT_TTL_MS = 30 * 60 * 1000;

type Props = {
  onNewScript: () => void;
  onNewCarousel: () => void;
  onOpenScript: (s: Script) => void;
  onOpenCarousel: (c?: SavedCarousel & { _unsaved?: boolean }) => void;
};

function StatWidget({ value, label, accent, loading }: { value: number | string; label: string; accent: string; loading: boolean }) {
  return (
    <div className="card" style={{
      position: "relative",
      padding: "18px 18px 16px",
      overflow: "hidden",
    }}>
      <span style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: accent,
      }} />
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: "var(--muted)",
        letterSpacing: "0.04em",
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-ui)",
        fontSize: 28, fontWeight: 700,
        color: "var(--text)", lineHeight: 1,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}>
        {loading ? <span style={{ color: "var(--subtle)" }}>—</span> : value}
      </div>
    </div>
  );
}

function statusChipClass(status?: string) {
  if (status === "review") return "chip chip-review";
  if (status === "locked") return "chip chip-locked";
  return "chip chip-draft";
}
function statusLabel(status?: string) {
  if (status === "review") return "Review";
  if (status === "locked") return "Locked";
  return "Draft";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function BoardRow({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 90px 24px",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.12s",
        fontSize: 13,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface-h)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
    >
      {children}
    </div>
  );
}

export default function HomeView({ onNewScript, onNewCarousel, onOpenScript, onOpenCarousel }: Props) {
  const [scripts, setScripts]   = useState<Script[]>([]);
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      getLibrary().catch(() => [] as Script[]),
      fetch("/api/carousel/library").then(r => r.json()).catch(() => [] as SavedCarousel[]),
    ]).then(([s, c]) => {
      setScripts(Array.isArray(s) ? s : []);
      const saved: SavedCarousel[] = Array.isArray(c) ? c : [];
      try {
        const now = Date.now();
        const rawDrafts = localStorage.getItem("lunia:drafts");
        const drafts: Array<SavedCarousel & { _unsaved?: boolean }> = rawDrafts ? JSON.parse(rawDrafts) : [];
        const freshDrafts = drafts.filter((d) => {
          const age = now - new Date(d.savedAt).getTime();
          if (age > DRAFT_TTL_MS) return false;
          return !saved.some(sc => sc.topic === d.topic && Math.abs(new Date(sc.savedAt).getTime() - new Date(d.savedAt).getTime()) < 10_000);
        });
        saved.unshift(...freshDrafts);
        const stillFresh = drafts.filter((d) => now - new Date(d.savedAt).getTime() <= DRAFT_TTL_MS);
        localStorage.setItem("lunia:drafts", JSON.stringify(stillFresh));
      } catch {}
      setCarousels(saved);
      setLoading(false);
    });
  }, []);

  const thisWeekScripts = scripts.filter(s => {
    const d = new Date(s.savedAt);
    return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  const recentScripts   = [...scripts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 5);
  const recentCarousels = [...carousels].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 5);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 64px" }}>

      {/* Overview stat widgets */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 28,
      }}>
        <StatWidget value={scripts.length}   label="Scripts saved"     accent="var(--mon-sky)"    loading={loading} />
        <StatWidget value={carousels.length} label="Carousels built"   accent="var(--mon-purple)" loading={loading} />
        <StatWidget value={thisWeekScripts}  label="Scripts this week" accent="var(--mon-green)"  loading={loading} />
        <StatWidget value={scripts.filter(s => s.status === "review").length} label="In review" accent="var(--mon-yellow)" loading={loading} />
      </div>

      {/* Quick actions */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 12,
        marginBottom: 32,
      }}>
        <QuickAction
          icon={<IconSparkles size={18} />}
          title="New script"
          desc="Generate hooks and a full UGC script."
          onClick={onNewScript}
          accent="var(--mon-sky)"
        />
        <QuickAction
          icon={<IconGrid size={18} />}
          title="New carousel"
          desc="Build an Instagram carousel."
          onClick={onNewCarousel}
          accent="var(--mon-purple)"
        />
        <QuickAction
          icon={<IconPencil size={18} />}
          title="UGC briefs"
          desc="Write ad briefs for creators."
          onClick={onNewScript}
          accent="var(--mon-green)"
        />
      </div>

      {/* Boards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
        gap: 20,
      }}>
        <Board
          title="Recent scripts"
          actionLabel="View all"
          onAction={onNewScript}
          loading={loading}
          empty={recentScripts.length === 0 ? "No scripts yet." : null}
          columns={["Title", "Status", "Saved", ""]}
        >
          {recentScripts.map(s => (
            <BoardRow key={s.id} onClick={() => onOpenScript(s)}>
              <div style={{
                fontWeight: 500, color: "var(--text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{s.title}</div>
              <div><span className={statusChipClass(s.status)}>{statusLabel(s.status)}</span></div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{formatDate(s.savedAt)}</div>
              <IconArrowRight size={14} />
            </BoardRow>
          ))}
        </Board>

        <Board
          title="Recent carousels"
          actionLabel="View all"
          onAction={() => onOpenCarousel()}
          loading={loading}
          empty={recentCarousels.length === 0 ? "No carousels yet." : null}
          columns={["Topic", "Tone", "Saved", ""]}
        >
          {recentCarousels.map(c => {
            const isUnsaved = (c as { _unsaved?: boolean })._unsaved;
            return (
              <BoardRow key={c.id} onClick={() => onOpenCarousel(c as SavedCarousel & { _unsaved?: boolean })}>
                <div style={{
                  fontWeight: 500, color: "var(--text)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.topic}</span>
                  {isUnsaved && <span className="chip chip-working" style={{ flexShrink: 0 }}>Unsaved</span>}
                </div>
                <div><span className="chip chip-plan">{c.hookTone}</span></div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{formatDate(c.savedAt)}</div>
                <IconArrowRight size={14} />
              </BoardRow>
            );
          })}
        </Board>
      </div>
    </div>
  );
}

function QuickAction({ icon, title, desc, onClick, accent }: {
  icon: React.ReactNode; title: string; desc: string; onClick: () => void; accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "16px 18px",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--surface)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: "var(--r-md)",
        background: accent, color: "#fff",
        flexShrink: 0,
      }}>{icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{title}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{desc}</span>
      </span>
    </button>
  );
}

function Board({ title, actionLabel, onAction, loading, empty, columns, children }: {
  title: string; actionLabel: string; onAction: () => void;
  loading: boolean; empty: string | null;
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-md)",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text)" }}>{title}</h2>
        <button
          onClick={onAction}
          style={{
            background: "none", border: "none",
            color: "var(--accent)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", padding: "4px 6px",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          {actionLabel} <IconArrowRight size={13} />
        </button>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 110px 90px 24px",
        gap: 12,
        padding: "8px 14px",
        background: "var(--surface-r)",
        borderBottom: "1px solid var(--border)",
        fontSize: 10, fontWeight: 600,
        color: "var(--subtle)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {columns.map((c, i) => <div key={i}>{c}</div>)}
      </div>
      {loading ? (
        <div style={{ padding: 24, fontSize: 13, color: "var(--subtle)" }}>Loading…</div>
      ) : empty ? (
        <div style={{ padding: 24, fontSize: 13, color: "var(--subtle)" }}>{empty}</div>
      ) : children}
    </div>
  );
}
