"use client";
import { useState, useEffect } from "react";
import { CarouselFormat, CarouselStylePreset, EngagementSubType, HookTone, Subject } from "@/lib/types";

export type CarouselImageStyle = "realistic" | "cartoon" | "anime" | "vector";

const IMAGE_STYLE_OPTIONS: { value: CarouselImageStyle; label: string; description: string }[] = [
  { value: "realistic", label: "Realistic Photo", description: "Editorial photography — Lunia's default cinematic look" },
  { value: "cartoon", label: "Digital Illustration", description: "Bold colorful illustration, expressive and modern" },
  { value: "anime", label: "Anime / Cel-Shaded", description: "Dreamlike anime scenes — great for sleep & night themes" },
  { value: "vector", label: "Vector / Flat", description: "Clean flat graphic for a modern minimal look" },
];

const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Clear, factual, teaches something new" },
  { value: "science-backed", label: "Science-backed", description: "Lead with research findings and data" },
  { value: "myth-bust", label: "Myth-bust", description: "Challenge a common misconception" },
  { value: "clickbait", label: "Bold hook", description: "Provocative, creates urgency" },
  { value: "personal-story", label: "Personal story", description: "Relatable journey with Lunia" },
  // "did-you-know" tone is intentionally hidden — superseded by the did_you_know CarouselFormat.
  { value: "symptom", label: "The Symptom (signs you're missing)", description: "Signs your X is actually Y, not Z — names precise pre-aware symptoms" },
  { value: "paradox", label: "The Paradox (did everything right, still feel wrong)", description: "Why are you X when you Y? — names the contradiction" },
  { value: "tell", label: "The Tell (oddly specific recognition)", description: "If you do this oddly specific thing, here is what it means" },
];

