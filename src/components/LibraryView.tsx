"use client";
import { useState, useEffect } from "react";
import { Script } from "@/lib/types";
import { getLibrary } from "@/lib/storage";

const FILTERS = [
  { key: "all", label: "ALL" },
  { key: "draft", label: "DRAFT" },
  { key: "review", label: "IN REVIEW" },
  { key: "locked", label: "LOCKED" },
] as const;

function TagChip({ children }: { children: string }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)", fontSize: 10, border: "1px solid var(--gray3)",
      padding: "2px 6px", color: "var(--gray5)", background: "var(--gray1)",
    }}>{children}</span>
  );
}

export default function LibraryView({ onOpen }: { onOpen: (s: Script) => void }) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filter, setFilter] = useState<"all" | "draft" | "review" | "locked">("all");

  useEffect(() => { setScripts(getLibrary()); }, []);

  const filtered = filter === "all" ? scripts : scripts.filter((s) => s.status === filter);

  return (
    <div className="animate-slide-in" style={{ padding: "24px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 11, letterSpacing: "0.15em" }}>
            LIBRARY<span className="animate-blink">_</span>
          </p>
          <p style={{ fontFamily: "var(--font-crt)", fontSize: 18, color: "var(--gray4)", marginTop: 4 }}>
            {scripts.length} script{scripts.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        {/* Filter chips */}
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                fontFamily: "var(--font-pixel)", fontSize: 6, padding: "6px 12px",
                background: filter === f.key ? "var(--black)" : "var(--white)",
                color: filter === f.key ? "var(--white)" : "var(--black)",
                border: "2px solid var(--black)",
                cursor: "pointer",
                boxShadow: filter === f.key ? "none" : "2px 2px 0 var(--black)",
                transform: filter === f.key ? "translate(2px,2px)" : "none",
                letterSpacing: "0.08em",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 9, color: "var(--gray4)", letterSpacing: "0.1em" }}>NO SCRIPTS FOUND</p>
          <p style={{ fontFamily: "var(--font-crt)", fontSize: 18, color: "var(--gray3)", marginTop: 8 }}>
            {filter === "all" ? "Generate your first script to get started." : `No ${filter} scripts yet.`}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {filtered.map((s) => (
            <div key={s.id} className="script-card" onClick={() => onOpen(s)}>
              <div className="card-stripe" />
              <div style={{ padding: 16 }}>
                {/* Status */}
                <div style={{ marginBottom: 10 }}>
                  <span className={`status-${s.status === "review" ? "review" : s.status}`}>
                    {s.status === "review" ? "IN REVIEW" : s.status.toUpperCase()}
                  </span>
                </div>

                {/* Title */}
                <p style={{ fontFamily: "var(--font-pixel)", fontSize: 8, lineHeight: 1.7, marginBottom: 8, letterSpacing: "0.04em" }}>
                  {s.title}
                </p>

                {/* Hook preview */}
                <p style={{
                  fontFamily: "var(--font-crt)", fontSize: 17, color: "var(--gray5)",
                  marginBottom: 12, lineHeight: 1.4,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  "{s.hook}"
                </p>

                {/* Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                  {[s.persona, s.angle, s.format].filter(Boolean).map((tag) => (
                    <TagChip key={tag}>{tag}</TagChip>
                  ))}
                </div>

                {/* Footer */}
                <div style={{
                  borderTop: "1px dashed var(--gray3)", paddingTop: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gray4)" }}>
                    {s.creator || "—"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gray3)" }}>
                    {new Date(s.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
