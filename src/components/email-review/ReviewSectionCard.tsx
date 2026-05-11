"use client";
import { useState, useMemo } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { FlowReviewSection, FlowReviewSectionKey } from "@/lib/types";

const META: Record<FlowReviewSectionKey, { number: number; title: string; subtitle: string; icon: string; tint: string }> = {
  // "headline" kept for backward compat with old reviews that include it.
  headline:  { number: 0, title: "Headline",                                   subtitle: "If you only do three things",        icon: "★", tint: "#FFD800" },
  timing:    { number: 1, title: "Timing",                                     subtitle: "Send cadence + when to fix",         icon: "◷", tint: "#BFFBF8" },
  subjects:  { number: 2, title: "Subject lines, preview, sender",             subtitle: "Open + close levers · A/B options",  icon: "✉", tint: "#F4DDC2" },
  rewrites:  { number: 3, title: "Full body rewrites",                         subtitle: "Version A + Version B per email",    icon: "✎", tint: "#D9E5DD" },
  design:    { number: 4, title: "Design and images",                          subtitle: "Visual audit — layout, images, CTA",  icon: "✦", tint: "#E5DFD0" },
  strategy:  { number: 5, title: "Strategic question + Action checklist",     subtitle: "Reframe + this-week / next-two-weeks", icon: "◆", tint: "#C8DDE8" },
};

// ─── Finding parser ───────────────────────────────────────────────────────────
// Splits a bodyMarkdown string into alternating segments: regular markdown and
// ⚠ finding blocks. A finding block is one ⚠ line optionally followed by a
// "Fix: …" line. The item ID is the first 80 chars of the issue text (stable
// across renders as long as the review content doesn't change).

type SegmentMd      = { type: "md"; content: string };
type SegmentFinding = { type: "finding"; id: string; issueText: string; fixText: string | null };
type Segment        = SegmentMd | SegmentFinding;

