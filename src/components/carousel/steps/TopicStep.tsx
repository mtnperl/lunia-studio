"use client";
import { useState, useEffect, useMemo, type CSSProperties } from "react";
import { CarouselContrastMode, CarouselFormat, CarouselStylePreset, EngagementSubType, HookTone, type CarouselLook, type CarouselLookSettings } from "@/lib/types";
import { isBuildable, type CarouselRow } from "@/lib/carousel-rows";
import { Badge, CardButton, IcCheck, Input, Label, Select as UiSelect, Tabs } from "@/components/ui";
import { STRUCTURES, STRUCTURE_IDS, structureFromLegacy, type CarouselStructure } from "@/lib/carousel-structures";
import { Button } from "@/components/ui/Button";

export type CarouselImageStyle = "realistic" | "cartoon" | "anime" | "vector";

export const IMAGE_STYLE_OPTIONS: { value: CarouselImageStyle; label: string; description: string }[] = [
  { value: "realistic", label: "Realistic Photo", description: "Editorial photography — Lunia's default cinematic look" },
  { value: "cartoon", label: "Digital Illustration", description: "Bold colorful illustration, expressive and modern" },
  { value: "anime", label: "Anime / Cel-Shaded", description: "Dreamlike anime scenes — great for sleep & night themes" },
  { value: "vector", label: "Vector / Flat", description: "Clean flat graphic for a modern minimal look" },
];

