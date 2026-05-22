"use client";
import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/lib/types";

export type CampaignBrief = {
  topic: string;
  occasion: string;
  offer: string;
  ctaUrl: string;
  tone: string;
};

type Mode = "list" | "custom";

const TONES = ["calm, editorial", "warm, personal", "direct, product-first", "urgent, promotional"];

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontSize: 14,
  fontFamily: "inherit", color: "var(--text)",
  padding: "9px 12px", borderRadius: 7,
  border: "1px solid var(--border)", background: "var(--surface)",
};

export default function BriefStep({ onGenerate }: { onGenerate: (brief: CampaignBrief) => void }) {
  const [mode, setMode] = useState<Mode>("list");
  const [customTopic, setCustomTopic] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [search, setSearch] = useState("");

  const [occasion, setOccasion] = useState("");
  const [offer, setOffer] = useState("");
  const [ctaUrl, setCtaUrl] = useState("https://www.lunialife.com/products/lunia-sleep-vitamins");
  const [tone, setTone] = useState(TONES[0]);

  // Subject library — shared with the carousel builder.
  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => { setSubjects(Array.isArray(d) ? d : []); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
  }, []);

  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => !q || s.text.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [subjects, search]);

  const topic = mode === "list" ? (selectedSubject?.text ?? "") : customTopic;
  const canGenerate = topic.trim().length >= 4;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 620 }}>
      <div>
        <label style={labelStyle}>Campaign topic / angle</label>

        {/* Mode toggle — pick from the subject library or write your own */}
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content", marginBottom: 12 }}>
          {(["list", "custom"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 600,
                background: mode === m ? "var(--accent)" : "var(--surface)",
                color: mode === m ? "#fff" : "var(--muted)",
                border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {m === "list" ? "Subject library" : "Custom topic"}
            </button>
          ))}
        </div>

        {mode === "list" ? (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects…"
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
              {loadingSubjects ? "Loading subjects…" : `${filteredSubjects.length} subject${filteredSubjects.length === 1 ? "" : "s"}`}
            </div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", maxHeight: 300, overflowY: "auto" }}>
              {!loadingSubjects && filteredSubjects.length === 0 && (
                <div style={{ padding: "22px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No subjects found. Add some in the Subjects tab, or use a custom topic.
                </div>
              )}
              {filteredSubjects.map((s) => {
                const isSelected = selectedSubject?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSubject(s)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                      background: isSelected ? "var(--accent-dim)" : "var(--bg)",
                      outline: isSelected ? "1.5px solid var(--accent)" : "none", outlineOffset: -1,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 400, color: isSelected ? "var(--accent)" : "var(--text)", lineHeight: 1.4 }}>
                      {s.text}
                    </span>
                    <span style={{ fontSize: 10, color: isSelected ? "var(--accent)" : "var(--subtle)", flexShrink: 0, marginLeft: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {s.category}
                    </span>
                  </div>
                );
              })}
            </div>
            {selectedSubject && (
              <div style={{ marginTop: 8, padding: "9px 12px", background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                ✓ {selectedSubject.text}
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            rows={3}
            placeholder="e.g. Transparent dosing — every milligram printed on the label"
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Occasion (optional)</label>
          <input type="text" value={occasion} onChange={(e) => setOccasion(e.target.value)}
            placeholder="e.g. Memorial Day weekend" style={inputStyle} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>Offer (optional)</label>
          <input type="text" value={offer} onChange={(e) => setOffer(e.target.value)}
            placeholder="e.g. Up to 35% off" style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>CTA link</label>
        <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Tone</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TONES.map((t) => {
            const active = tone === t;
            return (
              <button key={t} onClick={() => setTone(t)} style={{
                padding: "6px 12px", borderRadius: 20,
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--muted)",
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
              }}>{t}</button>
            );
          })}
        </div>
      </div>
      <div>
        <button
          className="btn"
          disabled={!canGenerate}
          onClick={() => onGenerate({ topic, occasion, offer, ctaUrl, tone })}
          style={{ minWidth: 180, opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? "pointer" : "not-allowed" }}
        >
          Generate campaign
        </button>
      </div>
    </div>
  );
}