// value → label lookup for rendering hook-tone recommendations.
const TONE_LABEL = Object.fromEntries(
  HOOK_TONE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<HookTone, string>;

type HookRecommendation = { tone: HookTone; reason: string };

const ENGAGEMENT_SUBTYPE_OPTIONS: { value: EngagementSubType; label: string; description: string }[] = [
  { value: "reveal", label: "Reveal", description: "Unveil items one by one — builds anticipation" },
  { value: "diagnostic", label: "Diagnostic", description: "Symptom/habit check — reader self-identifies" },
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
  "Longevity & Sleep Research",
  "Did You Know",
  "Latest Research",
  "Sleep Researchers",
];

type Props = {
  onNext: (topic: string, hookTone: HookTone, subjectId?: string, concise?: boolean, imageStyle?: CarouselImageStyle, format?: CarouselFormat, engagementSubType?: EngagementSubType, stylePreset?: CarouselStylePreset, includeSeoFooter?: boolean) => void;
};

type Mode = "list" | "custom";

/** Demo topics for one-click testing — exercise a range of visual metaphors so
 *  it's a fair stress-test of the editorial preset (portrait, still life,
 *  bedroom scene, etc.) without picking from the real subject library. */
const SAMPLE_SUBJECTS = [
  "Skin repairs at night — the overnight repair window",
  "Magnesium glycinate beats melatonin for real sleep",
  "Why core body temperature drops at night and triggers sleep",
  "Cortisol's morning peak and how to align your day with it",
  "REM sleep and memory consolidation — the science",
  "L-Theanine: take 200mg 40 minutes before bed",
  "Why blood sugar spikes at night ruin deep sleep",
  "Apigenin: the chamomile compound that quiets the brain",
];

export default function TopicStep({ onNext }: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [custom, setCustom] = useState("");
  const [carouselFormat, setCarouselFormat] = useState<CarouselFormat>("standard");
  const [engagementSubType, setEngagementSubType] = useState<EngagementSubType>("reveal");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [concise, setConcise] = useState(false);
  // Default ON — every Lunia post should carry the brand SEO footer so AI
  // crawlers / answer engines build the brand entity graph from social.
  const [includeSeoFooter, setIncludeSeoFooter] = useState(true);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>("realistic");
  const [stylePreset, setStylePreset] = useState<CarouselStylePreset>("default");

  // "Suggest topics" — history-aware ideas that avoid the last 7 saved carousels.
  const [suggestions, setSuggestions] = useState<{ title: string; description: string; pillar: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/carousel-v2/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setSuggestError(data?.error || "Failed to suggest topics. Try again.");
        setSuggestions([]);
      } else if (Array.isArray(data)) {
        setSuggestions(data);
      } else {
        setSuggestError("Unexpected response. Try again.");
      }
    } catch {
      setSuggestError("Network error. Try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // "Recommend hook" — Claude ranks the best hook tones for the chosen topic.
  // Auto-runs (debounced) whenever the topic changes in the standard format.
  const [hookRec, setHookRec] = useState<HookRecommendation[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => { setSubjects(Array.isArray(d) ? d : []); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
  }, []);

  const topic = mode === "list"
    ? (selectedSubject?.text ?? "")
    : custom.trim();

  const topicTooLong = topic.length > 500;

  // Hook tone only exists for the standard format — only recommend there.
  const recCategory = mode === "list" ? selectedSubject?.category : undefined;
  useEffect(() => {
    if (carouselFormat !== "standard" || !topic || topic.length > 500) {
      setHookRec([]);
      setRecError(null);
      setLoadingRec(false);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoadingRec(true);
      setRecError(null);
      try {
        const res = await fetch("/api/carousel-v2/recommend-hook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, category: recCategory }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || data?.error) {
          setRecError(data?.error || "Couldn't recommend a hook. Try again.");
          setHookRec([]);
        } else if (Array.isArray(data)) {
          setHookRec(data as HookRecommendation[]);
        } else {
          setRecError("Unexpected response. Try again.");
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // stale request, ignore
        setRecError("Network error. Try again.");
      } finally {
        setLoadingRec(false);
      }
    }, 600);
    return () => { clearTimeout(t); controller.abort(); };
  }, [topic, carouselFormat, recCategory]);

  // In the carousel builder, only show unused subjects — used ones are hidden to avoid repetition.
  // The full list (including used) is visible in the Subjects tab.
  const filteredSubjects = subjects.filter((s) => {
    if (s.usedAt) return false; // hide used subjects in the builder
    const matchCat = category === "All" || s.category === category;
    const matchSearch = s.text.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const unusedCount = subjects.filter((s) => !s.usedAt).length;
  const usedCount = subjects.filter((s) => s.usedAt).length;

  function handleNext() {
    if (!topic || topicTooLong) return;
    const subjectId = mode === "list" ? selectedSubject?.id : undefined;
    const effectiveTone =
      carouselFormat === "engagement" ? ("science-backed" as HookTone)
      : carouselFormat === "did_you_know" ? ("educational" as HookTone)
      : hookTone;
    const effectiveConcise =
      carouselFormat === "engagement" ? true
      : carouselFormat === "did_you_know" ? true
      : concise;
    onNext(topic, effectiveTone, subjectId, effectiveConcise, imageStyle, carouselFormat, carouselFormat === "engagement" ? engagementSubType : undefined, stylePreset, includeSeoFooter);
  }

  // Cherry-pick #5: inline add-custom-topic from list mode
  const [adding, setAdding] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newCategory, setNewCategory] = useState("Did You Know");
  const [addError, setAddError] = useState<string | null>(null);
  async function submitNewTopic() {
    const text = newTopic.trim();
    if (text.length < 4 || text.length > 200) {
      setAddError("Topic must be 4-200 characters");
      return;
    }
    setAddError(null);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: newCategory }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAddError(j.error || "Failed to add topic");
        return;
      }
      const created = await res.json();
      setSubjects((prev) => [created, ...prev]);
      setSelectedSubject(created);
      setNewTopic("");
      setAdding(false);
    } catch {
      setAddError("Network error");
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Choose a topic</h2>
      <p style={{ color: "var(--muted)", marginBottom: 24, fontSize: 14 }}>Pick from your subject library or enter a custom topic.</p>

      {/* Mode toggle + quick-test sample-subject button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 0, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
          {(["list", "custom"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                background: mode === m ? "var(--accent)" : "var(--surface)",
                color: mode === m ? "#fff" : "var(--muted)",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {m === "list" ? "Subject library" : "Custom topic"}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const pick = SAMPLE_SUBJECTS[Math.floor(Math.random() * SAMPLE_SUBJECTS.length)];
            setMode("custom");
            setCustom(pick);
            setSelectedSubject(null);
          }}
          title="Fill a sample topic so you can simulate a post without picking a real subject"
          style={{
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            background: "transparent",
            border: "1px dashed var(--border-strong)",
            borderRadius: 7,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          🎲 Try sample subject
        </button>
        <button
          onClick={fetchSuggestions}
          disabled={loadingSuggestions}
          title="Suggest fresh topics that don't repeat your last 7 carousels"
          style={{
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--accent)",
            background: "var(--accent-dim)",
            border: "1px solid var(--accent-mid)",
            borderRadius: 7,
            cursor: loadingSuggestions ? "wait" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          {loadingSuggestions ? "Thinking…" : "✨ Suggest topics"}
        </button>
      </div>

      {/* Suggestions panel — history-aware ideas based on the last 7 saved carousels */}
      {(suggestions.length > 0 || suggestError) && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--accent-mid)", borderRadius: 10, background: "var(--accent-dim)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestions.length ? 12 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Suggested for you · avoids your recent topics
            </div>
            <button
              onClick={() => { setSuggestions([]); setSuggestError(null); }}
              style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              × Dismiss
            </button>
          </div>
          {suggestError && <div style={{ fontSize: 13, color: "var(--error)" }}>{suggestError}</div>}
          <div style={{ display: "grid", gap: 8 }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setMode("custom"); setCustom(s.title); setSelectedSubject(null); setSuggestions([]); }}
                style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--bg)",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{s.title}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{s.pillar}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{s.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {loadingSubjects ? "Loading..." : `${filteredSubjects.length} of ${unusedCount} unused subjects${usedCount > 0 ? ` · ${usedCount} used (hidden)` : ""}`}
            </div>
            <button
              onClick={() => { setAdding((a) => !a); setAddError(null); }}
              style={{
                fontSize: 12, fontWeight: 600, color: "var(--accent)",
                background: "transparent", border: "none", cursor: "pointer", padding: 0,
                fontFamily: "inherit",
              }}
            >
              {adding ? "× Cancel" : "+ Add custom topic"}
            </button>
          </div>

          {adding && (
            <div style={{ marginBottom: 12, padding: 12, border: "1.5px dashed var(--border)", borderRadius: 8, background: "var(--bg)" }}>
              <input
                type="text"
                value={newTopic}
                maxLength={200}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="New topic text..."
                style={{
                  width: "100%", padding: "8px 12px", fontSize: 13,
                  border: "1.5px solid var(--border)", borderRadius: 6,
                  fontFamily: "inherit", background: "var(--bg)", color: "var(--text)",
                  outline: "none", boxSizing: "border-box", marginBottom: 8,
                }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    flex: 1, padding: "8px 10px", fontSize: 12,
                    border: "1.5px solid var(--border)", borderRadius: 6,
                    background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", cursor: "pointer",
                  }}
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  onClick={submitNewTopic}
                  style={{
                    padding: "8px 16px", fontSize: 12, fontWeight: 700,
                    background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Add
                </button>
              </div>
              {addError && <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 6 }}>{addError}</div>}
            </div>
          )}

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
                      ? "rgba(34,197,94,0.12)"
                      : used
                      ? "rgba(34,197,94,0.06)"
                      : "var(--bg)",
                    transition: "background 0.1s",
                    outline: isSelected ? "1.5px solid #15803d" : "none",
                    outlineOffset: -1,
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : used ? 600 : 400,
                    color: isSelected ? "#15803d" : used ? "#15803d" : "var(--text)",
                    lineHeight: 1.4,
                  }}>
                    {s.text}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ fontSize: 10, color: isSelected ? "#15803d" : "var(--subtle)" }}>{s.category}</span>
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
            <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, fontSize: 13, fontWeight: 600, color: "#15803d" }}>
              ✓ {selectedSubject.text}
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

      {/* Carousel format toggle */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Format</label>
        <div style={{ display: "flex", gap: 0, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
          {([
            { val: "standard" as CarouselFormat, label: "Standard", desc: "Educational carousel" },
            { val: "engagement" as CarouselFormat, label: "Engagement", desc: "Drive comments" },
            { val: "did_you_know" as CarouselFormat, label: "Did You Know", desc: "2-slide frozen template" },
          ]).map((opt) => (
            <button
              key={opt.val}
              onClick={() => setCarouselFormat(opt.val)}
              style={{
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                background: carouselFormat === opt.val ? "var(--text)" : "var(--bg)",
                color: carouselFormat === opt.val ? "var(--bg)" : "var(--muted)",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {carouselFormat === "engagement" && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Engagement carousels end with a comment CTA — readers comment a keyword to get a guide.
          </p>
        )}
        {carouselFormat === "did_you_know" && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Did You Know is a frozen 2-slide template. No graphics, no AI imagery, just typography. Generates 3 fact variants per topic.
          </p>
        )}
      </div>

      {/* Engagement sub-type (only for engagement format) */}
      {carouselFormat === "engagement" && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Engagement type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {ENGAGEMENT_SUBTYPE_OPTIONS.map((opt) => {
              const sel = engagementSubType === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setEngagementSubType(opt.value)}
                  style={{
                    flex: 1,
                    border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                    transition: "all 0.12s",
                    boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: sel ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: sel ? "var(--accent)" : "var(--muted)", lineHeight: 1.4, opacity: sel ? 0.8 : 1 }}>{opt.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hook tone (only for standard format) */}
      {carouselFormat === "standard" && (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Hook tone</label>

        {/* Recommendation banner — auto-runs on topic select. Opt-in: clicking
            a tone applies it; the current selection is never changed for you. */}
        {(loadingRec || recError || hookRec.length > 0) && (
          <div style={{ marginBottom: 12, padding: "12px 14px", border: "1px solid var(--accent-mid)", borderRadius: 10, background: "var(--accent-dim)" }}>
            {loadingRec && hookRec.length === 0 && !recError && (
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Finding the best hook for this topic…</div>
            )}
            {recError && <div style={{ fontSize: 13, color: "var(--error)" }}>{recError}</div>}
            {hookRec.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Recommended hook · for this topic{loadingRec ? " · refreshing…" : ""}
                </div>
                <button
                  onClick={() => setHookTone(hookRec[0].tone)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 12px", borderRadius: 8, marginBottom: hookRec.length > 1 ? 8 : 0,
                    border: `1.5px solid ${hookTone === hookRec[0].tone ? "var(--accent)" : "var(--border)"}`,
                    background: "var(--bg)", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{TONE_LABEL[hookRec[0].tone] ?? hookRec[0].tone}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em", border: "1px solid var(--accent-mid)", borderRadius: 4, padding: "1px 5px" }}>Top pick</span>
                  </div>
                  {hookRec[0].reason && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{hookRec[0].reason}</div>}
                </button>
                {hookRec.length > 1 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", alignSelf: "center" }}>Also strong:</span>
                    {hookRec.slice(1).map((r) => (
                      <button
                        key={r.tone}
                        onClick={() => setHookTone(r.tone)}
                        title={r.reason}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 9999,
                          border: `1px solid ${hookTone === r.tone ? "var(--accent)" : "var(--border)"}`,
                          background: "var(--bg)", color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {TONE_LABEL[r.tone] ?? r.tone}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {HOOK_TONE_OPTIONS.map((opt) => {
            const sel = hookTone === opt.value;
            const recIdx = hookRec.findIndex((r) => r.tone === opt.value);
            const isRec = recIdx !== -1;
            return (
              <div
                key={opt.value}
                onClick={() => setHookTone(opt.value)}
                style={{
                  position: "relative",
                  border: `1.5px solid ${sel ? "var(--accent)" : isRec ? "var(--accent-mid)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  transition: "all 0.12s",
                  boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
                }}
              >
                {isRec && (
                  <span style={{
                    position: "absolute", top: 6, right: 6,
                    fontSize: 8, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em",
                    border: "1px solid var(--accent-mid)", borderRadius: 4, padding: "1px 4px",
                    background: "var(--accent-dim)",
                    opacity: recIdx === 0 ? 1 : 0.7,
                  }}>
                    {recIdx === 0 ? "Top pick" : "Suggested"}
                  </span>
                )}
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, paddingRight: isRec ? 56 : 0, color: sel ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: sel ? "var(--accent)" : "var(--muted)", lineHeight: 1.4, opacity: sel ? 0.8 : 1 }}>{opt.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      )}

      {/* Carousel style preset — re-skins the whole carousel (colors, fonts,
          image engine). "Editorial Scientific" applies the Lunia brand book. */}
      {carouselFormat !== "did_you_know" && (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Style</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {([
            { val: "default" as CarouselStylePreset, label: "Default", desc: "Current v2 styling" },
            { val: "editorial-scientific" as CarouselStylePreset, label: "Editorial Scientific", desc: "Lunia palette, Inter, gpt-image-2" },
          ]).map((opt) => {
            const sel = stylePreset === opt.val;
            return (
              <div
                key={opt.val}
                onClick={() => setStylePreset(opt.val)}
                style={{
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  transition: "all 0.12s",
                  boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: sel ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: sel ? "var(--accent)" : "var(--muted)", lineHeight: 1.4, opacity: sel ? 0.8 : 1 }}>{opt.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Hook image style — hidden for did_you_know (no AI imagery) */}
      {carouselFormat !== "did_you_know" && (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Hook image style</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {IMAGE_STYLE_OPTIONS.map((opt) => {
            const sel = imageStyle === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => setImageStyle(opt.value)}
                style={{
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  transition: "all 0.12s",
                  boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: sel ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: sel ? "var(--accent)" : "var(--muted)", lineHeight: 1.4, opacity: sel ? 0.8 : 1 }}>{opt.description}</div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Content length toggle (standard only — engagement is always concise) */}
      {carouselFormat === "standard" && (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Content length</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { val: false, label: "Standard", desc: "3-5 sentences per slide" },
            { val: true,  label: "Concise",  desc: "1-2 sentences, punchy" },
          ].map(opt => (
            <div
              key={String(opt.val)}
              onClick={() => setConcise(opt.val)}
              style={{
                flex: 1,
                border: `1.5px solid ${concise === opt.val ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                background: concise === opt.val ? "var(--accent-dim)" : "var(--bg)",
                transition: "all 0.12s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: concise === opt.val ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
              <div style={{ fontSize: 11, color: concise === opt.val ? "var(--accent)" : "var(--muted)" }}>{opt.desc}</div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Brand SEO footer toggle — appends a brand-bridge sentence + a static
          entity line to every caption so AI crawlers / answer engines build
          a strong association between Lunia Life, the product (Lunia Restore),
          the ingredients, and the brand category. Default ON. */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Caption
        </label>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIncludeSeoFooter((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setIncludeSeoFooter((v) => !v);
            }
          }}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            padding: "12px 14px",
            border: `1.5px solid ${includeSeoFooter ? "var(--accent)" : "var(--border)"}`,
            background: includeSeoFooter ? "var(--accent-dim)" : "var(--bg)",
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.12s",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <input
            type="checkbox"
            checked={includeSeoFooter}
            readOnly
            tabIndex={-1}
            style={{
              width: 16,
              height: 16,
              marginTop: 2,
              flex: "0 0 16px",
              flexShrink: 0,
              cursor: "pointer",
              accentColor: "var(--accent)",
            }}
          />
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: includeSeoFooter ? "var(--accent)" : "var(--text)", marginBottom: 2 }}>
              Brand SEO line in caption
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
              Append a brand-bridge sentence plus a Lunia Life · Lunia Restore · ingredients · domain line. Helps AI crawlers and answer engines surface Lunia when users ask related questions.
            </div>
          </div>
        </div>
      </div>

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
