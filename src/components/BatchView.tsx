"use client";
import { useState, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import DidYouKnowPreviewStep from "@/components/carousel/steps/DidYouKnowPreviewStep";
import { MiniRetroLoader } from "@/components/carousel/shared/RetroLoader";
import {
  BrandStyle, CarouselContent, CarouselFormat, CarouselStylePreset,
  DidYouKnowContent, EngagementSubType, HookTone, Subject,
} from "@/lib/types";
import type { CarouselImageStyle, HookRecommendation } from "@/components/carousel/steps/TopicStep";
import {
  HOOK_TONE_OPTIONS, IMAGE_STYLE_OPTIONS, ENGAGEMENT_SUBTYPE_OPTIONS,
  CATEGORIES, SAMPLE_SUBJECTS, TONE_LABEL,
} from "@/components/carousel/steps/TopicStep";
import { CarouselApiProvider, useCarouselApi } from "@/components/carousel/api-context";

const HOOK_SCALE = 0.22;
const SLIDE_SCALE = 0.22;
const DRAFT_KEY = "lunia:batch:active";
const MAX_TOPICS = 10;

type QueueItem = {
  id: string;
  topic: string;
  hookTone: HookTone;
  carouselFormat: CarouselFormat;
  engagementSubType?: EngagementSubType;
  concise: boolean;
  imageStyle: CarouselImageStyle;
  stylePreset: CarouselStylePreset;
  includeSeoFooter: boolean;
  status: "pending" | "generating" | "reviewing" | "imaging" | "done" | "error";
  content?: CarouselContent;
  didYouKnowVariants?: DidYouKnowContent[];
  selectedDidYouKnow?: number;
  selectedHook: number;
  imageUrl?: string;
  error?: string;
  savedId?: string;
  imagePromptDraft?: string;
  imagePromptOpen?: boolean;
  brandStyle?: BrandStyle;
};

/** A topic queued for generation but not yet sent — configurable before "Generate". */
type DraftTopic = {
  id: string;
  text: string;
  subjectId?: string;
  hookTone: HookTone;
  hookToneAuto: boolean; // true until the user manually overrides the AI recommendation
};

function statusColor(status: QueueItem["status"]): string {
  if (status === "generating") return "#1e7a8a";
  if (status === "reviewing") return "#7c3aed";
  if (status === "imaging") return "#d97706";
  if (status === "done") return "#15803d";
  if (status === "error") return "#dc2626";
  return "var(--muted)";
}

function statusLabel(item: QueueItem): string {
  if (item.status === "pending") return "Waiting...";
  if (item.status === "generating") return "Generating content...";
  if (item.status === "reviewing") return "Ready to review";
  if (item.status === "imaging") return "Generating image...";
  if (item.status === "done") return "Done";
  if (item.status === "error") return `Failed: ${item.error ?? "Unknown error"}`;
  return "";
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 10000));
    return fetch(url, options);
  }
  return res;
}

