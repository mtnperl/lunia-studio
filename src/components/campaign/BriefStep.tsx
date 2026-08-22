"use client";
import { useEffect, useMemo, useState } from "react";
import type { Subject } from "@/lib/types";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import ShapeGallery from "./ShapeGallery";
import {
  CAMPAIGN_SHAPES,
  savedShapeToCampaignShape,
  type CampaignShape,
  type SavedShape,
} from "@/lib/campaign-shapes";

export type CampaignBrief = {
  topic: string;
  occasion: string;
  offer: string;
  ctaUrl: string;
  tone: string;
  /** When true, the API short-circuits the LLM + image generation and
   *  returns canned text wired to existing asset-library images. Lets
   *  you dogfood layout changes without burning tokens. */
  test?: boolean;
  /** Lay the generated copy out in this shape before it reaches the editor.
   *  "auto" (the default) skips that second pass and lands plain text blocks,
   *  which is what every campaign did before shapes existed. */
  shapeId?: string;
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
  // Generation writes plain text blocks, so without this a new campaign always
  // landed as a wall of text you then had to lay out. Picking a shape here
  // makes "generate" and "lay it out" one action.
  const [shape, setShape] = useState<CampaignShape>(CAMPAIGN_SHAPES[0]!);
  const [shapePickerOpen, setShapePickerOpen] = useState(false);
  const [savedShapes, setSavedShapes] = useState<SavedShape[]>([]);
  useEffect(() => {
    if (!shapePickerOpen) return;
    let alive = true;
    fetch("/api/campaign/shapes")
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d)) setSavedShapes(d as SavedShape[]); })
      .catch(() => { /* built-ins are enough */ });
    return () => { alive = false; };
  }, [shapePickerOpen]);
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
          <AutoTextarea
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            minHeight={84}
            placeholder="e.g. Transparent dosing — every milligram printed on the label"
            style={{ ...inputStyle, lineHeight: 1.5 }}
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
      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Layout</label>
        <button
          type="button"
          onClick={() => setShapePickerOpen((v) => !v)}
          title="Lay the generated copy out in a shape before it reaches the editor. Leave it on the default to land plain text blocks and choose later."
          style={{
            ...inputStyle, textAlign: "left", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderColor: shapePickerOpen ? "var(--accent)" : "var(--border)",
          }}
        >
          <span>{shape.name}</span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{shapePickerOpen ? "Close" : "Change"}</span>
        </button>
        <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
          {shape.guidance
            ? `Adds one more pass after writing, so the campaign arrives already laid out as ${shape.name}.`
            : "The campaign arrives as plain text blocks. You can pick a shape any time from the editor."}
        </div>
        {shapePickerOpen && (
          <ShapeGallery
            shapes={[...CAMPAIGN_SHAPES, ...savedShapes.map(savedShapeToCampaignShape)]}
            busyShapeId={null}
            onPick={(s) => { setShape(s); setShapePickerOpen(false); }}
            onClose={() => setShapePickerOpen(false)}
          />
        )}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          className="btn"
          disabled={!canGenerate}
          onClick={() => onGenerate({ topic, occasion, offer, ctaUrl, tone, shapeId: shape.id })}
          style={{ minWidth: 180, opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? "pointer" : "not-allowed" }}
        >
          Generate campaign
        </button>
        <button
          className="btn-ghost"
          disabled={!canGenerate}
          onClick={() => onGenerate({ topic, occasion, offer, ctaUrl, tone, test: true })}
          title="Skip the LLM and image generation — return canned text wired to existing assets. For layout testing only."
          style={{ opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? "pointer" : "not-allowed" }}
        >
          🧪 Test (no AI)
        </button>
      </div>
    </div>
  );
}
