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

const VIDEO_STYLES = [
  {
    id: "cinematic",
    label: "Dark Cinematic",
    example: "Deep navy, dramatic gold accent",
    description: "Bold headline text, warm gold accents, dramatic scene overlays.",
  },
  {
    id: "serene",
    label: "Soft & Serene",
    example: "Lighter tones, cyan highlights",
    description: "Reduced overlay intensity, breathing room, cool cyan accents.",
  },
  {
    id: "bold",
    label: "Bold Impact",
    example: "Maximum contrast, heavy type",
    description: "Pure-black depth, white text at full opacity, high-energy feel.",
  },
];

const HOOK_TONES = [
  {
    id: "pattern-interrupt",
    label: "Pattern Interrupt",
    example: '"Stop telling yourself you\'re a bad sleeper."',
    description: "Challenges a false belief the viewer holds about themselves.",
  },
  {
    id: "stat-shock",
    label: "Stat Shock",
    example: '"72% of adults wake up exhausted every morning."',
    description: "Leads with a counterintuitive statistic that forces a reframe.",
  },
  {
    id: "question-hook",
    label: "Question Hook",
    example: '"Why do you fall asleep fine but wake up at 3am?"',
    description: "A conversational question that mirrors the viewer's exact experience.",
  },
];

const VIDEO_FORMATS = [
  {
    id: "brand-story",
    label: "Brand Story",
    description: "5-scene cinematic structure: hook, science, product, social proof, CTA.",
    tag: "Recommended",
  },
  {
    id: "captions",
    label: "TikTok Captions",
    description: "Word-by-word animated captions over a full-screen background. Raw, scroll-stopping.",
    tag: "New",
  },
];

type Props = {
  onNext: (topic: string, subjectId?: string, hookTone?: string) => void;
  loading: boolean;
  videoStyle: string;
  onStyleChange: (style: string) => void;
  videoFormat?: string;
  onFormatChange?: (format: string) => void;
};

type Mode = "list" | "custom";

export default function VideoTopicStep({ onNext, loading, videoStyle, onStyleChange, videoFormat = "brand-story", onFormatChange }: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [custom, setCustom] = useState("");
  const [hookTone, setHookTone] = useState<string>("pattern-interrupt");

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
    onNext(topic, subjectId, hookTone);
  }

  const S = {
    label: {
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: 11,
      color: "var(--muted)",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      display: "block",
      marginBottom: 8,
    } as React.CSSProperties,
    input: {
      width: "100%",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 4,
      padding: "10px 12px",
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: 13,
      color: "var(--text)",
      outline: "none",
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
  };

  function modeBtn(active: boolean): React.CSSProperties {
    return {
      padding: "7px 18px",
      borderRadius: 4,
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      background: active ? "var(--accent-dim)" : "transparent",
      color: active ? "var(--accent)" : "var(--muted)",
      fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
      fontSize: 12,
      cursor: "pointer",
      letterSpacing: "0.04em",
    };
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: 6,
          letterSpacing: "-0.02em",
        }}
      >
        Choose a topic
      </h2>
      <p style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Pick from your subject library or enter a custom topic. Claude will write a 5-scene video script.
      </p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button style={modeBtn(mode === "list")} onClick={() => setMode("list")}>Subject Library</button>
        <button style={modeBtn(mode === "custom")} onClick={() => setMode("custom")}>Custom Topic</button>
      </div>

      {mode === "list" ? (
        <div>
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
            <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--muted)", padding: "24px 0" }}>
              Loading subjects...
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
              {filteredSubjects.length === 0 ? (
                <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 13, color: "var(--subtle)", padding: "16px 0" }}>
                  No subjects match your search.
                </div>
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
                    fontFamily: "Helvetica Neue, sans-serif",
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
            style={{ ...S.input, resize: "vertical" }}
          />
        </div>
      )}

      {/* Video Format selector */}
      <div style={{ marginTop: 28, marginBottom: 4 }}>
        <label style={S.label}>Video Format</label>
        <p style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 12, color: "var(--subtle)", marginBottom: 12 }}>
          Choose the structure of your video.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VIDEO_FORMATS.map((fmt) => {
            const active = videoFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                onClick={() => onFormatChange?.(fmt.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 6,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "var(--accent)" : "var(--border)", flexShrink: 0 }} />
                  <span style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 12, fontWeight: 600, color: active ? "var(--accent)" : "var(--text)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {fmt.label}
                  </span>
                  <span style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 10, color: "var(--accent)", background: "var(--accent-dim)", borderRadius: 3, padding: "1px 6px", letterSpacing: "0.06em" }}>
                    {fmt.tag}
                  </span>
                </div>
                <div style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 12, color: active ? "var(--muted)" : "var(--subtle)", paddingLeft: 16 }}>
                  {fmt.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Style selector */}
      <div style={{ marginTop: 28, marginBottom: 4 }}>
        <label style={S.label}>Visual Style</label>
        <p style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 12, color: "var(--subtle)", marginBottom: 12 }}>
          Choose the look and feel of your video ad.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VIDEO_STYLES.map((style) => {
            const active = videoStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 6,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: active ? "var(--accent)" : "var(--border)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Helvetica Neue, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: active ? "var(--accent)" : "var(--text)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {style.label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "Helvetica Neue, sans-serif",
                    fontSize: 12,
                    color: active ? "var(--text)" : "var(--muted)",
                    fontStyle: "italic",
                    marginBottom: 2,
                    paddingLeft: 16,
                  }}
                >
                  {style.example}
                </div>
                <div
                  style={{
                    fontFamily: "Helvetica Neue, sans-serif",
                    fontSize: 11,
                    color: "var(--subtle)",
                    paddingLeft: 16,
                  }}
                >
                  {style.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hook tone selector */}
      <div style={{ marginTop: 28, marginBottom: 4 }}>
        <label style={S.label}>Hook style</label>
        <p style={{ fontFamily: "Helvetica Neue, sans-serif", fontSize: 12, color: "var(--subtle)", marginBottom: 12 }}>
          Choose a scroll-stopping hook type for the opening scene.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {HOOK_TONES.map((tone) => {
            const active = hookTone === tone.id;
            return (
              <button
                key={tone.id}
                onClick={() => setHookTone(tone.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: 6,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "var(--surface)",
                  cursor: "pointer",
                  transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: active ? "var(--accent)" : "var(--border)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Helvetica Neue, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: active ? "var(--accent)" : "var(--text)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {tone.label}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "Helvetica Neue, sans-serif",
                    fontSize: 12,
                    color: active ? "var(--text)" : "var(--muted)",
                    fontStyle: "italic",
                    marginBottom: 2,
                    paddingLeft: 16,
                  }}
                >
                  {tone.example}
                </div>
                <div
                  style={{
                    fontFamily: "Helvetica Neue, sans-serif",
                    fontSize: 11,
                    color: "var(--subtle)",
                    paddingLeft: 16,
                  }}
                >
                  {tone.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

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
          fontFamily: "Helvetica Neue, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          cursor: topic && !loading ? "pointer" : "not-allowed",
          letterSpacing: "0.04em",
        }}
      >
        {loading ? "Generating script..." : "Generate Script"}
      </button>
    </div>
  );
}
