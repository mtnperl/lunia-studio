"use client";
import { useState, useEffect } from "react";
import { Script, SavedCarousel } from "@/lib/types";
import { getLibrary } from "@/lib/storage";

type Props = {
  onNewScript: () => void;
  onNewCarousel: () => void;
  onOpenScript: (s: Script) => void;
  onOpenCarousel: () => void;
};

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{
      flex: 1, padding: "18px 20px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 8,
    }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 28, fontWeight: 500,
        color: "var(--text)", lineHeight: 1,
        marginBottom: 6,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ScriptCard({ script, onClick }: { script: Script; onClick: () => void }) {
  const statusColor = script.status === "review" ? "var(--warning)" : script.status === "locked" ? "var(--success)" : "var(--subtle)";
  const statusLabel = script.status === "review" ? "In Review" : script.status === "locked" ? "Locked" : "Draft";
  return (
    <div onClick={onClick} className="card" style={{ padding: "14px 16px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{statusLabel}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>
          {new Date(script.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, marginBottom: 6, color: "var(--text)" }}>{script.title}</p>
      <p style={{
        fontSize: 12, color: "var(--muted)", lineHeight: 1.55,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>"{script.hook}"</p>
    </div>
  );
}

function CarouselCard({ carousel, onClick }: { carousel: SavedCarousel & { _unsaved?: boolean }; onClick: () => void }) {
  const isUnsaved = (carousel as { _unsaved?: boolean })._unsaved;
  return (
    <div onClick={onClick} className="card" style={{ padding: "14px 16px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
            color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>{carousel.hookTone}</span>
          {isUnsaved && (
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600,
              letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--warning)",
              background: "rgba(196, 122, 90, 0.1)",
              border: "1px solid rgba(196, 122, 90, 0.25)",
              borderRadius: 3, padding: "1px 5px",
            }}>unsaved</span>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>
          {new Date(carousel.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.45, marginBottom: 6, color: "var(--text)" }}>{carousel.topic}</p>
      <p style={{
        fontSize: 12, color: "var(--muted)", lineHeight: 1.55,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{carousel.content?.hooks?.[0]?.headline ?? "—"}</p>
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
        const raw = localStorage.getItem("lunia:lastCarousel");
        if (raw) {
          const last = JSON.parse(raw) as SavedCarousel & { _unsaved?: boolean };
          const alreadySaved = saved.some(
            sc => sc.topic === last.topic &&
              Math.abs(new Date(sc.savedAt).getTime() - new Date(last.savedAt).getTime()) < 5000
          );
          if (!alreadySaved) saved.unshift(last);
        }
      } catch {}
      setCarousels(saved);
      setLoading(false);
    });
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const thisWeekScripts = scripts.filter(s => {
    const d = new Date(s.savedAt);
    return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;

  const recentScripts   = [...scripts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 4);
  const recentCarousels = [...carousels].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 4);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 48px 80px" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontSize: 36, fontWeight: 400,
          color: "var(--text)", margin: 0, lineHeight: 1.2,
        }}>
          {greeting},{" "}
          <em style={{ fontStyle: "italic", color: "var(--muted)" }}>Mathan.</em>
        </h1>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11, color: "var(--subtle)",
          marginTop: 8, letterSpacing: "0.04em",
        }}>
          {dateLabel.toUpperCase()}
        </p>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
        <div
          onClick={onNewScript}
          style={{
            padding: "22px 24px", borderRadius: 8, cursor: "pointer",
            background: "var(--surface)", border: "1px solid var(--border)",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface-h)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
        >
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>UGC Scripter</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", marginBottom: 4 }}>New script</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>Generate hooks + full UGC script</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Generate →</div>
        </div>

        <div
          onClick={onNewCarousel}
          style={{
            padding: "22px 24px", borderRadius: 8, cursor: "pointer",
            background: "var(--surface)", border: "1px solid var(--border)",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface-h)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}
        >
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>Carousel Builder</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--text)", marginBottom: 4 }}>New carousel</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.5 }}>Build an Instagram carousel post</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>Build →</div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 48 }}>
        <StatCard value={loading ? "—" : scripts.length}   label="Scripts saved"      />
        <StatCard value={loading ? "—" : carousels.length} label="Carousels built"    />
        <StatCard value={loading ? "—" : thisWeekScripts}  label="Scripts this week"  />
        <StatCard value={loading ? "—" : scripts.filter(s => s.status === "review").length} label="In review" />
      </div>

      {/* ── Recents ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Scripts</span>
            <button onClick={onNewScript} style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "8px 0", letterSpacing: "0.01em" }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div style={{ color: "var(--subtle)", fontSize: 13 }}>Loading…</div>
          ) : recentScripts.length === 0 ? (
            <div style={{ padding: "28px 0", fontFamily: "var(--font-serif)", fontSize: 16, fontStyle: "italic", color: "var(--subtle)" }}>No scripts yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentScripts.map(s => <ScriptCard key={s.id} script={s} onClick={() => onOpenScript(s)} />)}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 10, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Carousels</span>
            <button onClick={onOpenCarousel} style={{ fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: "8px 0", letterSpacing: "0.01em" }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div style={{ color: "var(--subtle)", fontSize: 13 }}>Loading…</div>
          ) : recentCarousels.length === 0 ? (
            <div style={{ padding: "28px 0", fontFamily: "var(--font-serif)", fontSize: 16, fontStyle: "italic", color: "var(--subtle)" }}>No carousels yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentCarousels.map(c => <CarouselCard key={c.id} carousel={c} onClick={onOpenCarousel} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
