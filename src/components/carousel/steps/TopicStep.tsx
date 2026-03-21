"use client";
import { useState, useEffect } from "react";
import { HookTone, Subject, CarouselTemplate } from "@/lib/types";

const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Clear, factual, teaches something new" },
  { value: "science-backed", label: "Science-backed", description: "Lead with research findings and data" },
  { value: "curiosity", label: "Curiosity gap", description: "Tease a counterintuitive insight" },
  { value: "myth-bust", label: "Myth-bust", description: "Challenge a common misconception" },
  { value: "clickbait", label: "Bold hook", description: "Provocative, creates urgency" },
  { value: "personal-story", label: "Personal story", description: "Relatable journey with Lunia" },
];

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
  onNext: (topic: string, hookTone: HookTone, subjectId?: string, templateId?: string) => void;
};

type Mode = "list" | "custom";

export default function TopicStep({ onNext }: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [custom, setCustom] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [templates, setTemplates] = useState<CarouselTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => { setSubjects(Array.isArray(d) ? d : []); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
    fetch("/api/carousel-templates")
      .then((r) => r.json())
      .then((d: CarouselTemplate[]) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const topic = mode === "list"
    ? (selectedSubject?.text ?? "")
    : custom.trim();

  const topicTooLong = topic.length > 500;

  const filteredSubjects = subjects.filter((s) => {
    const matchCat = category === "All" || s.category === category;
    const matchSearch = s.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const usedCount = subjects.filter((s) => s.usedAt).length;

  function handleNext() {
    if (!topic || topicTooLong) return;
    const subjectId = mode === "list" ? selectedSubject?.id : undefined;
    onNext(topic, hookTone, subjectId, selectedTemplate?.id);
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Choose a topic</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>Pick from your subject library or enter a custom topic.</p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
        {(["list", "custom"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "8px 20px",
              fontSize: 13,
              fontWeight: 600,
              background: mode === m ? "var(--text)" : "var(--bg)",
              color: mode === m ? "var(--bg)" : "var(--muted)",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {m === "list" ? "Subject library" : "Custom topic"}
          </button>
        ))}
      </div>

      {/* List mode */}
      {mode === "list" && (
        <div style={{ marginBottom: 28 }}>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              style={{
                flex: "1 1 200px",
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

          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            {loadingSubjects ? "Loading..." : `${filteredSubjects.length} subjects · ${usedCount} used`}
          </div>

          {/* Subject list */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
            {filteredSubjects.length === 0 && !loadingSubjects && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No subjects match your filter.
              </div>
            )}
            {filteredSubjects.map((s) => {
              const used = !!s.usedAt;
              const isSelected = selectedSubject?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSubject(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--text)"
                      : used
                      ? "rgba(34,197,94,0.06)"
                      : "var(--bg)",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: isSelected ? 700 : used ? 600 : 400,
                      color: isSelected ? "var(--bg)" : used ? "#15803d" : "var(--text)",
                      lineHeight: 1.4,
                    }}>
                      {s.text}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{
                      fontSize: 10,
                      color: isSelected ? "rgba(255,255,255,0.6)" : "var(--subtle)",
                    }}>{s.category}</span>
                    {used && !isSelected && (
                      <span style={{
                        background: "rgba(34,197,94,0.15)",
                        color: "#15803d",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 3,
                        textTransform: "uppercase",
                      }}>Used</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedSubject && (
            <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--surface)", borderRadius: 7, fontSize: 13, fontWeight: 600 }}>
              Selected: {selectedSubject.text}
            </div>
          )}
        </div>
      )}

      {/* Custom mode */}
      {mode === "custom" && (
        <div style={{ marginBottom: 28 }}>
          <input
            type="text"
            value={custom}
            maxLength={500}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Why magnesium beats melatonin for deep sleep"
            style={{
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
              border: `1.5px solid ${topicTooLong ? "#e53e3e" : "var(--border)"}`,
              borderRadius: 8,
              fontFamily: "inherit",
              outline: "none",
              background: "var(--bg)",
              color: "var(--text)",
              boxSizing: "border-box",
            }}
          />
          {topicTooLong && <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 4 }}>Maximum 500 characters</div>}
        </div>
      )}

      {/* Hook tone */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Hook tone</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {HOOK_TONE_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              onClick={() => setHookTone(opt.value)}
              style={{
                border: `1.5px solid ${hookTone === opt.value ? "var(--text)" : "var(--border)"}`,
                borderRadius: 8,
                padding: "10px 12px",
                cursor: "pointer",
                background: hookTone === opt.value ? "var(--surface)" : "var(--bg)",
                transition: "all 0.12s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{opt.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Carousel template <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {templates.map((t) => {
              const isSelected = selectedTemplate?.id === t.id;
              const firstImage = t.images[0];
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTemplate(isSelected ? null : t)}
                  style={{
                    cursor: "pointer",
                    borderRadius: 8,
                    overflow: "hidden",
                    width: 80,
                    border: isSelected ? "2.5px solid #1e7a8a" : "2px solid var(--border)",
                    boxShadow: isSelected ? "0 0 0 3px rgba(30,122,138,0.15)" : "none",
                    transition: "all 0.15s",
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  {firstImage && (
                    <img src={firstImage.url} alt={t.name} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", display: "block" }} />
                  )}
                  {!firstImage && (
                    <div style={{ width: "100%", aspectRatio: "4/5", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--muted)" }}>
                      No img
                    </div>
                  )}
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 4, right: 4,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#1e7a8a", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ padding: "4px 6px", fontSize: 10, fontWeight: 600, color: isSelected ? "#1e7a8a" : "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.name}
                  </div>
                </div>
              );
            })}
          </div>
          {selectedTemplate && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#1e7a8a", fontWeight: 600 }}>
              Template: {selectedTemplate.name}
            </div>
          )}
        </div>
      )}

      <button
        disabled={!topic || topicTooLong}
        onClick={handleNext}
        style={{
          background: topic && !topicTooLong ? "var(--text)" : "var(--border)",
          color: topic && !topicTooLong ? "var(--bg)" : "var(--muted)",
          border: "none",
          borderRadius: 8,
          padding: "14px 36px",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: topic && !topicTooLong ? "pointer" : "not-allowed",
          letterSpacing: "-0.01em",
        }}
      >
        Generate carousel →
      </button>
    </div>
  );
}
