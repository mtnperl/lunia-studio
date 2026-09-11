"use client";
import { useState, useEffect, useRef } from "react";
import { Subject } from "@/lib/types";
import { SUBJECT_FORMATS, SUBJECT_FORMAT_CHIP, SUBJECT_FORMAT_LABEL, subjectFitsFormat, subjectFormats, subjectUsedFormats, type SubjectFormat } from "@/lib/subject-fit";

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
  "Longevity & Sleep Research",
  "Did You Know",
  "Chartbook",
  "Primer",
  "Latest Research",
  "Sleep Researchers",
];

const USED_LABEL: Record<string, string> = { standard: "Structured", engagement: "Engagement", did_you_know: "DYK", chartbook: "Chart", primer: "Primer", video: "Video" };

export default function SubjectsView() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [pullingResearch, setPullingResearch] = useState(false);
  const [pullStatus, setPullStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  // Filter by the frozen format a subject fits; "any" shows everything.
  const [fitFilter, setFitFilter] = useState<"any" | SubjectFormat>("any");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unmarkingId, setUnmarkingId] = useState<string | null>(null);
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

  async function handlePullLatestResearch() {
    setPullingResearch(true);
    setPullStatus(null);
    try {
      const res = await fetch("/api/subjects/latest-research", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? `Failed (${res.status})`;
        setPullStatus(`⚠ ${msg}`);
        setTimeout(() => setPullStatus(null), 15_000);
        return;
      }
      const { added = 0, skipped = 0 } = data as { added?: number; skipped?: number };
      if (added > 0) {
        setPullStatus(`✓ +${added} added${skipped ? `, ${skipped} already in library` : ""}`);
        setCategory("Latest Research");
        await loadSubjects();
        setTimeout(() => setPullStatus(null), 8_000);
      } else {
        setPullStatus(`All ${skipped} findings already in library — try again later`);
        setTimeout(() => setPullStatus(null), 8_000);
      }
    } catch (err) {
      setPullStatus(`⚠ ${err instanceof Error ? err.message : "Network error — check connection"}`);
      setTimeout(() => setPullStatus(null), 15_000);
    } finally {
      setPullingResearch(false);
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

  async function handleMarkUnused(id: string) {
    setSubjects((prev) => prev.map((s) => s.id === id ? { ...s, usedAt: undefined, usedFor: undefined } : s));
    setUnmarkingId(null);
    await fetch(`/api/subjects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markUnused" }),
    });
  }

  /** Toggle one format tag. A subject in a category named for a format
   *  (Did You Know, Chartbook, Primer) always fits that one. */
  async function toggleFormat(s: Subject, f: SubjectFormat) {
    const current = (s.formats ?? []).filter((x): x is SubjectFormat => SUBJECT_FORMATS.includes(x as SubjectFormat));
    const next = current.includes(f) ? current.filter((x) => x !== f) : [...current, f];
    setSubjects((prev) => prev.map((x) => x.id === s.id ? { ...x, formats: next } : x));
    await fetch(`/api/subjects/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formats: next }),
    });
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
    const matchFit = fitFilter === "any" || subjectFitsFormat(s, fitFilter);
    const matchSearch = s.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchFit && matchSearch;
  });
  const fitCounts = Object.fromEntries(SUBJECT_FORMATS.map((f) => [f, subjects.filter((s) => subjectFitsFormat(s, f)).length])) as Record<SubjectFormat, number>;

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {pullStatus && (
            <span style={{
              fontSize: 12,
              color: pullStatus.startsWith("⚠") ? "#dc2626" : pullStatus.startsWith("✓") ? "#15803d" : "var(--muted)",
              fontWeight: pullStatus.startsWith("⚠") || pullStatus.startsWith("✓") ? 600 : 400,
              maxWidth: 320,
            }}>{pullStatus}</span>
          )}
          <button
            onClick={handlePullLatestResearch}
            disabled={pullingResearch}
            title="Search the web for recent sleep research and add findings to the library"
            style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              background: pullingResearch ? "var(--surface)" : "var(--accent)",
              color: pullingResearch ? "var(--muted)" : "#fff",
              border: pullingResearch ? "1px solid var(--border)" : "1px solid var(--accent)",
              borderRadius: 7,
              cursor: pullingResearch ? "wait" : "pointer", fontFamily: "inherit",
              opacity: pullingResearch ? 0.7 : 1,
            }}
          >
            {pullingResearch ? "Searching the web…" : "↻ Pull latest research"}
          </button>
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
            {seeding ? "Seeding…" : "↺ Restore defaults"}
          </button>
        </div>
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
        <select
          value={fitFilter}
          onChange={(e) => setFitFilter(e.target.value as "any" | SubjectFormat)}
          title="Show subjects that fit one two-slide format"
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
          <option value="any">Any format</option>
          {SUBJECT_FORMATS.map((f) => <option key={f} value={f}>{SUBJECT_FORMAT_LABEL[f]} ({fitCounts[f]})</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ color: "var(--muted)", fontSize: 14, padding: "32px 0" }}>Loading subjects...</div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px 1fr 150px 150px 96px 52px",
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
            <div title="Which two-slide formats the subject fits. Structured and Engagement always do.">Fits</div>
            <div>Used for</div>
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
                      background: "var(--accent)", color: "#fff",
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
                  gridTemplateColumns: "36px 1fr 150px 150px 96px 52px",
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
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>{s.text}</span>
                      {s.sourceUrl && (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(e) => e.stopPropagation()}
                          title={s.sourceUrl}
                          style={{
                            fontSize: 11,
                            color: "var(--muted)",
                            textDecoration: "none",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            padding: "1px 5px",
                            flexShrink: 0,
                          }}
                        >
                          source ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.category}</div>

                <div style={{ display: "flex", gap: 4 }}>
                  {SUBJECT_FORMATS.map((f) => {
                    const on = subjectFormats(s).includes(f);
                    const byCategory = on && !(s.formats ?? []).includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { if (!byCategory) toggleFormat(s, f); }}
                        title={byCategory ? `Fits ${SUBJECT_FORMAT_LABEL[f]} by category` : on ? `Fits ${SUBJECT_FORMAT_LABEL[f]}. Click to remove` : `Click to mark as fitting ${SUBJECT_FORMAT_LABEL[f]}`}
                        style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                          padding: "2px 5px", borderRadius: 3, cursor: byCategory ? "default" : "pointer", fontFamily: "inherit",
                          border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                          background: on ? "var(--accent-dim)" : "transparent",
                          color: on ? "var(--accent)" : "var(--subtle)",
                          opacity: on ? 1 : 0.6,
                        }}
                      >
                        {SUBJECT_FORMAT_CHIP[f]}
                      </button>
                    );
                  })}
                </div>

                <div>
                  {used ? (
                    unmarkingId === s.id ? (
                      <button
                        onClick={() => handleMarkUnused(s.id)}
                        onBlur={() => setUnmarkingId(null)}
                        autoFocus
                        style={{
                          padding: "2px 6px", fontSize: 10, fontWeight: 700,
                          background: "#d97706", color: "#fff",
                          border: "none", borderRadius: 4,
                          cursor: "pointer", fontFamily: "inherit",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setUnmarkingId(s.id)}
                        title={`Used for ${subjectUsedFormats(s).map((f) => USED_LABEL[f] ?? f).join(", ")}. Click to mark unused`}
                        style={{
                          display: "inline-block",
                          background: "rgba(34,197,94,0.15)",
                          color: "#15803d",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#d97706"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(34,197,94,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#15803d"; }}
                      >
                        {subjectUsedFormats(s).map((f) => USED_LABEL[f] ?? f).join(" · ") || "Used"}
                      </button>
                    )
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