export const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
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
export const TONE_LABEL = Object.fromEntries(
  HOOK_TONE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<HookTone, string>;

export type HookRecommendation = { tone: HookTone; reason: string };

export const ENGAGEMENT_SUBTYPE_OPTIONS: { value: EngagementSubType; label: string; description: string }[] = [
  { value: "reveal", label: "Reveal", description: "Unveil items one by one — builds anticipation" },
  { value: "diagnostic", label: "Diagnostic", description: "Symptom/habit check — reader self-identifies" },
];

import { isTwoSlideFormat } from "@/lib/types";

export const CATEGORIES = [
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

type Props = {
  /** Duplicate and vary: the look of the source carousel, applied to this brief. */
  initialLook?: CarouselLookSettings;
  initialFormat?: CarouselFormat;
  /** Duplicate and vary: the source carousel's structure. */
  initialStructure?: CarouselStructure;
  /** The source carousel's topic, shown in a banner while varying. */
  varyFrom?: string;
  onClearVary?: () => void;
  onNext: (topic: string, hookTone: HookTone, rowId?: string, concise?: boolean, imageStyle?: CarouselImageStyle, format?: CarouselFormat, engagementSubType?: EngagementSubType, stylePreset?: CarouselStylePreset, includeSeoFooter?: boolean, contrastMode?: CarouselContrastMode, look?: CarouselLookSettings, slideCount?: number, structure?: CarouselStructure) => void;
};

type Mode = "list" | "custom";

/** Demo topics for one-click testing — exercise a range of visual metaphors so
 *  it's a fair stress-test of the editorial preset (portrait, still life,
 *  bedroom scene, etc.) without picking from the real subject library. */
export const SAMPLE_SUBJECTS = [
  "Skin repairs at night — the overnight repair window",
  "Magnesium glycinate beats melatonin for real sleep",
  "Why core body temperature drops at night and triggers sleep",
  "Cortisol's morning peak and how to align your day with it",
  "REM sleep and memory consolidation — the science",
  "L-Theanine: take 200mg 40 minutes before bed",
  "Why blood sugar spikes at night ruin deep sleep",
  "Apigenin: the chamomile compound that quiets the brain",
];

export default function TopicStep({ onNext, initialLook, initialFormat, initialStructure, varyFrom, onClearVary }: Props) {
  const [mode, setMode] = useState<Mode>("list");
  const [subjects, setSubjects] = useState<CarouselRow[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState<CarouselRow | null>(null);
  const [custom, setCustom] = useState("");
  const [carouselFormat, setCarouselFormat] = useState<CarouselFormat>(initialFormat ?? "standard");
  const [engagementSubType, setEngagementSubType] = useState<EngagementSubType>("reveal");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  // How the deck argues. One picker replaced hook tone and the Standard format.
  const [structure, setStructure] = useState<CarouselStructure>(initialStructure ?? "story");
  const [infoFor, setInfoFor] = useState<CarouselStructure | null>(null);
  const [concise, setConcise] = useState(true);
  // Default ON — every Lunia post should carry the brand SEO footer so AI
  // crawlers / answer engines build the brand entity graph from social.
  const [includeSeoFooter, setIncludeSeoFooter] = useState(true);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>((initialLook?.imageStyle as CarouselImageStyle | undefined) ?? "realistic");
  const [stylePreset, setStylePreset] = useState<CarouselStylePreset>(initialLook?.stylePreset ?? "editorial-scientific");
  // Applies to the hook image from the very first generation, so a new deck can
  // be high-contrast without a regenerate.
  const [contrastMode, setContrastMode] = useState<CarouselContrastMode>("standard");
  // Saved looks: picking one sets the preset and image engine here and hands
  // the rest of its settings to the studio once the carousel exists.
  const [looks, setLooks] = useState<CarouselLook[]>([]);
  const [lookId, setLookId] = useState("");
  const [viralSlides, setViralSlides] = useState<5 | 10>(5);
  useEffect(() => {
    let alive = true;
    fetch("/api/carousel-v2/looks").then((r) => r.json()).then((d) => { if (alive && Array.isArray(d)) setLooks(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  function chooseLook(id: string) {
    setLookId(id);
    const l = looks.find((x) => x.id === id);
    if (!l) return;
    if (l.settings.stylePreset) setStylePreset(l.settings.stylePreset);
    if (l.settings.imageStyle) setImageStyle(l.settings.imageStyle as CarouselImageStyle);
  }

  // "Suggest topics" — diverse, unused picks pulled straight from the subject library.
  const [suggestions, setSuggestions] = useState<{ id: string; title: string; category: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    setSuggestError(null);
    try {
      const res = await fetch("/api/carousel-v2/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: carouselFormat }),
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
    fetch("/api/carousel-rows")
      .then((r) => r.json())
      .then((d) => { setSubjects(Array.isArray(d) ? (d as CarouselRow[]).filter(isBuildable) : []); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
  }, []);

  // A row IS the deck, so there is no rewriting a line to fit a format and no
  // "does this subject suit a Chartbook" question left to answer. The reframe
  // pass and the fit filter went with the subject library on 2026-09-22.
  const topic = mode === "list" ? (selectedSubject?.subject ?? "") : custom.trim();
  // The row being built, when one was picked. Its six reviewed slides are
  // copied onto the deck; a typed topic is written from scratch as before.
  const selectedRow = mode === "list" ? selectedSubject : null;

  const topicTooLong = topic.length > 500;

  // Hook tone only exists for the standard format — only recommend there.
  const recCategory = mode === "list" ? selectedSubject?.carouselType : undefined;
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

  // Interleave rows round-robin across types so browsing "All" surfaces
  // variety immediately instead of running through one type at a time.
  // Memoized on `subjects` so it doesn't reshuffle order while the user types.
  const interleavedSubjects = useMemo(() => {
    const byCategory = new Map<string, CarouselRow[]>();
    for (const s of subjects) {
      const list = byCategory.get(s.carouselType) ?? [];
      list.push(s);
      byCategory.set(s.carouselType, list);
    }
    const cats = [...byCategory.keys()];
    const result: CarouselRow[] = [];
    let round = 0;
    while (result.length < subjects.length) {
      let added = false;
      for (const cat of cats) {
        const list = byCategory.get(cat)!;
        if (list[round]) {
          result.push(list[round]);
          added = true;
        }
      }
      if (!added) break;
      round++;
    }
    return result;
  }, [subjects]);

  // Built rows stay in the list. Hiding them meant a subject you had just
  // shot vanished with no trace, and there was no way to find it again from
  // the builder or to deliberately shoot it a second time. It carries a Used
  // pill instead, and the row itself stays quiet: no tint, no bold, so a
  // half-used library still reads as a list rather than a highlight reel.
  const pool = interleavedSubjects;
  const filteredSubjects = pool.filter((s) => {
    const matchCat = category === "All" || s.carouselType === category;
    const matchSearch = s.subject.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const usedCount = subjects.filter((s) => s.usedAt).length;
  // Types with something to show, so the dropdown never names an empty one.
  const categoryOptions = CATEGORIES.filter((c) => c === "All" || pool.some((s) => s.carouselType === c));

  function handleNext() {
    if (!topic || topicTooLong) return;
    const rowId = selectedRow?.id;
    const effectiveTone =
      carouselFormat === "engagement" ? ("science-backed" as HookTone)
      : isTwoSlideFormat(carouselFormat) ? ("educational" as HookTone)
      : STRUCTURES[structure].legacyTone;
    const effectiveConcise =
      carouselFormat === "engagement" ? true
      : isTwoSlideFormat(carouselFormat) ? true
      : concise;
    onNext(topic, effectiveTone, rowId, effectiveConcise, imageStyle, carouselFormat, carouselFormat === "engagement" ? engagementSubType : undefined, stylePreset, includeSeoFooter, stylePreset === "editorial-scientific" ? contrastMode : "standard", looks.find((x) => x.id === lookId)?.settings, carouselFormat === "standard" ? viralSlides : undefined, carouselFormat === "standard" ? structure : undefined);
  }



  const hint: CSSProperties = { fontSize: "var(--ui-text-12)", color: "var(--ui-text-2)", lineHeight: "var(--ui-lh-12)", margin: "var(--ui-space-4) 0 0" };
  const group: CSSProperties = { marginBottom: "var(--ui-space-8)" };

  return (
    <div>
      {varyFrom && (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 20, border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-2)", background: "var(--ui-surface-2)", fontSize: 13 }}>
          <span style={{ flex: 1 }}>Varying <strong style={{ fontWeight: 600 }}>{varyFrom}</strong>. The new carousel keeps its slide structure and look. Pick the new subject below</span>
          {onClearVary && <button type="button" className="ui-btn ui-btn--sm ui-btn--ghost" onClick={onClearVary}>Start plain instead</button>}
        </div>
      )}
      <h2 style={{ fontSize: "var(--ui-text-24)", lineHeight: "var(--ui-lh-24)", fontWeight: 600, margin: "0 0 var(--ui-space-3)", letterSpacing: "var(--ui-tracking-tight)" }}>{varyFrom ? "Choose the new subject" : "Choose a topic"}</h2>
      <p style={{ color: "var(--ui-text-2)", margin: "0 0 var(--ui-space-8)", fontSize: 14 }}>Pick the format first: the library only offers subjects written for it</p>

      <div style={group}>
        <Label kind="section">Format</Label>
        <Tabs<CarouselFormat>
          ariaLabel="Format"
          value={carouselFormat}
          onChange={setCarouselFormat}
          items={[
            { value: "standard", label: "Structured" },
            { value: "engagement", label: "Engagement" },
            { value: "did_you_know", label: "Did You Know" },
            { value: "chartbook", label: "Chartbook" },
            { value: "primer", label: "Primer" },
          ]}
        />
        {carouselFormat === "engagement" && (
          <p style={hint}>Engagement carousels end with a comment CTA. Readers comment a keyword to get a guide.</p>
        )}
        {carouselFormat === "did_you_know" && (
          <p style={hint}>Did You Know is a frozen 2-slide template. No graphics, no AI imagery, just typography. Generates 3 fact variants per topic.</p>
        )}
        {carouselFormat === "chartbook" && (
          <p style={hint}>Chartbook is a frozen 2-slide format: a serif question, then one figure from five layouts (pill bars, versus bars, ranked, object pair, claim check). Every number must be one a published source reported. Generates 3 variants per topic; the Chartbook subjects are seeded for it.</p>
        )}
        {carouselFormat === "primer" && (
          <p style={hint}>Primer is a frozen 2-slide format: a cover, then one reference slide from four layouts (numbered rows, a definition with its formula, versus columns, a creed). Generates 3 variants per topic; the Primer subjects are seeded for it.</p>
        )}
      </div>

      {/* Mode toggle + quick-test sample-subject button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <Tabs<Mode>
          ariaLabel="Topic source"
          value={mode}
          onChange={setMode}
          items={[{ value: "list", label: "Row library" }, { value: "custom", label: "Custom topic" }]}
        />
        <Button
          size="sm"
          variant="ghost"
          title="Fill a sample topic so you can simulate a post without picking a real subject"
          onClick={() => {
            const pick = SAMPLE_SUBJECTS[Math.floor(Math.random() * SAMPLE_SUBJECTS.length)];
            setMode("custom");
            setCustom(pick);
            setSelectedSubject(null);
          }}
        >
          Try sample subject
        </Button>
        <Button
          size="sm"
          variant="secondary"
          busy={loadingSuggestions}
          disabled={loadingSuggestions}
          title="Surface diverse, unused topics pulled from your subject library"
          onClick={fetchSuggestions}
        >
          ✨ Suggest topics
        </Button>
      </div>

      {/* Suggestions panel — diverse, unused picks from the real subject library */}
      {(suggestions.length > 0 || suggestError) && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", background: "var(--ui-surface)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestions.length ? 12 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ui-text-2)" }}>
              Suggested from your library, unused only
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setSuggestions([]); setSuggestError(null); }}>Dismiss</Button>
          </div>
          {suggestError && <div style={{ fontSize: 13, color: "var(--ui-danger)" }}>{suggestError}</div>}
          <div style={{ display: "grid", gap: 8 }}>
            {suggestions.map((s) => (
              <CardButton
                key={s.id}
                role="toggle"
                title={s.title}
                description={s.category}
                onClick={() => {
                  const match = subjects.find((su) => su.id === s.id);
                  if (!match) return;
                  setMode("list");
                  setSelectedSubject(match);
                  setSuggestions([]);
                  // The row is stamped as used by the generate route, once a
                  // deck exists. Stamping here burned rows that were picked
                  // and then abandoned.
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* List mode */}
      {mode === "list" && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <Input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subjects" aria-label="Search subjects" />
            </div>
            <div style={{ flex: "0 0 220px" }}>
              <UiSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Type">
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </UiSelect>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "var(--ui-text-3)", marginBottom: 8, fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums" }}>
            {loadingSubjects
              ? "Loading…"
              : `${filteredSubjects.length} of ${pool.length} rows${usedCount > 0 ? ` · ${usedCount} already built` : ""}`}
          </div>

          {/* Row list */}
          <div role="listbox" aria-label="Subjects" style={{ border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
            {filteredSubjects.length === 0 && !loadingSubjects && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ui-text-2)", fontSize: 13 }}>
                {subjects.length === 0
                  ? "No rows imported yet. Import the review sheet on the Rows screen."
                  : "No rows match your filter"}
              </div>
            )}
            {filteredSubjects.map((s) => {
              const used = !!s.usedAt;
              const isSelected = selectedSubject?.id === s.id;
              return (
                <div
                  key={s.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedSubject(s)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedSubject(s); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 40,
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--ui-border)",
                    cursor: "pointer",
                    background: isSelected ? "var(--ui-selection-tint)" : "var(--ui-bg)",
                    boxShadow: isSelected ? "inset 2px 0 0 var(--ui-text)" : "none",
                    transition: "background-color var(--ui-dur-1) var(--ui-ease-out)",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: isSelected ? 500 : 400, color: "var(--ui-text)", lineHeight: 1.4 }}>
                    {s.subject}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    <span title="Evidence and story scores from the review sheet" style={{ fontSize: 11, fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--ui-text-3)" }}>
                      E{s.evidence} S{s.story}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ui-text-3)" }}>{s.carouselType}</span>
                    {used && (
                      <span title={`Built ${s.usedAt!.slice(0, 10)}. Picking it again writes a second deck from the same row.`}>
                        <Badge tone="success">Used</Badge>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedRow && (
            <div style={{ marginTop: 12, padding: "12px 16px", background: "var(--ui-surface)", border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 500, color: "var(--ui-text)" }}>
                <IcCheck size={16} strokeWidth={1.75} style={{ color: "var(--ui-success)", flexShrink: 0 }} />
                {topic}
              </div>
              <div style={{ marginTop: 4, marginLeft: 24, fontSize: 12, color: "var(--ui-text-2)", lineHeight: 1.5 }}>
                <div>Six reviewed slides and three hooks come from the sheet. Only the caption and the last slide are written now.</div>
                <div style={{ marginTop: 4, fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums", color: "var(--ui-text-3)" }}>Evidence {selectedRow.evidence}/5 · Story {selectedRow.story}/5</div>
                {selectedRow.why && <div style={{ marginTop: 4 }}>{selectedRow.why}</div>}
                {selectedRow.citation && (
                  <div style={{ marginTop: 4 }}>
                    Source:{" "}
                    {selectedRow.citationUrl
                      ? <a href={selectedRow.citationUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ui-focus)" }}>{selectedRow.citation}</a>
                      : selectedRow.citation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custom mode */}
      {mode === "custom" && (
        <div style={{ marginBottom: 32 }}>
          <Input
            size="lg"
            type="text"
            value={custom}
            maxLength={500}
            invalid={topicTooLong}
            aria-label="Custom topic"
            onChange={(e) => setCustom(e.target.value)}
            placeholder="e.g. Why magnesium beats melatonin for deep sleep"
          />
          {topicTooLong && <div style={{ fontSize: 12, color: "var(--ui-danger)", marginTop: 4 }}>Maximum 500 characters</div>}
        </div>
      )}

      {/* Engagement sub-type (only for engagement format) */}
      {carouselFormat === "engagement" && (
        <div style={group}>
          <Label kind="section">Engagement type</Label>
          <OptionGrid cols={2} value={engagementSubType} onChange={setEngagementSubType}
            options={ENGAGEMENT_SUBTYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label, desc: o.description }))} />
        </div>
      )}

      {/* Structure: how the deck argues. Nine cards, each with an "i" that
          opens what it is, when to use it and an example hook, so nobody has
          to memorise which is which. The recommender still returns legacy
          tones; they are mapped to structures for the badges. */}
      {carouselFormat === "standard" && (
      <div style={group}>
        <Label kind="section">Structure</Label>
        {(() => {
          const recStructures = hookRec.map((r) => structureFromLegacy(r.tone, "standard", stylePreset));
          return (
            <>
              {hookRec.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--ui-text-2)", marginBottom: 12 }}>
                  Suggested for this topic: <strong style={{ fontWeight: 600, color: "var(--ui-text)" }}>{STRUCTURES[recStructures[0]].label}</strong>{hookRec[0].reason ? ` · ${hookRec[0].reason}` : ""}
                </div>
              )}
              <div role="radiogroup" aria-label="Structure" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {STRUCTURE_IDS.map((id) => {
                  const spec = STRUCTURES[id];
                  const recIdx = recStructures.indexOf(id);
                  return (
                    <div key={id} style={{ position: "relative" }}>
                      <CardButton
                        selected={structure === id}
                        onClick={() => setStructure(id)}
                        style={{ height: "100%", paddingRight: 36 }}
                        title={<>{spec.label}{recIdx !== -1 && <span style={{ marginLeft: 6, verticalAlign: "middle" }}><Badge>{recIdx === 0 ? "Top pick" : "Suggested"}</Badge></span>}</>}
                        description={spec.info.example}
                      />
                      <button
                        type="button"
                        aria-label={`About ${spec.label}`}
                        aria-expanded={infoFor === id}
                        onClick={() => setInfoFor(infoFor === id ? null : id)}
                        className="ui-focusable"
                        style={{
                          position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%",
                          border: `1px solid ${infoFor === id ? "var(--ui-text)" : "var(--ui-border)"}`,
                          background: infoFor === id ? "var(--ui-text)" : "var(--ui-bg)",
                          color: infoFor === id ? "var(--ui-bg)" : "var(--ui-text-2)",
                          fontSize: 11, fontWeight: 600, fontFamily: "var(--ui-font-mono)", lineHeight: 1, cursor: "pointer", padding: 0,
                          transition: "background-color var(--ui-dur-1) var(--ui-ease-out), color var(--ui-dur-1) var(--ui-ease-out), border-color var(--ui-dur-1) var(--ui-ease-out)",
                        }}
                      >i</button>
                    </div>
                  );
                })}
              </div>
              {infoFor && (
                <div style={{ marginTop: 12, padding: "12px 16px", border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", background: "var(--ui-surface)", fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{STRUCTURES[infoFor].label}</div>
                  <div><span style={{ fontWeight: 500 }}>What it is.</span> {STRUCTURES[infoFor].info.what}</div>
                  <div><span style={{ fontWeight: 500 }}>Use it when.</span> {STRUCTURES[infoFor].info.when}</div>
                  <div><span style={{ fontWeight: 500 }}>Example hook.</span> &ldquo;{STRUCTURES[infoFor].info.example}&rdquo;</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--ui-text-2)" }}>Value move: {STRUCTURES[infoFor].valueMove === "simplify" ? "make a hard thing simple" : STRUCTURES[infoFor].valueMove === "add-research" ? "add the research to something everyone knows" : "flip something everyone believes"}.</div>
                </div>
              )}
            </>
          );
        })()}
      </div>
      )}

      {/* Saved looks come first: one pick sets the preset, the image engine and
          every deck-wide style knob the studio will open with. */}
      {!isTwoSlideFormat(carouselFormat) && looks.length > 0 && (
        <div style={group}>
          <Label kind="section">Look</Label>
          <UiSelect value={lookId} onChange={(e) => chooseLook(e.target.value)} aria-label="Saved look">
            <option value="">No saved look, set the style below</option>
            {looks.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </UiSelect>
          {lookId && <p style={hint}>The studio opens with the sizes, colours, overlays and toggles of this look. Preset and image engine below follow it too.</p>}
        </div>
      )}
      {/* Carousel style preset — re-skins the whole carousel (colors, fonts,
          image engine). "Editorial Scientific" applies the Lunia brand book. */}
      {!isTwoSlideFormat(carouselFormat) && (
      <div style={group}>
        <Label kind="section">Style</Label>
        <OptionGrid cols={2} value={stylePreset} onChange={setStylePreset} options={[
          { value: "editorial-scientific", label: "Editorial Scientific", desc: "Lunia palette, Inter, gpt-image-2" },
          { value: "free-press", label: "Free Press", desc: "Text-led. Photo cover, no graphics on body slides" },
          { value: "viral", label: "Viral", desc: "Editorial look, slot-built for swipe depth. 5 or 10 slides" },
          { value: "essay", label: "Essay", desc: "Paper, one boxed word, engraving cover, serial chrome. Reads hand-made" },
          { value: "billboard", label: "Billboard", desc: "Paper, outlined LUNIA watermark, four pillar corners, thin-over-heavy headlines around a photo band" },
        ]} />
      </div>
      )}

      {/* Contrast — Editorial Scientific only, because it works by swapping that
          preset's palette block. On any other preset the setting would reach a
          code path that ignores it, so offering it there would be a dead control. */}
      {!isTwoSlideFormat(carouselFormat) && stylePreset === "editorial-scientific" && (
      <div style={group}>
        <Label kind="section">Contrast</Label>
        <OptionGrid cols={2} value={contrastMode} onChange={setContrastMode} options={[
          { value: "standard", label: "Standard", desc: "Ivory frame, edge to edge" },
          { value: "high", label: "Bold post", desc: "Full-bleed photo on a dark ground, ivory type, one yellow phrase" },
        ]} />
      </div>
      )}

      {/* Hook image style — hidden for did_you_know (no AI imagery) */}
      {!isTwoSlideFormat(carouselFormat) && (
      <div style={group}>
        <Label kind="section">Hook image style</Label>
        <OptionGrid cols={2} value={imageStyle} onChange={setImageStyle}
          options={IMAGE_STYLE_OPTIONS.map((o) => ({ value: o.value, label: o.label, desc: o.description }))} />
      </div>
      )}

      {/* Viral: the length choice replaces content length. Every viral slide is
          already concise by construction, so the old toggle has nothing to add. */}
      {carouselFormat === "standard" && (
      <div style={group}>
        <Label kind="section">Length</Label>
        <OptionGrid cols={2} value={viralSlides} onChange={setViralSlides} options={[
          { value: 5 as const, label: "5 slides", desc: "Hook, three content slides, CTA" },
          { value: 10 as const, label: "10 slides", desc: "Hook, eight content slides, CTA" },
        ]} />
      </div>
      )}

      {/* Content length toggle (standard only — engagement is always concise) */}
      {carouselFormat === "standard" && stylePreset !== "viral" && (
      <div style={group}>
        <Label kind="section">Content length</Label>
        <OptionGrid cols={2} value={concise} onChange={setConcise} options={[
          { value: false, label: "Standard", desc: "3-5 sentences per slide" },
          { value: true, label: "Concise", desc: "1-2 sentences, punchy" },
        ]} />
      </div>
      )}

      {/* Brand SEO footer toggle — appends a brand-bridge sentence + a static
          entity line to every caption so AI crawlers / answer engines build
          a strong association between Lunia Life, the product (Lunia Restore),
          the ingredients, and the brand category. Default ON. */}
      <div style={group}>
        <Label kind="section">Caption</Label>
        <CardButton
          role="toggle"
          selected={includeSeoFooter}
          onClick={() => setIncludeSeoFooter((v) => !v)}
          title="Brand SEO line in caption"
          description="Append a brand-bridge sentence plus a Lunia Life · Lunia Restore · ingredients · domain line. Helps AI crawlers and answer engines surface Lunia when users ask related questions."
        />
      </div>

      <Button variant="primary" size="lg" disabled={!topic || topicTooLong} onClick={handleNext}>
        Generate carousel →
      </Button>
    </div>
  );
}

/** A row of option cards where exactly one is chosen. */
function OptionGrid<T extends string | number | boolean>({ options, value, onChange, cols }: {
  options: { value: T; label: string; desc: string }[];
  value: T;
  onChange: (v: T) => void;
  cols: number;
}) {
  return (
    <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {options.map((o) => (
        <CardButton key={String(o.value)} selected={value === o.value} onClick={() => onChange(o.value)} title={o.label} description={o.desc} />
      ))}
    </div>
  );
}

