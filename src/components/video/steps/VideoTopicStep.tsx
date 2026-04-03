"use client";

import { useState, useEffect } from "react";
import { Subject } from "@/lib/types";

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

type Props = {
  onNext: (topic: string, subjectId?: string) => void;
  loading: boolean;
};

type Mode = "list" | "custom";

export default function VideoTopicStep({ onNext, loading }: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => { setSubjects(Array.isArray(d) ? d : []); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
  }, []);

  const topic = mode === "list" ? (selectedSubject?.text ?? "") : custom.trim();

  const filteredSubjects = subjects.filter((s) => {
    if (s.usedAt) return false;
    const matchCat = category === "All" || s.category === category;
    const matchSearch = s.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleNext() {
    if (!topic || loading) return;
    const subjectId = mode === "list" ? selectedSubject?.id : undefined;
    onNext(topic, subjectId);
  }

  const S = {
    label: { fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 } as React.CSSProperties,
    input: { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "10px 12px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
  };

  function modeBtn(active: boolean): React.CSSProperties {
    return {
      padding: "7px 18px", borderRadius: 4, border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent-dim)" : "transparent", color: active ? "var(--accent)" : "var(--muted)",
      fontFamily: "Inter, sans-serif", fontSize: 12, cursor: "pointer", letterSpacing: "0.04em",
    };
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)", marginBottom: 6 }}>
        Choose a topic
      </h2>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Pick from your subject library or enter a custom topic. Claude will write a 5-scene video script.
      </p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={modeBtn(mode === "list")} onClick={() => setMode("list")}>Subject Library</button>
        <button style={modeBtn(mode === "custom")} onClick={() => setMode("custom")}>Custom Topic</button>
      </div>

      {mode === "list" ? (
        <div>
          {/* Search + category */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...S.input, width: "auto", cursor: "pointer" }}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {loadingSubjects ? (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", padding: "24px 0" }}>Loading subjects...</div>
          ) : (
            <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
              {filteredSubjects.length === 0 ? (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--subtle)", padding: "16px 0" }}>No subjects match your search.</div>
              ) : filteredSubjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSubject(s)}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 4,
                    border: `1px solid ${selectedSubject?.id === s.id ? "var(--accent)" : "var(--border)"}`,
                    background: selectedSubject?.id === s.id ? "var(--accent-dim)" : "var(--surface)",
                    color: "var(--text)",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "block" }}>{s.text}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.04em" }}>{s.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <label style={S.label}>Custom topic</label>
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Why magnesium helps you fall asleep faster"
            rows={3}
            style={{ ...S.input, resize: "vertical", fontFamily: "Inter, sans-serif" }}
          />
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={!topic || loading}
        style={{
          marginTop: 28,
          background: topic && !loading ? "var(--accent)" : "var(--surface-r)",
          color: topic && !loading ? "var(--bg)" : "var(--muted)",
          border: "none",
          borderRadius: 4,
          padding: "12px 32px",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 500,
          cursor: topic && !loading ? "pointer" : "not-allowed",
          letterSpacing: "0.04em",
        }}
      >
        {loading ? "Generating script..." : "Generate Script"}
      </button>
    </div>
  );
}
