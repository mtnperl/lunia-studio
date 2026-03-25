"use client";
import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { CarouselContent, HookTone, Subject } from "@/lib/types";

type QueueItem = {
  id: string;
  topic: string;
  status: "pending" | "generating" | "imaging" | "done" | "error";
  content?: CarouselContent;
  imageUrl?: string;
  error?: string;
  savedId?: string;
};

const HOOK_TONE_OPTIONS: { value: HookTone; label: string; description: string }[] = [
  { value: "educational", label: "Educational", description: "Clear, factual, teaches something new" },
  { value: "science-backed", label: "Science-backed", description: "Lead with research findings and data" },
  { value: "curiosity", label: "Curiosity gap", description: "Tease a counterintuitive insight" },
  { value: "myth-bust", label: "Myth-bust", description: "Challenge a common misconception" },
];

function statusColor(status: QueueItem["status"]): string {
  if (status === "generating") return "#1e7a8a";
  if (status === "imaging") return "#7c3aed";
  if (status === "done") return "#15803d";
  if (status === "error") return "#dc2626";
  return "var(--muted)";
}

function statusLabel(item: QueueItem): string {
  if (item.status === "pending") return "Waiting...";
  if (item.status === "generating") return "Generating content...";
  if (item.status === "imaging") return "Creating hook image...";
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

  function addSubjectToTopics(text: string) {
    setTopicsText((prev) => {
      const lines = prev.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.includes(text)) return prev;
      return lines.length > 0 ? prev.trimEnd() + "\n" + text : text;
    });
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function generateOne(item: QueueItem) {
    updateItem(item.id, { status: "generating" });

    let content: CarouselContent | undefined;

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
      content = data?.variants?.[0] as CarouselContent | undefined;

      if (!content) {
        updateItem(item.id, { status: "error", error: "No content returned" });
        return;
      }

      updateItem(item.id, { content, status: "imaging" });
    } catch (e) {
      updateItem(item.id, { status: "error", error: String(e) });
      return;
    }

    // Generate hook image
    try {
      const imgRes = await fetchWithRetry("/api/carousel/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideIndex: 0,
          topic: item.topic,
          hook: content.hooks?.[0],
          imagePrompt: content.imagePrompt,
        }),
      });

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        updateItem(item.id, { imageUrl: imgData?.url, status: "done" });
      } else {
        // fal.ai error — carousel still usable without image
        updateItem(item.id, { status: "done", error: "Image generation failed — carousel still available" });
      }
    } catch {
      // Image failed — still mark done
      updateItem(item.id, { status: "done", error: "Image generation failed — carousel still available" });
    }
  }

  async function handleGenerate() {
    const topics = topicsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (topics.length === 0) return;

    const items: QueueItem[] = topics.map((topic) => ({
      id: nanoid(),
      topic,
      status: "pending",
    }));

    setQueue(items);
    setGenerating(true);

    // Process in chunks of 3
    for (let i = 0; i < items.length; i += 3) {
      const chunk = items.slice(i, i + 3);
      await Promise.allSettled(chunk.map((item) => generateOne(item)));
    }

    setGenerating(false);
  }

  async function handleSave(item: QueueItem) {
    if (!item.content) return;
    try {
      const res = await fetch("/api/carousel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: item.topic,
          hookTone,
          content: item.content,
          selectedHook: 0,
          graphicStyles: [null, null, null, null, null],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        updateItem(item.id, { savedId: data?.id ?? "saved" });
      }
    } catch {
      // fail silently
    }
  }

  async function handleRetry(item: QueueItem) {
    updateItem(item.id, { status: "pending", error: undefined, content: undefined, imageUrl: undefined, savedId: undefined });
    await generateOne({ ...item, status: "pending", error: undefined, content: undefined, imageUrl: undefined });
  }

  const topics = topicsText.split("\n").map((t) => t.trim()).filter(Boolean);
  const canGenerate = topics.length > 0 && !generating;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Batch Generate</h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Generate multiple carousels at once. Max 10 topics, processed 3 at a time.
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
            width: "100%",
            padding: "12px 14px",
            fontSize: 14,
            border: "1.5px solid var(--border)",
            borderRadius: 8,
            fontFamily: "inherit",
            background: "var(--bg)",
            color: "var(--text)",
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {topics.length > 0 ? `${Math.min(topics.length, 10)} topic${topics.length !== 1 ? "s" : ""} queued${topics.length > 10 ? " (max 10)" : ""}` : "No topics entered"}
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
          <div style={{
            marginTop: 10, border: "1px solid var(--border)", borderRadius: 8,
            background: "var(--surface)", overflow: "hidden",
          }}>
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
              <input
                type="text"
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
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
                        padding: "7px 12px",
                        fontSize: 12,
                        borderBottom: "1px solid var(--border)",
                        cursor: alreadyAdded ? "default" : "pointer",
                        background: alreadyAdded ? "rgba(30,122,138,0.06)" : "transparent",
                        color: alreadyAdded ? "#1e7a8a" : "var(--text)",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { if (!alreadyAdded) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <span>{s.text}</span>
                      {alreadyAdded
                        ? <span style={{ fontSize: 10, color: "#1e7a8a", fontWeight: 700 }}>Added</span>
                        : <span style={{ fontSize: 11, color: "var(--subtle)" }}>+ Add</span>
                      }
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
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: generating ? "not-allowed" : "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  transition: "all 0.12s",
                  boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
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
          border: "none",
          borderRadius: 8,
          padding: "14px 36px",
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "inherit",
          cursor: canGenerate ? "pointer" : "not-allowed",
          letterSpacing: "-0.01em",
          marginBottom: 40,
        }}
      >
        {generating ? "Generating..." : `Generate ${Math.min(topics.length, 10)} carousel${topics.length !== 1 ? "s" : ""} →`}
      </button>

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
            Queue — {queue.filter((i) => i.status === "done").length}/{queue.length} complete
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "16px 18px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  borderLeft: `3px solid ${statusColor(item.status)}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                      {item.topic}
                    </div>
                    <div style={{ fontSize: 12, color: statusColor(item.status), fontWeight: 600 }}>
                      {item.status === "done" ? "✓ Done" : item.status === "error" ? `✗ ${item.error ?? "Failed"}` : statusLabel(item)}
                    </div>
                    {item.status === "done" && item.error && (
                      <div style={{ fontSize: 11, color: "#d97706", marginTop: 3 }}>
                        Note: {item.error}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    {item.status === "done" && item.content && (
                      <>
                        {item.savedId ? (
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: "#15803d",
                            padding: "6px 14px", border: "1px solid rgba(21,128,61,0.3)",
                            borderRadius: 6, background: "rgba(21,128,61,0.06)",
                          }}>
                            Saved ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSave(item)}
                            style={{
                              fontSize: 12, fontWeight: 700, color: "#1e7a8a",
                              padding: "6px 14px", border: "1px solid rgba(30,122,138,0.3)",
                              borderRadius: 6, background: "rgba(30,122,138,0.06)",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            Save to library
                          </button>
                        )}
                      </>
                    )}
                    {item.status === "error" && (
                      <button
                        onClick={() => handleRetry(item)}
                        style={{
                          fontSize: 12, fontWeight: 700, color: "#dc2626",
                          padding: "6px 14px", border: "1px solid rgba(220,38,38,0.3)",
                          borderRadius: 6, background: "rgba(220,38,38,0.06)",
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Retry
                      </button>
                    )}
                    {(item.status === "generating" || item.status === "imaging") && (
                      <div style={{
                        width: 16, height: 16, border: "2px solid var(--border)",
                        borderTopColor: statusColor(item.status),
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            Tip: Open a saved carousel in the Builder for full export and individual slide download.
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
