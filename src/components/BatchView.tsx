"use client";
import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";
import PreviewStep from "@/components/carousel/steps/PreviewStep";
import { MiniRetroLoader } from "@/components/carousel/shared/RetroLoader";
import { BrandStyle, CarouselContent, HookTone, Subject } from "@/lib/types";

const HOOK_SCALE = 0.22;
const SLIDE_SCALE = 0.22;

type QueueItem = {
  id: string;
  topic: string;
  status: "pending" | "generating" | "reviewing" | "imaging" | "done" | "error";
  content?: CarouselContent;
  selectedHook: number;
  imageUrl?: string;
  error?: string;
  savedId?: string;
  imagePromptDraft?: string;
  imagePromptOpen?: boolean;
  brandStyle?: BrandStyle;
};

const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Clear, factual, teaches something new" },
  { value: "science-backed", label: "Science-backed", description: "Lead with research findings and data" },
  { value: "curiosity", label: "Curiosity gap", description: "Tease a counterintuitive insight" },
  { value: "myth-bust", label: "Myth-bust", description: "Challenge a common misconception" },
];

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

// ─── ReviewCard ───────────────────────────────────────────────────────────────
function ReviewCard({
  item,
  hookTone,
  onSelectHook,
  onGenerateImage,
  onRetry,
  onImagePromptChange,
  onToggleImagePrompt,
  onContentUpdate,
  onGoBackToReview,
}: {
  item: QueueItem;
  hookTone: HookTone;
  onSelectHook: (id: string, hookIndex: number) => void;
  onGenerateImage: (item: QueueItem) => void;
  onRetry: (item: QueueItem) => void;
  onImagePromptChange: (id: string, prompt: string) => void;
  onToggleImagePrompt: (id: string) => void;
  onContentUpdate: (id: string, content: CarouselContent, imageUrl?: string) => void;
  onGoBackToReview: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(item.status === "reviewing");
  const content = item.content;
  const hook = content?.hooks[item.selectedHook];
  const imagePrompt = item.imagePromptDraft ?? content?.imagePrompt ?? "";

  // Auto-expand when review becomes available
  useEffect(() => {
    if (item.status === "reviewing") setExpanded(true);
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
          cursor: content ? "pointer" : "default",
        }}
        onClick={() => content && setExpanded((v) => !v)}
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
          {content && (
            <span style={{ fontSize: 16, color: "var(--muted)", transform: expanded ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>
              ›
            </span>
          )}
        </div>
      </div>

      {/* Review panel */}
      {expanded && content && (
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

      {/* Full PreviewStep when done */}
      {expanded && item.status === "done" && item.content && (
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
            hookTone={hookTone}
            onRestart={() => setExpanded(false)}
            onChangeHook={() => onGoBackToReview(item.id)}
            onContentChange={(cfg) => onContentUpdate(item.id, cfg.content, cfg.slideImages?.[0] ?? undefined)}
          />
        </div>
      )}
    </div>
  );
}

// ─── BatchView ─────────────────────────────────────────────────────────────────
export default function BatchView() {
  const [topicsText, setTopicsText] = useState("");
  const [hookTone, setHookTone] = useState<HookTone>("educational");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/subjects").then((r) => r.json()).then((d) => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addSubjectToTopics(text: string) {
    setTopicsText((prev) => {
      const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.includes(text)) return prev;
      return lines.length > 0 ? prev.trimEnd() + "\n" + text : text;
    });
  }

  async function generateContent(item: QueueItem) {
    updateItem(item.id, { status: "generating" });
    try {
      const res = await fetchWithRetry("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: item.topic, hookTone, count: 1 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        updateItem(item.id, { status: "error", error: body?.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = await res.json();
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
      const imgRes = await fetchWithRetry("/api/carousel/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: 0,
          topic: item.topic,
          hook,
          imagePrompt,
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
    const topics = topicsText
      .split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    if (topics.length === 0) return;

    const items: QueueItem[] = topics.map((topic) => ({
      id: nanoid(), topic, status: "pending", selectedHook: 0,
    }));
    setQueue(items);
    setGenerating(true);

    for (let i = 0; i < items.length; i += 3) {
      const chunk = items.slice(i, i + 3);
      await Promise.allSettled(chunk.map((item) => generateContent(item)));
    }
    setGenerating(false);
  }

  async function handleRetry(item: QueueItem) {
    updateItem(item.id, { status: "pending", error: undefined, content: undefined, imageUrl: undefined, savedId: undefined });
    await generateContent({ ...item, status: "pending", error: undefined, content: undefined, imageUrl: undefined });
  }

  const topics = topicsText.split("\n").map((t) => t.trim()).filter(Boolean);
  const canGenerate = topics.length > 0 && !generating;
  const doneCount = queue.filter((i) => i.status === "done").length;
  const reviewingCount = queue.filter((i) => i.status === "reviewing").length;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Batch Generate</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Generate multiple carousels at once. Review hooks and slides before generating images.
      </p>

      {/* Topics textarea */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Topics (one per line)
        </label>
        <textarea
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          placeholder={"One topic per line\nMagnesium and sleep\nCircadian rhythm explained\n5 benefits of ashwagandha"}
          rows={6}
          style={{
            width: "100%", padding: "12px 14px", fontSize: 14,
            border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit",
            background: "var(--bg)", color: "var(--text)", outline: "none",
            resize: "vertical", boxSizing: "border-box", lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {topics.length > 0
              ? `${Math.min(topics.length, 10)} topic${topics.length !== 1 ? "s" : ""} queued${topics.length > 10 ? " (max 10)" : ""}`
              : "No topics entered"}
          </div>
          {subjects.length > 0 && (
            <button
              onClick={() => setSubjectPickerOpen((v) => !v)}
              style={{
                fontSize: 12, fontWeight: 600,
                background: subjectPickerOpen ? "rgba(30,122,138,0.1)" : "var(--surface)",
                color: subjectPickerOpen ? "#1e7a8a" : "var(--muted)",
                border: "1px solid var(--border)", borderRadius: 6,
                padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {subjectPickerOpen ? "▲ Hide subjects" : "▼ Pick from subjects"}
            </button>
          )}
        </div>

        {/* Subject picker */}
        {subjectPickerOpen && (
          <div style={{ marginTop: 10, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", overflow: "hidden" }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text" value={subjectSearch} onChange={(e) => setSubjectSearch(e.target.value)}
                placeholder="Search subjects..."
                style={{
                  width: "100%", padding: "5px 8px", fontSize: 12,
                  border: "1px solid var(--border)", borderRadius: 5,
                  fontFamily: "inherit", background: "var(--bg)", color: "var(--text)", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {subjects
                .filter((s) => !s.usedAt && s.text.toLowerCase().includes(subjectSearch.toLowerCase()))
                .slice(0, 60)
                .map((s) => {
                  const alreadyAdded = topicsText.split("\n").map((l) => l.trim()).includes(s.text);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !alreadyAdded && addSubjectToTopics(s.text)}
                      style={{
                        padding: "7px 12px", fontSize: 12,
                        borderBottom: "1px solid var(--border)",
                        cursor: alreadyAdded ? "default" : "pointer",
                        background: alreadyAdded ? "rgba(30,122,138,0.06)" : "transparent",
                        color: alreadyAdded ? "#1e7a8a" : "var(--text)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                      }}
                      onMouseEnter={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <span>{s.text}</span>
                      {alreadyAdded
                        ? <span style={{ fontSize: 10, color: "#1e7a8a", fontWeight: 700 }}>Added</span>
                        : <span style={{ fontSize: 11, color: "var(--subtle)" }}>+ Add</span>}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Hook tone selector */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Hook tone
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {HOOK_TONE_OPTIONS.map((opt) => {
            const sel = hookTone === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => !generating && setHookTone(opt.value)}
                style={{
                  border: `1.5px solid ${sel ? "#1e7a8a" : "var(--border)"}`,
                  borderRadius: 8, padding: "10px 12px",
                  cursor: generating ? "not-allowed" : "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  opacity: generating ? 0.6 : 1,
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: sel ? "#1e7a8a" : "var(--text)" }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: sel ? "#1e7a8a" : "var(--muted)", lineHeight: 1.4, opacity: sel ? 0.8 : 1 }}>{opt.description}</div>
              </div>
            );
          })}
        </div>
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
          ? `Generating content… (${queue.filter(i => i.status === "reviewing" || i.status === "done").length}/${queue.length})`
          : `Generate ${Math.min(topics.length, 10)} carousel${topics.length !== 1 ? "s" : ""} →`}
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
                hookTone={hookTone}
                onSelectHook={(id, hookIndex) => updateItem(id, { selectedHook: hookIndex })}
                onGenerateImage={generateImage}
                onRetry={handleRetry}
                onImagePromptChange={(id, prompt) => updateItem(id, { imagePromptDraft: prompt })}
                onToggleImagePrompt={(id) => updateItem(id, { imagePromptOpen: !queue.find(i => i.id === id)?.imagePromptOpen })}
                onContentUpdate={(id, content, imageUrl) => updateItem(id, { content, ...(imageUrl ? { imageUrl } : {}) })}
                onGoBackToReview={(id) => updateItem(id, { status: "reviewing" })}
              />
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            Tip: Click any card to expand and review. Pick your hook, check the slides, then hit "Generate image →".
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