// ─── DraftTopicRow ──────────────────────────────────────────────────────────
// One queued-but-not-yet-generated topic. Runs its own debounced hook-tone
// recommendation (mirrors TopicStep's per-topic "Recommend hook") so each
// topic in the batch can land on a different tone instead of one tone for
// the whole batch.
function DraftTopicRow({
  row, showToneControl, onChangeText, onChangeTone, onRemove,
}: {
  row: DraftTopic;
  showToneControl: boolean;
  onChangeText: (id: string, text: string) => void;
  onChangeTone: (id: string, tone: HookTone, auto: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const [rec, setRec] = useState<HookRecommendation[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    if (!showToneControl || !row.text.trim() || row.text.length > 500) {
      setRec([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoadingRec(true);
      try {
        const res = await fetch("/api/carousel-v2/recommend-hook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: row.text }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setRec(data as HookRecommendation[]);
          // Only auto-apply if the user hasn't manually picked a tone for this row yet.
          if (row.hookToneAuto && data[0]?.tone) onChangeTone(row.id, data[0].tone, true);
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      } finally {
        setLoadingRec(false);
      }
    }, 700);
    return () => { clearTimeout(t); controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.text, showToneControl]);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7,
      marginBottom: 6, background: "var(--bg)",
    }}>
      <input
        type="text"
        value={row.text}
        onChange={(e) => onChangeText(row.id, e.target.value)}
        style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 13, color: "var(--text)", outline: "none", fontFamily: "inherit" }}
      />
      {showToneControl && (
        <>
          {loadingRec && <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>thinking…</span>}
          {!loadingRec && rec.length > 0 && row.hookToneAuto && (
            <span title={rec[0].reason} style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", flexShrink: 0, whiteSpace: "nowrap" }}>
              ✨ {TONE_LABEL[rec[0].tone] ?? rec[0].tone}
            </span>
          )}
          <select
            value={row.hookTone}
            onChange={(e) => onChangeTone(row.id, e.target.value as HookTone, false)}
            style={{
              fontSize: 11, padding: "4px 6px", border: "1px solid var(--border)", borderRadius: 5,
              background: row.hookToneAuto ? "var(--accent-dim)" : "var(--surface)",
              color: row.hookToneAuto ? "var(--accent)" : "var(--text)",
              fontFamily: "inherit", cursor: "pointer", flexShrink: 0, maxWidth: 150,
            }}
          >
            {HOOK_TONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </>
      )}
      <button
        onClick={() => onRemove(row.id)}
        title="Remove"
        style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px", fontFamily: "inherit", flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// ─── ReviewCard ───────────────────────────────────────────────────────────────
function ReviewCard({
  item,
  onSelectHook,
  onGenerateImage,
  onRetry,
  onImagePromptChange,
  onToggleImagePrompt,
  onContentUpdate,
  onGoBackToReview,
  onSelectDidYouKnow,
  onSaved,
}: {
  item: QueueItem;
  onSelectHook: (id: string, hookIndex: number) => void;
  onGenerateImage: (item: QueueItem) => void;
  onRetry: (item: QueueItem) => void;
  onImagePromptChange: (id: string, prompt: string) => void;
  onToggleImagePrompt: (id: string) => void;
  onContentUpdate: (id: string, content: CarouselContent, imageUrl?: string) => void;
  onGoBackToReview: (id: string) => void;
  onSelectDidYouKnow: (id: string, index: number) => void;
  onSaved: (id: string, savedId: string) => void;
}) {
  const isDidYouKnow = item.carouselFormat === "did_you_know";
  const [expanded, setExpanded] = useState(item.status === "reviewing");
  const content = item.content;
  const hook = content?.hooks[item.selectedHook];
  const imagePrompt = item.imagePromptDraft ?? content?.imagePrompt ?? "";
  const hasReviewable = isDidYouKnow ? !!item.didYouKnowVariants : !!content;

  // Auto-expand once review becomes available. Scoped so the did_you_know
  // branch (which jumps straight to "done", no separate review stage) only
  // fires once on its own terminal status — doesn't reopen a card the user
  // collapsed after the standard flow's own "done" state.
  useEffect(() => {
    if (item.status === "reviewing" || (isDidYouKnow && item.status === "done")) setExpanded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.status]);

  return (
    <div style={{
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      borderLeft: `3px solid ${statusColor(item.status)}`,
    }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", background: "var(--surface)", gap: 12,
          cursor: hasReviewable ? "pointer" : "default",
        }}
        onClick={() => hasReviewable && setExpanded((v) => !v)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
            {item.topic}
          </div>
          <div style={{ fontSize: 12, color: statusColor(item.status), fontWeight: 600 }}>
            {item.status === "done" && item.savedId
              ? "✓ Saved · click to edit"
              : item.status === "done"
              ? "✓ Ready · click to edit, download & save"
              : item.status === "reviewing"
              ? "✎ Review hooks & slides"
              : item.status === "error"
              ? `✗ ${item.error ?? "Failed"}`
              : statusLabel(item)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {(item.status === "generating" || item.status === "imaging") && (
            <div style={{
              width: 16, height: 16, border: "2px solid var(--border)",
              borderTopColor: statusColor(item.status),
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
          )}
          {item.status === "done" && item.savedId && (
            <span style={{
              fontSize: 12, fontWeight: 700, color: "#15803d",
              padding: "5px 12px", border: "1px solid rgba(21,128,61,0.3)",
              borderRadius: 6, background: "rgba(21,128,61,0.06)",
            }}>Saved ✓</span>
          )}
          {item.status === "error" && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(item); }}
              style={{
                fontSize: 12, fontWeight: 700, color: "#dc2626",
                padding: "5px 12px", border: "1px solid rgba(220,38,38,0.3)",
                borderRadius: 6, background: "rgba(220,38,38,0.06)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Retry
            </button>
          )}
          {hasReviewable && (
            <span style={{ fontSize: 16, color: "var(--muted)", transform: expanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>
              ›
            </span>
          )}
        </div>
      </div>

      {/* Did You Know — self-contained preview/save, no hook/image stage */}
      {expanded && isDidYouKnow && item.didYouKnowVariants && (
        <div style={{ padding: "20px 16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <DidYouKnowPreviewStep
            topic={item.topic}
            variants={item.didYouKnowVariants}
            selected={item.selectedDidYouKnow ?? 0}
            onSelect={(i) => onSelectDidYouKnow(item.id, i)}
            onSaved={(id) => onSaved(item.id, id)}
          />
        </div>
      )}

      {/* Standard / Engagement — review panel */}
      {expanded && !isDidYouKnow && content && (
        <div style={{ padding: "20px 16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>

          {/* Hook selector */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Choose hook
            </div>
            <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
              {content.hooks.map((h, i) => {
                const isSelected = item.selectedHook === i;
                const slideW = Math.round(1080 * HOOK_SCALE);
                return (
                  <div key={i} style={{ flexShrink: 0 }}>
                    <div
                      onClick={() => onSelectHook(item.id, i)}
                      style={{
                        cursor: "pointer",
                        borderRadius: 8, overflow: "hidden",
                        outline: isSelected ? "2.5px solid #1e7a8a" : "2.5px solid transparent",
                        outlineOffset: 2,
                        boxShadow: isSelected ? "0 0 0 4px rgba(30,122,138,0.15)" : "0 1px 6px rgba(0,0,0,0.1)",
                        transition: "outline-color 0.15s",
                        position: "relative",
                      }}
                    >
                      <HookSlide headline={h.headline} subline={h.subline} topic={item.topic} scale={HOOK_SCALE} />
                      {isSelected && (
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          width: 20, height: 20, borderRadius: "50%",
                          background: "#1e7a8a", display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div style={{
                      marginTop: 5, fontSize: 11, fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "#1e7a8a" : "var(--muted)",
                      textAlign: "center", width: slideW,
                    }}>
                      {isSelected ? `✓ Hook ${i + 1}` : `Hook ${i + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slides review */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Content slides
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {content.slides.map((slide, i) => (
                <div key={i} style={{ flexShrink: 0 }}>
                  <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.1)" }}>
                    <ContentSlide
                      headline={slide.headline}
                      body={slide.body}
                      citation={slide.citation}
                      graphic={slide.graphic}
                      scale={SLIDE_SCALE}
                    />
                  </div>
                  <div style={{ marginTop: 5, fontSize: 10, color: "var(--muted)", textAlign: "center", width: Math.round(1080 * SLIDE_SCALE) }}>
                    Slide {i + 2}
                  </div>
                </div>
              ))}
              <div style={{ flexShrink: 0 }}>
                <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.1)" }}>
                  <CTASlide headline={content.cta.headline} followLine={content.cta.followLine} scale={SLIDE_SCALE} />
                </div>
                <div style={{ marginTop: 5, fontSize: 10, color: "var(--muted)", textAlign: "center", width: Math.round(1080 * SLIDE_SCALE) }}>
                  CTA
                </div>
              </div>
            </div>
          </div>

          {/* Image prompt (collapsible) */}
          <div style={{ marginBottom: 20, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <button
              onClick={() => onToggleImagePrompt(item.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "var(--surface)", border: "none", padding: "9px 12px",
                fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span>🎨 Hook image prompt</span>
              <span style={{ fontSize: 14, transform: item.imagePromptOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>›</span>
            </button>
            {item.imagePromptOpen && (
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => onImagePromptChange(item.id, e.target.value)}
                  rows={3}
                  placeholder="No prompt yet — will be auto-generated from the hook."
                  style={{
                    width: "100%", fontSize: 12, lineHeight: 1.6,
                    resize: "vertical", fontFamily: "inherit",
                    color: imagePrompt ? "var(--text)" : "var(--subtle)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Hook image preview (when done) */}
          {item.status === "done" && item.imageUrl && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Hook image
              </div>
              <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.12)", display: "inline-block" }}>
                <HookSlide
                  headline={hook?.headline ?? ""}
                  subline={hook?.subline ?? ""}
                  topic={item.topic}
                  scale={HOOK_SCALE}
                  backgroundImageUrl={item.imageUrl}
                  isFalImage
                  stylePreset={item.stylePreset}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {item.status === "reviewing" && (
              <button
                onClick={() => onGenerateImage(item)}
                style={{
                  background: "#1e7a8a", color: "#fff",
                  border: "none", borderRadius: 8,
                  padding: "11px 24px", fontSize: 13, fontWeight: 700,
                  fontFamily: "inherit", cursor: "pointer",
                }}
              >
                Generate image →
              </button>
            )}
            {item.status === "imaging" && (
              <div style={{ width: "100%" }}>
                <MiniRetroLoader label={item.content?.hooks[item.selectedHook]?.headline ?? "HOOK SLIDE"} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full PreviewStep when done (standard / engagement only) */}
      {expanded && !isDidYouKnow && item.status === "done" && item.content && (
        <div style={{ padding: "20px 16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <PreviewStep
            config={{
              topic: item.topic,
              content: item.content,
              selectedHook: item.selectedHook,
              brandStyle: item.brandStyle,
              hookImageUrl: undefined,
              slideImages: [item.imageUrl ?? null, null, null, null, null],
            }}
            hookTone={item.hookTone}
            onRestart={() => setExpanded(false)}
            onChangeHook={() => onGoBackToReview(item.id)}
            onContentChange={(cfg) => onContentUpdate(item.id, cfg.content, cfg.slideImages?.[0] ?? undefined)}
            initialImageStyle={item.imageStyle}
            stylePreset={item.stylePreset}
            carouselFormat={item.carouselFormat}
            onSaved={(id) => onSaved(item.id, id)}
          />
        </div>
      )}
    </div>
  );
}

// ─── BatchView ─────────────────────────────────────────────────────────────────
export default function BatchView() {
  return (
    <CarouselApiProvider apiBase="/api/carousel-v2">
      <BatchViewInner />
    </CarouselApiProvider>
  );
}

function BatchViewInner() {
  const apiBase = useCarouselApi();

  // ── Batch-wide settings — same defaults/behavior as TopicStep ────────────
  const [carouselFormat, setCarouselFormat] = useState<CarouselFormat>("standard");
  const [engagementSubType, setEngagementSubType] = useState<EngagementSubType>("reveal");
  const [concise, setConcise] = useState(true);
  const [includeSeoFooter, setIncludeSeoFooter] = useState(true);
  const [imageStyle, setImageStyle] = useState<CarouselImageStyle>("realistic");
  const [stylePreset, setStylePreset] = useState<CarouselStylePreset>("editorial-scientific");

  // ── Topic queue (pre-generation) ──────────────────────────────────────────
  const [draftTopics, setDraftTopics] = useState<DraftTopic[]>([]);
  const [bulkText, setBulkText] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [generating, setGenerating] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectCategory, setSubjectCategory] = useState("All");
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<{ id: string; title: string; category: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectText, setNewSubjectText] = useState("");
  const [newSubjectCategory, setNewSubjectCategory] = useState("Did You Know");
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then((d) => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // ── Draft persistence — survives reload / accidental tab close ───────────
  const [restoredDraft, setRestoredDraft] = useState(false);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      const hasWork = d && ((d.draftTopics?.length ?? 0) > 0 || (d.queue?.length ?? 0) > 0);
      if (!hasWork) return;
      if (d.carouselFormat) setCarouselFormat(d.carouselFormat);
      if (d.engagementSubType) setEngagementSubType(d.engagementSubType);
      if (typeof d.concise === "boolean") setConcise(d.concise);
      if (typeof d.includeSeoFooter === "boolean") setIncludeSeoFooter(d.includeSeoFooter);
      if (d.imageStyle) setImageStyle(d.imageStyle);
      if (d.stylePreset) setStylePreset(d.stylePreset);
      if (Array.isArray(d.draftTopics)) setDraftTopics(d.draftTopics);
      if (Array.isArray(d.queue)) setQueue(d.queue);
      setRestoredDraft(true);
    } catch { /* ignore corrupt draft */ }
  }, []);

  useEffect(() => {
    if (draftTopics.length === 0 && queue.length === 0) return;
    const draft = {
      v: 1, carouselFormat, engagementSubType, concise, includeSeoFooter,
      imageStyle, stylePreset, draftTopics, queue,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage quota — drop regenerable image URLs and retry.
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          ...draft,
          queue: queue.map((q) => ({ ...q, imageUrl: undefined })),
        }));
      } catch { /* give up silently — draft persistence is best-effort */ }
    }
  }, [carouselFormat, engagementSubType, concise, includeSeoFooter, imageStyle, stylePreset, draftTopics, queue]);

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setDraftTopics([]);
    setQueue([]);
    setRestoredDraft(false);
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  // ── Topic queue helpers ───────────────────────────────────────────────────
  function addDraftTopic(text: string, subjectId?: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDraftTopics((prev) => {
      if (prev.length >= MAX_TOPICS || prev.some((r) => r.text === trimmed)) return prev;
      return [...prev, { id: nanoid(), text: trimmed, subjectId, hookTone: "educational", hookToneAuto: true }];
    });
  }

  function addBulkText() {
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setDraftTopics((prev) => {
      const existing = new Set(prev.map((r) => r.text));
      const room = Math.max(0, MAX_TOPICS - prev.length);
      const additions = lines
        .filter((l) => !existing.has(l))
        .slice(0, room)
        .map((text) => ({ id: nanoid(), text, hookTone: "educational" as HookTone, hookToneAuto: true }));
      return [...prev, ...additions];
    });
    setBulkText("");
  }

  function removeDraftTopic(id: string) {
    setDraftTopics((prev) => prev.filter((r) => r.id !== id));
  }
  function updateDraftText(id: string, text: string) {
    setDraftTopics((prev) => prev.map((r) => (r.id === id ? { ...r, text } : r)));
  }
  function updateDraftTone(id: string, tone: HookTone, auto: boolean) {
    setDraftTopics((prev) => prev.map((r) => (r.id === id ? { ...r, hookTone: tone, hookToneAuto: auto } : r)));
  }

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

  function pickSuggestion(s: { id: string; title: string; category: string }) {
    addDraftTopic(s.title, s.id);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    // Mark used the moment a suggestion is picked (not just on generate) so
    // an abandoned suggestion never resurfaces — matches TopicStep.
    fetch(`/api/subjects/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markUsed" }),
    }).catch(() => {});
    setSubjects((prev) => prev.map((su) => (su.id === s.id ? { ...su, usedAt: new Date().toISOString() } : su)));
  }

  function pickSampleTopic() {
    const pick = SAMPLE_SUBJECTS[Math.floor(Math.random() * SAMPLE_SUBJECTS.length)];
    addDraftTopic(pick);
  }

  async function submitNewSubject() {
    const text = newSubjectText.trim();
    if (text.length < 4 || text.length > 200) {
      setAddSubjectError("Topic must be 4-200 characters");
      return;
    }
    setAddSubjectError(null);
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category: newSubjectCategory }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setAddSubjectError(j.error || "Failed to add topic");
        return;
      }
      const created = await res.json();
      setSubjects((prev) => [created, ...prev]);
      addDraftTopic(created.text, created.id);
      setNewSubjectText("");
      setAddingSubject(false);
    } catch {
      setAddSubjectError("Network error");
    }
  }

  // Batch format forces tone/length on some formats — mirrors TopicStep.handleNext.
  function resolveItemSettings(row: DraftTopic) {
    const hookTone: HookTone =
      carouselFormat === "engagement" ? "science-backed"
      : carouselFormat === "did_you_know" ? "educational"
      : row.hookTone;
    const effConcise =
      carouselFormat === "engagement" ? true
      : carouselFormat === "did_you_know" ? true
      : concise;
    return { hookTone, concise: effConcise };
  }

  // ── Generation ─────────────────────────────────────────────────────────────
  async function generateContent(item: QueueItem) {
    updateItem(item.id, { status: "generating" });
    try {
      const res = await fetchWithRetry(`${apiBase}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: item.topic,
          hookTone: item.hookTone,
          count: item.carouselFormat === "did_you_know" ? 3 : 1,
          concise: item.concise,
          format: item.carouselFormat,
          engagementSubType: item.engagementSubType,
          stylePreset: item.stylePreset,
          includeSeoFooter: item.includeSeoFooter,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        updateItem(item.id, { status: "error", error: body?.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = await res.json();
      if (item.carouselFormat === "did_you_know") {
        const variants = (data?.variants ?? []) as DidYouKnowContent[];
        if (variants.length === 0) {
          updateItem(item.id, { status: "error", error: "No variants returned" });
          return;
        }
        updateItem(item.id, { didYouKnowVariants: variants, selectedDidYouKnow: 0, status: "done" });
        return;
      }
      const content = data?.variants?.[0] as CarouselContent | undefined;
      if (!content) {
        updateItem(item.id, { status: "error", error: "No content returned" });
        return;
      }
      const brandStyle = data?.brandStyle as BrandStyle | undefined;
      updateItem(item.id, { content, brandStyle, status: "reviewing" });
    } catch (e) {
      updateItem(item.id, { status: "error", error: String(e) });
    }
  }

  async function generateImage(item: QueueItem) {
    if (!item.content) return;
    const hook = item.content.hooks[item.selectedHook];
    const imagePrompt = item.imagePromptDraft ?? item.content.imagePrompt;
    updateItem(item.id, { status: "imaging" });
    try {
      const imgRes = await fetchWithRetry(`${apiBase}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: 0,
          topic: item.topic,
          hook,
          imagePrompt,
          imageStyle: item.imageStyle,
          ...(item.stylePreset && item.stylePreset !== "default" ? { stylePreset: item.stylePreset } : {}),
          ...(item.content.hookImageSpec ? { hookImageSpec: item.content.hookImageSpec } : {}),
        }),
      });
      if (imgRes.ok) {
        const imgData = await imgRes.json();
        updateItem(item.id, { imageUrl: imgData?.url, status: "done" });
      } else {
        updateItem(item.id, { status: "done", error: "Image generation failed — carousel still available" });
      }
    } catch {
      updateItem(item.id, { status: "done", error: "Image generation failed — carousel still available" });
    }
  }

  async function handleGenerate() {
    if (draftTopics.length === 0) return;
    const rows = draftTopics.slice(0, MAX_TOPICS);

    const items: QueueItem[] = rows.map((row) => {
      const { hookTone, concise: effConcise } = resolveItemSettings(row);
      return {
        id: nanoid(),
        topic: row.text,
        hookTone,
        carouselFormat,
        engagementSubType: carouselFormat === "engagement" ? engagementSubType : undefined,
        concise: effConcise,
        imageStyle,
        stylePreset,
        includeSeoFooter,
        status: "pending",
        selectedHook: 0,
      };
    });

    setQueue((prev) => [...prev, ...items]);
    setDraftTopics([]);
    setGenerating(true);

    // Mark subject-linked topics used (suggestion-sourced ones are already
    // marked at pick time — this covers subject-library picks, matching the
    // regular flow's mark-at-generate-time behavior).
    for (const row of rows) {
      if (row.subjectId) {
        fetch(`/api/subjects/${row.subjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markUsed" }),
        }).catch(() => {});
      }
    }

    for (let i = 0; i < items.length; i += 3) {
      const chunk = items.slice(i, i + 3);
      await Promise.allSettled(chunk.map((item) => generateContent(item)));
    }
    setGenerating(false);
  }

  async function handleRetry(item: QueueItem) {
    updateItem(item.id, { status: "pending", error: undefined, content: undefined, imageUrl: undefined, savedId: undefined, didYouKnowVariants: undefined });
    await generateContent({ ...item, status: "pending", error: undefined, content: undefined, imageUrl: undefined });
  }

  const canGenerate = draftTopics.length > 0 && !generating;
  const doneCount = queue.filter((i) => i.status === "done").length;
  const reviewingCount = queue.filter((i) => i.status === "reviewing").length;

  const draftTexts = new Set(draftTopics.map((r) => r.text));
  const filteredSubjects = subjects
    .filter((s) => !s.usedAt)
    .filter((s) => subjectCategory === "All" || s.category === subjectCategory)
    .filter((s) => s.text.toLowerCase().includes(subjectSearch.toLowerCase()))
    .filter((s) => !draftTexts.has(s.text))
    .slice(0, 60);

  const showToneControl = carouselFormat === "standard";
  const showStyleControls = carouselFormat !== "did_you_know";
  const showLengthControl = carouselFormat === "standard";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Batch Generate</h2>
          <p style={{ color: "var(--muted)", marginBottom: 0, fontSize: 14 }}>
            Generate multiple carousels at once, with the same options as the single-carousel builder. Review hooks and slides before generating images.
          </p>
        </div>
        {(draftTopics.length > 0 || queue.length > 0) && (
          <button
            onClick={clearDraft}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
          >
            New batch
          </button>
        )}
      </div>

      {restoredDraft && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderRadius: 8, padding: "10px 14px", margin: "16px 0", fontSize: 13, color: "var(--accent)" }}>
          <span>↩ Restored your unsaved batch from this browser.</span>
          <button onClick={clearDraft} style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", whiteSpace: "nowrap" }}>
            Discard & start over
          </button>
        </div>
      )}

      {/* ── Format ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, marginTop: 28 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Format</label>
        <div style={{ display: "flex", gap: 0, border: "1.5px solid var(--border)", borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
          {([
            { val: "standard" as CarouselFormat, label: "Standard" },
            { val: "engagement" as CarouselFormat, label: "Engagement" },
            { val: "did_you_know" as CarouselFormat, label: "Did You Know" },
          ]).map((opt) => (
            <button
              key={opt.val}
              onClick={() => setCarouselFormat(opt.val)}
              disabled={generating}
              style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 600,
                background: carouselFormat === opt.val ? "var(--text)" : "var(--bg)",
                color: carouselFormat === opt.val ? "var(--bg)" : "var(--muted)",
                border: "none", cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {carouselFormat === "engagement" && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Engagement carousels end with a comment CTA — readers comment a keyword to get a guide. Hook tone is fixed to science-backed.
          </p>
        )}
        {carouselFormat === "did_you_know" && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
            Did You Know is a frozen 2-slide template. No graphics, no AI imagery — generates 3 fact variants per topic to pick from.
          </p>
        )}
      </div>

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
                    flex: 1, border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                    background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)", transition: "all 0.12s",
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

      {/* ── Style / image style / content length / caption ────────────────── */}
      {showStyleControls && (
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
                    border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                    background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)", transition: "all 0.12s",
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

      {showStyleControls && (
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
                    border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                    background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)", transition: "all 0.12s",
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

      {showLengthControl && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Content length</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { val: false, label: "Standard", desc: "3-5 sentences per slide" },
              { val: true, label: "Concise", desc: "1-2 sentences, punchy" },
            ].map((opt) => (
              <div
                key={String(opt.val)}
                onClick={() => setConcise(opt.val)}
                style={{
                  flex: 1, border: `1.5px solid ${concise === opt.val ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                  background: concise === opt.val ? "var(--accent-dim)" : "var(--bg)", transition: "all 0.12s",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: concise === opt.val ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: concise === opt.val ? "var(--accent)" : "var(--muted)" }}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Caption</label>
        <div
          role="button" tabIndex={0}
          onClick={() => setIncludeSeoFooter((v) => !v)}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setIncludeSeoFooter((v) => !v); } }}
          style={{
            display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 12,
            padding: "12px 14px", border: `1.5px solid ${includeSeoFooter ? "var(--accent)" : "var(--border)"}`,
            background: includeSeoFooter ? "var(--accent-dim)" : "var(--bg)",
            borderRadius: 8, cursor: "pointer", transition: "all 0.12s", width: "100%", boxSizing: "border-box",
          }}
        >
          <input type="checkbox" checked={includeSeoFooter} readOnly tabIndex={-1} style={{ width: 16, height: 16, marginTop: 2, flex: "0 0 16px", flexShrink: 0, cursor: "pointer", accentColor: "var(--accent)" }} />
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: includeSeoFooter ? "var(--accent)" : "var(--text)", marginBottom: 2 }}>Brand SEO line in caption</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
              Append a brand-bridge sentence plus a Lunia Life · Lunia Restore · ingredients · domain line to every caption in this batch.
            </div>
          </div>
        </div>
      </div>

      {/* ── Topic entry ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Topics ({draftTopics.length}/{MAX_TOPICS})
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            onClick={pickSampleTopic}
            disabled={draftTopics.length >= MAX_TOPICS}
            title="Add a sample topic so you can test a batch without picking real subjects"
            style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "1px dashed var(--border-strong)", borderRadius: 7, cursor: draftTopics.length >= MAX_TOPICS ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
          >
            Try sample topic
          </button>
          <button
            onClick={fetchSuggestions}
            disabled={loadingSuggestions}
            title="Surface diverse, unused topics pulled from your subject library"
            style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderRadius: 7, cursor: loadingSuggestions ? "wait" : "pointer", fontFamily: "inherit", letterSpacing: "0.02em" }}
          >
            {loadingSuggestions ? "Thinking…" : "✨ Suggest topics"}
          </button>
          <button
            onClick={() => setSubjectPickerOpen((v) => !v)}
            style={{ fontSize: 12, fontWeight: 600, background: subjectPickerOpen ? "rgba(30,122,138,0.1)" : "var(--surface)", color: subjectPickerOpen ? "#1e7a8a" : "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {subjectPickerOpen ? "▲ Hide subject library" : "▼ Pick from subject library"}
          </button>
        </div>

        {(suggestions.length > 0 || suggestError) && (
          <div style={{ marginBottom: 16, padding: 16, border: "1px solid var(--accent-mid)", borderRadius: 10, background: "var(--accent-dim)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestions.length ? 12 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Suggested for you · spread across your library, unused only
              </div>
              <button onClick={() => { setSuggestions([]); setSuggestError(null); }} style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                × Dismiss
              </button>
            </div>
            {suggestError && <div style={{ fontSize: 13, color: "var(--error)" }}>{suggestError}</div>}
            <div style={{ display: "grid", gap: 8 }}>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSuggestion(s)}
                  disabled={draftTopics.length >= MAX_TOPICS}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: draftTopics.length >= MAX_TOPICS ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{s.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{s.category}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {subjectPickerOpen && (
          <div style={{ marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", overflow: "hidden" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <input
                type="text" value={subjectSearch} onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                style={{ flex: 1, padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 5, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
              />
              <select
                value={subjectCategory} onChange={(e) => setSubjectCategory(e.target.value)}
                style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 5, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", cursor: "pointer" }}
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
              {!addingSubject ? (
                <button onClick={() => setAddingSubject(true)} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  + Add custom topic to library
                </button>
              ) : (
                <div>
                  <input
                    type="text" value={newSubjectText} maxLength={200} onChange={(e) => setNewSubjectText(e.target.value)}
                    placeholder="New topic text..."
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12, border: "1.5px solid var(--border)", borderRadius: 6, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", boxSizing: "border-box", marginBottom: 6 }}
                  />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select value={newSubjectCategory} onChange={(e) => setNewSubjectCategory(e.target.value)} style={{ flex: 1, padding: "6px 8px", fontSize: 11, border: "1.5px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", cursor: "pointer" }}>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={submitNewSubject} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 700, background: "var(--accent)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Add</button>
                    <button onClick={() => { setAddingSubject(false); setAddSubjectError(null); }} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  </div>
                  {addSubjectError && <div style={{ fontSize: 11, color: "#e53e3e", marginTop: 6 }}>{addSubjectError}</div>}
                </div>
              )}
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {filteredSubjects.length === 0 && (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No subjects match your filter.</div>
              )}
              {filteredSubjects.map((s) => (
                <div
                  key={s.id}
                  onClick={() => draftTopics.length < MAX_TOPICS && addDraftTopic(s.text, s.id)}
                  style={{
                    padding: "7px 12px", fontSize: 12, borderBottom: "1px solid var(--border)",
                    cursor: draftTopics.length >= MAX_TOPICS ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}
                >
                  <span>{s.text}</span>
                  <span style={{ fontSize: 10, color: "var(--subtle)", flexShrink: 0 }}>{s.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk paste */}
        <div style={{ marginBottom: 14 }}>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={"Paste multiple topics at once, one per line, then click Add\nMagnesium and sleep\nCircadian rhythm explained\n5 benefits of ashwagandha"}
            rows={3}
            style={{ width: "100%", padding: "10px 12px", fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
          />
          <button
            onClick={addBulkText}
            disabled={!bulkText.trim()}
            style={{ marginTop: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, background: bulkText.trim() ? "var(--text)" : "var(--border)", color: bulkText.trim() ? "var(--bg)" : "var(--muted)", border: "none", borderRadius: 6, cursor: bulkText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
          >
            + Add to queue
          </button>
        </div>

        {/* Draft queue */}
        {draftTopics.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Queued{showToneControl ? " · hook tone auto-recommended per topic, click to override" : ""}
            </div>
            {draftTopics.map((row) => (
              <DraftTopicRow
                key={row.id}
                row={row}
                showToneControl={showToneControl}
                onChangeText={updateDraftText}
                onChangeTone={updateDraftTone}
                onRemove={removeDraftTopic}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate button */}
      <button
        disabled={!canGenerate}
        onClick={handleGenerate}
        style={{
          background: canGenerate ? "var(--text)" : "var(--border)",
          color: canGenerate ? "var(--bg)" : "var(--muted)",
          border: "none", borderRadius: 8, padding: "14px 36px",
          fontSize: 15, fontWeight: 700, fontFamily: "inherit",
          cursor: canGenerate ? "pointer" : "not-allowed",
          letterSpacing: "-0.01em", marginBottom: 40,
        }}
      >
        {generating
          ? `Generating content…`
          : `Generate ${draftTopics.length} carousel${draftTopics.length !== 1 ? "s" : ""} →`}
      </button>

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, display: "flex", gap: 16 }}>
            <span>Queue — {doneCount}/{queue.length} complete</span>
            {reviewingCount > 0 && (
              <span style={{ color: "#7c3aed" }}>· {reviewingCount} ready to review</span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map((item) => (
              <ReviewCard
                key={item.id}
                item={item}
                onSelectHook={(id, hookIndex) => updateItem(id, { selectedHook: hookIndex })}
                onGenerateImage={generateImage}
                onRetry={handleRetry}
                onImagePromptChange={(id, prompt) => updateItem(id, { imagePromptDraft: prompt })}
                onToggleImagePrompt={(id) => updateItem(id, { imagePromptOpen: !queue.find((i) => i.id === id)?.imagePromptOpen })}
                onContentUpdate={(id, content, imageUrl) => updateItem(id, { content, ...(imageUrl ? { imageUrl } : {}) })}
                onGoBackToReview={(id) => updateItem(id, { status: "reviewing" })}
                onSelectDidYouKnow={(id, index) => updateItem(id, { selectedDidYouKnow: index })}
                onSaved={(id, savedId) => updateItem(id, { savedId })}
              />
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            Tip: Click any card to expand and review. Pick your hook, check the slides, then hit &quot;Generate image →&quot;.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
