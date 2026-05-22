"use client";
import { useState } from "react";

export type CampaignBrief = {
  topic: string;
  occasion: string;
  offer: string;
  ctaUrl: string;
  tone: string;
};

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
  const [topic, setTopic] = useState("");
  const [occasion, setOccasion] = useState("");
  const [offer, setOffer] = useState("");
  const [ctaUrl, setCtaUrl] = useState("https://www.lunialife.com/products/lunia-sleep-vitamins");
  const [tone, setTone] = useState(TONES[0]);

  const canGenerate = topic.trim().length >= 4;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 560 }}>
      <div>
        <label style={labelStyle}>Campaign topic / angle</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="e.g. Transparent dosing — every milligram printed on the label"
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
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
