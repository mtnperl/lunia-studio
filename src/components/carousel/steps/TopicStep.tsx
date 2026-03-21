"use client";
import { useState, useEffect } from "react";
import { Topic } from "@/lib/types";

const PILLARS_COLORS: Record<string, string> = {
  "Sleep Science": "#1e7a8a",
  "Ingredient Education": "#2d8a6a",
  "Cortisol & Stress": "#8a4a1e",
  "Longevity": "#4a1e8a",
  "Wind-Down Routines": "#1e4a8a",
};

type Props = { onNext: (topic: string) => void };

export default function TopicStep({ onNext }: Props) {
  const [suggestions, setSuggestions] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    fetch("/api/carousel/suggestions", { method: "POST" })
      .then((r) => r.json())
      .then((d) => { setSuggestions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const topic = selected || custom.trim();

  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#1e7a8a", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Choose a topic</h2>
      <p style={{ color: "#4a5568", marginBottom: 32, fontSize: 16 }}>Pick from AI suggestions or type your own.</p>

      {loading ? (
        <div style={{ color: "#4a5568", fontSize: 16 }}>Generating suggestions...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => { setSelected(s.title); setCustom(""); }}
              style={{
                border: `2px solid ${selected === s.title ? "#1e7a8a" : "#e2e8f0"}`,
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                background: selected === s.title ? "#f0f9fa" : "#ffffff",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "inline-block", background: PILLARS_COLORS[s.pillar] || "#1e7a8a", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 4, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.pillar}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2535", marginBottom: 6, lineHeight: 1.3 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: "#4a5568", lineHeight: 1.5 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#4a5568", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Or type your own topic</label>
        <input
          type="text"
          value={custom}
          onChange={(e) => { setCustom(e.target.value); setSelected(null); }}
          placeholder="e.g. Why magnesium beats melatonin for deep sleep"
          style={{ width: "100%", padding: "14px 16px", fontSize: 16, border: "2px solid #e2e8f0", borderRadius: 10, fontFamily: "Outfit, sans-serif", outline: "none" }}
        />
      </div>

      <button
        disabled={!topic}
        onClick={() => onNext(topic)}
        style={{
          background: topic ? "#1e7a8a" : "#e2e8f0",
          color: topic ? "#ffffff" : "#9ca3af",
          border: "none",
          borderRadius: 10,
          padding: "16px 40px",
          fontSize: 16,
          fontWeight: 600,
          fontFamily: "Outfit, sans-serif",
          cursor: topic ? "pointer" : "not-allowed",
          letterSpacing: "0.05em",
        }}
      >
        Generate content →
      </button>
    </div>
  );
}
