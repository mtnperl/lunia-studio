"use client";
import { useState, useEffect } from "react";
import { Script } from "@/lib/types";
import { getLibrary, deleteScript } from "@/lib/storage";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "review", label: "In Review" },
  { key: "locked", label: "Locked" },
] as const;

function TagChip({ children }: { children: string }) {
  return (
    <span style={{
      fontSize: 11, border: "1px solid var(--border)",
      padding: "2px 7px", color: "var(--muted)", background: "var(--surface)",
      borderRadius: 4,
    }}>{children}</span>
  );
}

function StatusChip({ status }: { status: Script["status"] }) {
  const cls = status === "review" ? "chip chip-review" : status === "locked" ? "chip chip-locked" : "chip chip-draft";
  const label = status === "review" ? "In Review" : status === "locked" ? "Locked" : "Draft";
  return <span className={cls}>{label}</span>;
}

export default function LibraryView({ onOpen }: { onOpen: (s: Script) => void }) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "review" | "locked">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { getLibrary().then(setScripts).catch(() => setScripts([])); }, []);

  async function handleDelete(id: string) {
    await deleteScript(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
  }

  const filtered = filter === "all" ? scripts : scripts.filter((s) => s.status === filter);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 24, fontWeight: 600, margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>Library</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, marginBottom: 16 }}>
          {scripts.length} script{scripts.length !== 1 ? "s" : ""} saved
        </p>
        {/* Filter tabs — left-aligned */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, width: "fit-content" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontSize: 13, fontWeight: 500, padding: "5px 14px",
                background: filter === f.key ? "var(--bg)" : "transparent",
                color: filter === f.key ? "var(--text)" : "var(--muted)",
                border: filter === f.key ? "1px solid var(--border)" : "1px solid transparent",
                borderRadius: 6,
                cursor: "pointer",
                boxShadow: filter === f.key ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                fontFamily: "inherit",
                transition: "all .15s",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginBottom: 6 }}>
            {filter === "all" ? "No scripts yet" : `No ${filter} scripts`}
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            {filter === "all" ? "Generate your first script to get started." : `No ${filter} scripts yet.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {filtered.map((s) => (
            <div key={s.id} className="card" onClick={() => onOpen(s)} style={{ cursor: "pointer", padding: 18 }}>
              {/* Status + date row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <StatusChip status={s.status} />
                <span style={{ fontSize: 12, color: "var(--subtle)" }}>
                  {new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Title */}
              <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>
                {s.title}
              </p>

              {/* Hook preview */}
              <p style={{
                fontSize: 13, color: "var(--muted)",
                marginBottom: 14, lineHeight: 1.5,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                "{s.hook}"
              </p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                {[s.persona, s.angle, s.format].filter(Boolean).map((tag) => (
                  <TagChip key={tag}>{tag!}</TagChip>
                ))}
              </div>

              {/* Footer */}
              <div style={{
                borderTop: "1px solid var(--border)", paddingTop: 10,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                  {s.creator || "—"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {confirmDeleteId === s.id ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                      >Delete</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                      >Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.id); }}
                        style={{ fontSize: 12, fontWeight: 600, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, lineHeight: 1 }}
                        title="Delete script"
                      >Delete</button>
                      <span style={{ fontSize: 12, color: "var(--subtle)" }}>Open →</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