function parseFindingSegments(markdown: string): Segment[] {
  const lines = markdown.split("\n");
  const segments: Segment[] = [];
  let mdBuffer: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trimStart().startsWith("⚠")) {
      // Flush the markdown buffer
      if (mdBuffer.length > 0) {
        const content = mdBuffer.join("\n").trimEnd();
        if (content) segments.push({ type: "md", content });
        mdBuffer = [];
      }
      // Issue line (preserve the ⚠ symbol)
      const issueLine = line.trimStart();
      // Peek ahead for a Fix: line
      let fixText: string | null = null;
      if (i + 1 < lines.length && /^\s*Fix:/i.test(lines[i + 1])) {
        i++;
        fixText = lines[i].trim();
      }
      // Stable item ID: first 80 chars of the text after "⚠ "
      const id = issueLine.replace(/^⚠\s*/, "").slice(0, 80).trim();
      segments.push({ type: "finding", id, issueText: issueLine, fixText });
    } else {
      mdBuffer.push(line);
    }
    i++;
  }
  if (mdBuffer.length > 0) {
    const content = mdBuffer.join("\n").trimEnd();
    if (content) segments.push({ type: "md", content });
  }
  return segments;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  reviewId: string;
  section: FlowReviewSection;
  onUpdate: (next: FlowReviewSection) => void;
  /** Drives the collapsed "done" state + REOPEN button. */
  done?: boolean;
  /** Toggle persisted via /api/email-review/toggle-section-done. */
  onToggleDone?: (sectionKey: FlowReviewSection["key"], next: boolean) => void;
  /**
   * IDs of ⚠ items that the user has already marked done in this section.
   * Passed down from EmailReviewView which owns the review state.
   */
  doneItemIds?: string[];
  /**
   * Called when the user clicks Done / Reopen on a single ⚠ item.
   * `allDone` is true when marking done and this was the last remaining item —
   * the parent should also mark the whole section done.
   */
  onToggleItemDone?: (
    sectionKey: FlowReviewSection["key"],
    itemId: string,
    done: boolean,
    allDone: boolean,
  ) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewSectionCard({
  reviewId,
  section,
  onUpdate,
  done = false,
  onToggleDone,
  doneItemIds = [],
  onToggleItemDone,
}: Props) {
  const meta = META[section.key];
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse ⚠ findings once per bodyMarkdown change (stable reference via useMemo).
  const segments = useMemo(() => parseFindingSegments(section.bodyMarkdown), [section.bodyMarkdown]);
  const findingIds = useMemo(
    () => segments.filter((s): s is SegmentFinding => s.type === "finding").map((s) => s.id),
    [segments],
  );

  function handleItemToggle(itemId: string, nextDone: boolean) {
    if (!onToggleItemDone) return;
    let allDone = false;
    if (nextDone) {
      const nowDone = new Set([...doneItemIds, itemId]);
      allDone = findingIds.every((id) => nowDone.has(id));
    }
    onToggleItemDone(section.key, itemId, nextDone, allDone);
  }

  async function regenerate() {
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, sectionKey: section.key, userComment: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.section) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      onUpdate(data.section as FlowReviewSection);
      setDraft("");
      setRevising(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Collapsed "done" view ──────────────────────────────────────────────────
  if (done) {
    return (
      <article
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          opacity: 0.78,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "stretch",
            background: "linear-gradient(135deg, #1f3a4a 0%, #2a4f63 100%)",
            color: "rgba(255,255,255,0.85)",
            position: "relative",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(31, 111, 58, 0.9)",
              color: "#fff",
              fontFamily: "Arial, sans-serif",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <div style={{ flex: 1, padding: "12px 18px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
              Section {meta.number} · DONE
            </div>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.92)" }}>
              {meta.title}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
            {findingIds.length > 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginRight: 4 }}>
                {findingIds.length} item{findingIds.length !== 1 ? "s" : ""} resolved
              </span>
            )}
            <button
              onClick={() => onToggleDone?.(section.key, false)}
              title="Reopen this section"
              style={{
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              ↺ Reopen
            </button>
          </div>
        </header>
      </article>
    );
  }

  // ── Active section view ────────────────────────────────────────────────────
  const doneCount = findingIds.filter((id) => doneItemIds.includes(id)).length;
  const totalFindings = findingIds.length;

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header strip */}
      <header
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "linear-gradient(135deg, #102635 0%, #1a3a52 100%)",
          color: "#fff",
          position: "relative",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: meta.tint,
            color: "#102635",
            fontFamily: "Arial, sans-serif",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            position: "relative",
          }}
        >
          {meta.number}
          <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 14, opacity: 0.45 }}>{meta.icon}</span>
        </div>
        <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
            Section {meta.number}
            {totalFindings > 0 && (
              <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 10 }}>
                · {doneCount}/{totalFindings} items resolved
              </span>
            )}
          </div>
          <h2 style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            {meta.title}
          </h2>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{meta.subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px" }}>
          <CopyButton text={`## ${section.title}\n\n${section.bodyMarkdown}`} label="Copy" />
          <button
            onClick={() => { setRevising((v) => !v); setError(null); }}
            disabled={busy}
            title="Ask Claude to revise this section"
            style={{
              padding: "5px 11px",
              fontSize: 11,
              fontWeight: 700,
              background: revising ? "#FFD800" : "transparent",
              color: revising ? "#102635" : "#fff",
              border: `1px solid ${revising ? "#FFD800" : "rgba(255,255,255,0.4)"}`,
              borderRadius: 5,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {revising ? "Cancel" : "✎ Revise"}
          </button>
          {onToggleDone && (
            <button
              onClick={() => onToggleDone(section.key, true)}
              title="Mark this section done — it will collapse so you can focus on what's left"
              style={{
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(191, 251, 248, 0.5)",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              ✓ Done
            </button>
          )}
        </div>
      </header>

      {/* Compliance / warning flags */}
      {section.flags && section.flags.length > 0 && (
        <div style={{ padding: "12px 24px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {section.flags.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                background: f.severity === "compliance" ? "rgba(176, 65, 62, 0.08)" : "rgba(255, 184, 28, 0.10)",
                border: `1px solid ${f.severity === "compliance" ? "rgba(176, 65, 62, 0.3)" : "rgba(255, 184, 28, 0.4)"}`,
                color: f.severity === "compliance" ? "#B0413E" : "#9a6b00",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "Arial, sans-serif",
                fontWeight: 600,
                lineHeight: 1.5,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <span style={{ flexShrink: 0, padding: "1px 7px", borderRadius: 3, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: f.severity === "compliance" ? "#B0413E" : "#9a6b00", color: "#fff" }}>
                {f.severity === "compliance" ? "Compliance" : "Warn"}
              </span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Revise panel */}
      {revising && (
        <div style={{ padding: "14px 24px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "#FFFBE6", border: "1px solid #FFD800", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5a4500" }}>
              What should change in this section?
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="e.g. less prescriptive on timing, focus more on the science of the second touch, drop the welcome-discount recommendation"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                lineHeight: 1.5,
                background: "#fff",
                color: "#1A1A1A",
                border: "1px solid #ECD060",
                borderRadius: 6,
                fontFamily: "Arial, sans-serif",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={regenerate}
                disabled={busy || !draft.trim()}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: busy || !draft.trim() ? "rgba(16,38,53,0.4)" : "#102635",
                  color: "#fff",
                  border: "1px solid #102635",
                  borderRadius: 5,
                  cursor: busy || !draft.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {busy ? "Regenerating…" : "↺ Regenerate this section"}
              </button>
              {!busy && (
                <span style={{ fontSize: 11, color: "#5a4500" }}>
                  Opus 4.7 · keeps the rest of the review intact
                </span>
              )}
            </div>
            {error && <div style={{ padding: "8px 12px", background: "rgba(176, 65, 62, 0.08)", border: "1px solid rgba(176, 65, 62, 0.3)", borderRadius: 5, fontSize: 12, color: "#B0413E" }}>{error}</div>}
            {busy && <MiniReviewLoader label={`regenerating section ${meta.number}`} detail={meta.title.toUpperCase()} engine="opus 4.7 · with thinking" />}
          </div>
        </div>
      )}

      {/* Body — rendered as segments; ⚠ findings get interactive Done/Reopen buttons */}
      <div style={{ padding: "14px 28px 22px", display: "flex", flexDirection: "column", gap: 0 }}>
        {segments.map((seg, idx) => {
          if (seg.type === "md") {
            return <MarkdownRenderer key={idx}>{seg.content}</MarkdownRenderer>;
          }
          // ── Finding block ────────────────────────────────────────────────
          const itemDone = doneItemIds.includes(seg.id);
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                background: itemDone ? "rgba(34,197,94,0.06)" : "rgba(176,65,62,0.06)",
                border: `1px solid ${itemDone ? "rgba(34,197,94,0.28)" : "rgba(176,65,62,0.22)"}`,
                borderRadius: 8,
                margin: "6px 0",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              {/* Text column */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: 13,
                    color: itemDone ? "#15803d" : "#B0413E",
                    fontWeight: 600,
                    lineHeight: 1.5,
                    textDecoration: itemDone ? "line-through" : "none",
                    opacity: itemDone ? 0.7 : 1,
                    wordBreak: "break-word",
                  }}
                >
                  {seg.issueText}
                </div>
                {seg.fixText && (
                  <div
                    style={{
                      fontFamily: "Arial, sans-serif",
                      fontSize: 12.5,
                      color: itemDone ? "#15803d" : "#5b5340",
                      lineHeight: 1.5,
                      marginTop: 3,
                      textDecoration: itemDone ? "line-through" : "none",
                      opacity: itemDone ? 0.6 : 1,
                      wordBreak: "break-word",
                    }}
                  >
                    {seg.fixText}
                  </div>
                )}
              </div>
              {/* Done / Reopen button */}
              {onToggleItemDone && (
                <button
                  onClick={() => handleItemToggle(seg.id, !itemDone)}
                  title={itemDone ? "Reopen this item" : "Mark this item done"}
                  style={{
                    flexShrink: 0,
                    padding: "3px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    background: itemDone ? "rgba(34,197,94,0.15)" : "rgba(176,65,62,0.10)",
                    color: itemDone ? "#15803d" : "#B0413E",
                    border: `1px solid ${itemDone ? "rgba(34,197,94,0.4)" : "rgba(176,65,62,0.3)"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    alignSelf: "flex-start",
                    marginTop: 1,
                  }}
                >
                  {itemDone ? "↺ Reopen" : "✓ Done"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
