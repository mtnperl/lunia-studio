"use client";
import { useState, useEffect } from "react";
import { Script, SavedCarousel } from "@/lib/types";
import { getLibrary } from "@/lib/storage";

const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutes

type Props = {
  onNewScript: () => void;
  onNewCarousel: () => void;
  onOpenScript: (s: Script) => void;
  onOpenCarousel: (c?: SavedCarousel & { _unsaved?: boolean }) => void;
};

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div style={{
      flex: 1, padding: "20px 20px 18px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 10,
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 32, fontWeight: 400,
        color: "var(--text)", lineHeight: 1,
        marginBottom: 8,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
      <div style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
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
  const minsLeft = isUnsaved
    ? Math.max(0, Math.round((DRAFT_TTL_MS - (Date.now() - new Date(carousel.savedAt).getTime())) / 60_000))
    : null;
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
            }}>unsaved · {minsLeft}m left</span>
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
        const now = Date.now();
        const rawDrafts = localStorage.getItem("lunia:drafts");
        const drafts: Array<SavedCarousel & { _unsaved?: boolean }> = rawDrafts ? JSON.parse(rawDrafts) : [];
        // Filter to only drafts within the 30-min TTL and not already saved
        const freshDrafts = drafts.filter((d) => {
          const age = now - new Date(d.savedAt).getTime();
          if (age > DRAFT_TTL_MS) return false;
          // Drop if already saved (same topic + close timestamp)
          return !saved.some(sc => sc.topic === d.topic && Math.abs(new Date(sc.savedAt).getTime() - new Date(d.savedAt).getTime()) < 10_000);
        });
        saved.unshift(...freshDrafts);
        // Prune expired drafts from storage
        const stillFresh = drafts.filter((d) => now - new Date(d.savedAt).getTime() <= DRAFT_TTL_MS);
        localStorage.setItem("lunia:drafts", JSON.stringify(stillFresh));
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
      <div style={{ marginBottom: 44, paddingBottom: 36, borderBottom: "1px solid var(--border)" }}>
        <h1 style={{
          fontFamily: "var(--font-serif)",
          fontSize: 48, fontWeight: 300,
          color: "var(--text)", margin: 0, lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}>
          {greeting},{" "}
          <em style={{ fontStyle: "italic", color: "var(--accent)", fontWeight: 400 }}>Mathan.</em>
        </h1>
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11, color: "var(--subtle)",
          marginTop: 10, letterSpacing: "0.08em",
        }}>
          {dateLabel.toUpperCase()}
        </p>
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 40 }}>
        {[
          { label: "UGC Scripter", title: "New script", desc: "Generate hooks + full UGC script", cta: "Generate →", onClick: onNewScript },
          { label: "Carousel Builder", title: "New carousel", desc: "Build an Instagram carousel post", cta: "Build →", onClick: onNewCarousel },
        ].map(card => (
          <div
            key={card.label}
            onClick={card.onClick}
            style={{
              padding: "26px 28px 24px", borderRadius: 12, cursor: "pointer",
              background: "var(--surface)", border: "1px solid var(--border)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
              transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = "var(--accent)";
              el.style.background = "var(--surface-h)";
              el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.borderColor = "var(--border)";
              el.style.background = "var(--surface)";
              el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)";
              el.style.transform = "translateY(0)";
            }}
          >
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 10 }}>{card.label}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 500, color: "var(--text)", marginBottom: 6, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{card.title}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20, lineHeight: 1.55 }}>{card.desc}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.02em" }}>{card.cta}</div>
          </div>
        ))}
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
              {recentCarousels.map(c => <CarouselCard key={c.id} carousel={c} onClick={() => onOpenCarousel(c as SavedCarousel & { _unsaved?: boolean })} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
