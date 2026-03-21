"use client";
import { useState, useEffect } from "react";
import { Topic, HookTone } from "@/lib/types";

const PILLARS_COLORS: Record<string, string> = {
  "Sleep Science": "#1e7a8a",
  "Ingredient Education": "#2d8a6a",
  "Cortisol & Stress": "#8a4a1e",
  "Longevity": "#4a1e8a",
  "Wind-Down Routines": "#1e4a8a",
};

const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Clear, factual, teaches something new" },
  { value: "science-backed", label: "Science-backed", description: "Lead with research findings and data" },
  { value: "curiosity", label: "Curiosity gap", description: "Tease a counterintuitive insight" },
  { value: "myth-bust", label: "Myth-bust", description: "Challenge a common misconception" },
  { value: "clickbait", label: "Bold hook", description: "Provocative, creates urgency" },
  { value: "personal-story", label: "Personal story", description: "Relatable journey with Lunia" },
];

type Props = {
  onNext: (topic: string, hookTone: HookTone, count: number) => void;
};

export default function TopicStep({ onNext }: Props) {
  const [suggestions, setSuggestions] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [count, setCount] = useState(1);

  useEffect(() => {
    fetch("/api/carousel/suggestions", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { setSuggestions(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const topic = selected || custom.trim();
  const topicTooLong = topic.length > 500;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: 15,
    border: "1.5px solid var(--border)",
    borderRadius: 8,
    fontFamily: "inherit",
    outline: "none",
    background: "var(--bg)",
    color: "var(--text)",
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Choose a topic</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>Pick from AI suggestions or type your own.</p>

      {loading ? (
        <div style={{ color: "var(--muted)", fontSize: 14, marginBottom: 28 }}>Generating suggestions...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => { setSelected(s.title); setCustom(""); }}
              style={{
                border: `1.5px solid ${selected === s.title ? "var(--text)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "16px 18px",
                cursor: "pointer",
                background: selected === s.title ? "var(--surface)" : "var(--bg)",
                transition: "all 0.12s",
              }}
            >
              <div style={{
                display: "inline-block",
                background: PILLARS_COLORS[s.pillar] || "#333",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 3,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>{s.pillar}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Or type your own topic</label>
        <input
          type="text"
          value={custom}
          maxLength={500}
          onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          placeholder="e.g. Why magnesium beats melatonin for deep sleep"
          style={{ ...inputStyle, borderColor: topicTooLong ? "#e53e3e" : undefined }}
        />
        {topicTooLong && <div style={{ fontSize: 12, color: "#e53e3e", marginTop: 4 }}>Maximum 500 characters</div>}
      </div>

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

      {/* Variant count */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Variants to generate
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              style={{
                padding: "8px 20px",
                border: `1.5px solid ${count === n ? "var(--text)" : "var(--border)"}`,
                borderRadius: 8,
                background: count === n ? "var(--surface)" : "var(--bg)",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {n === 1 ? "1 (single)" : `${n} (compare)`}
            </button>
          ))}
        </div>
        {count > 1 && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {count} variants will be generated in parallel — pick the best one.
          </div>
        )}
      </div>

      <button
        disabled={!topic || topicTooLong}
        onClick={() => topic && onNext(topic, hookTone, count)}
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
        Generate content →
      </button>
    </div>
  );
}
