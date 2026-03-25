"use client";
import { useState, useEffect, useRef } from "react";
import { Subject } from "@/lib/types";

const CONFIRM_DELETE_MS = 2000; // hold for 2s to confirm

const CATEGORIES = [
  "All",
  "Sleep Science",
  "Circadian Rhythm",
  "Sleep Hygiene",
  "Nutrition & Sleep",
  "Mental Health & Sleep",
  "Performance & Recovery",
  "Lunia Ingredients",
  "Sleep Disorders",
  "Lifestyle & Productivity",
];

export default function SubjectsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadSubjects() {
    setLoading(true);
    try {
      const d = await fetch("/api/subjects").then((r) => r.json());
      setSubjects(Array.isArray(d) ? d : []);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch("/api/subjects/seed", { method: "POST" });
      await loadSubjects();
    } finally {
      setSeeding(false);
    }
  }

  useEffect(() => { loadSubjects(); }, []);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setEditText(s.text);
  }

  async function handleDelete(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setDeletingId(null);
    await fetch(`/api/subjects/${id}`, { method: "DELETE" });
  }

  async function commitEdit(id: string) {
    if (!editText.trim()) { setEditingId(null); return; }
    setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, text: editText.trim() } : s));
    setEditingId(null);
    await fetch(`/api/subjects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: editText.trim() }),
    });
  }

  const filtered = subjects.filter((s) => {
    const matchCat = category === "All" || s.category === category;
    const matchSearch = s.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const usedCount = subjects.filter((s) => s.usedAt).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Subject library</h2>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            {subjects.length} subjects · {usedCount} used · {subjects.length - usedCount} remaining
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border)", borderRadius: 7,
            cursor: seeding ? "wait" : "pointer", fontFamily: "inherit",
            opacity: seeding ? 0.6 : 1,
          }}
        >
          {seeding ? "Seeding…" : "↺ Restore 150 subjects"}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subjects..."
          style={{
            flex: "1 1 220px",
            padding: "8px 12px",
            fontSize: 13,
            border: "1.5px solid var(--border)",
            borderRadius: 7,
            fontFamily: "inherit",
            background: "var(--bg)",
            color: "var(--text)",
            outline: "none",
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            border: "1.5px solid var(--border)",
            borderRadius: 7,
            fontFamily: "inherit",
            background: "var(--bg)",
            color: "var(--text)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", fontSize: 14, padding: "32px 0" }}>Loading subjects...</div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 180px 80px 52px",
            padding: "10px 16px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            <div>#</div>
            <div>Subject</div>
            <div>Category</div>
            <div>Status</div>
            <div></div>
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              {subjects.length === 0 && !loading ? (
                <div>
                  <div style={{ marginBottom: 12 }}>No subjects found.</div>
                  <button
                    onClick={handleSeed}
                    disabled={seeding}
                    style={{
                      padding: "10px 20px", fontSize: 13, fontWeight: 700,
                      background: "var(--text)", color: "var(--bg)",
                      border: "none", borderRadius: 7,
                      cursor: seeding ? "wait" : "pointer", fontFamily: "inherit",
                    }}
                  >
                    {seeding ? "Seeding…" : "Load 150 subjects"}
                  </button>
                </div>
              ) : (
                "No subjects match your filter."
              )}
            </div>
          )}

          {filtered.map((s, i) => {
            const used = !!s.usedAt;
            const isEditing = editingId === s.id;
            return (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr 180px 80px 52px",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border)",
                  background: used ? "rgba(34,197,94,0.06)" : "var(--bg)",
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--subtle)" }}>{i + 1}</div>

                <div>
                  {isEditing ? (
                    <input
                      ref={inputRef}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitEdit(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(s.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        fontSize: 13,
                        border: "1.5px solid var(--text)",
                        borderRadius: 5,
                        fontFamily: "inherit",
                        background: "var(--bg)",
                        color: "var(--text)",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(s)}
                      title="Click to edit"
                      style={{
                        fontSize: 13,
                        color: used ? "#15803d" : "var(--text)",
                        fontWeight: used ? 600 : 400,
                        cursor: "text",
                        lineHeight: 1.4,
                      }}
                    >
                      {s.text}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.category}</div>

                <div>
                  {used ? (
                    <span style={{
                      display: "inline-block",
                      background: "rgba(34,197,94,0.15)",
                      color: "#15803d",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}>Used</span>
                  ) : (
                    <span style={{ color: "var(--subtle)", fontSize: 12 }}>—</span>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  {deletingId === s.id ? (
                    <button
                      onClick={() => handleDelete(s.id)}
                      onBlur={() => setDeletingId(null)}
                      autoFocus
                      style={{
                        padding: "2px 6px", fontSize: 10, fontWeight: 700,
                        background: "#dc2626", color: "#fff",
                        border: "none", borderRadius: 4,
                        cursor: "pointer", fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setDeletingId(s.id)}
                      title="Delete subject"
                      style={{
                        padding: "2px 6px", fontSize: 13, fontWeight: 700,
                        background: "none", color: "var(--subtle)",
                        border: "none", borderRadius: 4,
                        cursor: "pointer", fontFamily: "inherit",
                        lineHeight: 1,
                        opacity: 0.5,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"; (e.currentTarget as HTMLButtonElement).style.color = "var(--subtle)"; }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: "var(--subtle)" }}>
        Click any subject to edit it inline. Changes are saved automatically.
      </div>
    </div>
  );
}
