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
      borderRadius: 10, textAlign: "center",
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function ScriptCard({ script, onClick }: { script: Script; onClick: () => void }) {
  const statusColor = script.status === "review" ? "#d97706" : script.status === "locked" ? "#15803d" : "var(--muted)";
  const statusLabel = script.status === "review" ? "In Review" : script.status === "locked" ? "Locked" : "Draft";
  return (
    <div onClick={onClick} className="card" style={{ padding: "14px 16px", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>{statusLabel}</span>
        <span style={{ fontSize: 11, color: "var(--subtle)" }}>
          {new Date(script.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, color: "var(--text)" }}>{script.title}</p>
      <p style={{
        fontSize: 12, color: "var(--muted)", lineHeight: 1.5,
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
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1e7a8a", textTransform: "uppercase", letterSpacing: "0.06em" }}>{carousel.hookTone}</span>
          {isUnsaved && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a",
              borderRadius: 4, padding: "1px 5px",
            }}>unsaved</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: "var(--subtle)" }}>
          {new Date(carousel.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, color: "var(--text)" }}>{carousel.topic}</p>
      <p style={{
        fontSize: 12, color: "var(--muted)", lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{carousel.content?.hooks?.[0]?.headline ?? "—"}</p>
    </div>
  );
}

export default function HomeView({ onNewScript, onNewCarousel, onOpenScript, onOpenCarousel }: Props) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [carousels, setCarousels] = useState<SavedCarousel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getLibrary().catch(() => [] as Script[]),
      fetch("/api/carousel/library").then(r => r.json()).catch(() => [] as SavedCarousel[]),
    ]).then(([s, c]) => {
      setScripts(Array.isArray(s) ? s : []);
      // Merge last-generated (unsaved) carousel from localStorage
      const saved: SavedCarousel[] = Array.isArray(c) ? c : [];
      try {
        const raw = localStorage.getItem("lunia:lastCarousel");
        if (raw) {
          const last = JSON.parse(raw) as SavedCarousel & { _unsaved?: boolean };
          // Only prepend if not already saved (match by topic + time proximity)
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

  const thisWeekScripts = scripts.filter(s => {
    const d = new Date(s.savedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  const recentScripts = [...scripts].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 4);
  const recentCarousels = [...carousels].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).slice(0, 4);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>{greeting}</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 36 }}>
        {/* Script CTA */}
        <div style={{
          padding: 24, borderRadius: 12,
          background: "var(--text)", color: "var(--bg)",
          cursor: "pointer", position: "relative", overflow: "hidden",
        }} onClick={onNewScript}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 8 }}>UGC Scripter</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>New script</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>Generate hooks + full UGC script</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Generate →</div>
        </div>

        {/* Carousel CTA */}
        <div style={{
          padding: 24, borderRadius: 12,
          background: "#0f4f5c", color: "white",
          cursor: "pointer", position: "relative", overflow: "hidden",
        }} onClick={onNewCarousel}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.5, marginBottom: 8 }}>Carousel Builder</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>New carousel</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 16 }}>Build an Instagram carousel post</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Build →</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 40 }}>
        <StatCard value={loading ? "—" : scripts.length} label="Scripts saved" />
        <StatCard value={loading ? "—" : carousels.length} label="Carousels built" />
        <StatCard value={loading ? "—" : thisWeekScripts} label="Scripts this week" />
        <StatCard value={loading ? "—" : scripts.filter(s => s.status === "review").length} label="In review" />
      </div>

      {/* Recents */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        {/* Recent scripts */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent scripts</span>
            <button onClick={onNewScript} style={{ fontSize: 12, color: "#1e7a8a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</div>
          ) : recentScripts.length === 0 ? (
            <div style={{ padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>No scripts yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {recentScripts.map(s => <ScriptCard key={s.id} script={s} onClick={() => onOpenScript(s)} />)}
            </div>
          )}
        </div>

        {/* Recent carousels */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent carousels</span>
            <button onClick={onOpenCarousel} style={{ fontSize: 12, color: "#1e7a8a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
              View all →
            </button>
          </div>
          {loading ? (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading...</div>
          ) : recentCarousels.length === 0 ? (
            <div style={{ padding: "24px 0", color: "var(--muted)", fontSize: 13 }}>No carousels yet.</div>
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
