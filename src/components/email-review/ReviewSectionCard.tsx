"use client";
import { useState, useMemo } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import { Button, IcCheck, Label, Textarea } from "@/components/ui";
import type { FlowReviewSection, FlowReviewSectionKey } from "@/lib/types";

const META: Record<FlowReviewSectionKey, { number: number; title: string; subtitle: string }> = {
  // "headline" kept for backward compat with old reviews that include it.
  headline:  { number: 0, title: "Headline",                                   subtitle: "If you only do three things" },
  timing:    { number: 1, title: "Timing",                                     subtitle: "Send cadence + when to fix" },
  subjects:  { number: 2, title: "Subject lines, preview, sender",             subtitle: "Open + close levers · A/B options" },
  rewrites:  { number: 3, title: "Full body rewrites",                         subtitle: "Version A + Version B per email" },
  design:    { number: 4, title: "Design and images",                          subtitle: "Visual audit — layout, images, CTA" },
  strategy:  { number: 5, title: "Strategic question + Action checklist",     subtitle: "Reframe + this-week / next-two-weeks" },
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

  const mono: React.CSSProperties = { fontFamily: "var(--ui-font-mono)", fontVariantNumeric: "tabular-nums" };
  const shell: React.CSSProperties = {
    background: "var(--ui-bg)",
    border: "1px solid var(--ui-border)",
    borderRadius: "var(--ui-radius-4)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  };
  const num = String(meta.number).padStart(2, "0");

  // ── Collapsed "done" view ──────────────────────────────────────────────────
  if (done) {
    return (
      <article style={{ ...shell, background: "var(--ui-surface)" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, padding: "8px 16px 8px 20px" }}>
          <IcCheck size={16} strokeWidth={2} style={{ color: "var(--ui-success)", flexShrink: 0 }} />
          <span style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)" }}>{num}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: "var(--ui-text-2)" }}>{meta.title}</span>
          {findingIds.length > 0 && (
            <span style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)" }}>
              {findingIds.length} item{findingIds.length !== 1 ? "s" : ""} resolved
            </span>
          )}
          <Button size="sm" variant="ghost" title="Reopen this section" onClick={() => onToggleDone?.(section.key, false)}>
            Reopen
          </Button>
        </header>
      </article>
    );
  }

  // ── Active section view ────────────────────────────────────────────────────
  const doneCount = findingIds.filter((id) => doneItemIds.includes(id)).length;
  const totalFindings = findingIds.length;

  return (
    <article style={shell}>
      {/* Header strip */}
      <header style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 20px 16px 24px", borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...mono, fontSize: 12, color: "var(--ui-text-3)" }}>
            Section {num}
            {totalFindings > 0 && <> · {doneCount}/{totalFindings} items resolved</>}
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 600, lineHeight: 1.3, color: "var(--ui-text)" }}>
            {meta.title}
          </h2>
          <div style={{ fontSize: 13, color: "var(--ui-text-2)", marginTop: 2 }}>{meta.subtitle}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <CopyButton text={`## ${section.title}\n\n${section.bodyMarkdown}`} label="Copy" variant="ghost" />
          <Button
            size="sm"
            variant={revising ? "selected" : "secondary"}
            disabled={busy}
            title="Ask Claude to revise this section"
            onClick={() => { setRevising((v) => !v); setError(null); }}
          >
            {revising ? "Cancel" : "Revise"}
          </Button>
          {onToggleDone && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IcCheck size={14} strokeWidth={2} />}
              title="Mark this section done. It collapses so you can focus on what's left"
              onClick={() => onToggleDone(section.key, true)}
            >
              Done
            </Button>
          )}
        </div>
      </header>

      {/* Compliance / warning flags */}
      {section.flags && section.flags.length > 0 && (
        <div style={{ padding: "16px 24px 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {section.flags.map((f, i) => {
            const compliance = f.severity === "compliance";
            return (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: compliance ? "var(--ui-danger-tint)" : "var(--ui-warning-tint)",
                  borderRadius: "var(--ui-radius-2)",
                  fontSize: 13,
                  color: "var(--ui-text)",
                  lineHeight: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, color: compliance ? "var(--ui-danger)" : "var(--ui-warning)", lineHeight: 1.65 }}>
                  {compliance ? "Compliance" : "Warning"}
                </span>
                <span>{f.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Revise panel */}
      {revising && (
        <div style={{ padding: "16px 24px 0" }}>
          <div style={{ background: "var(--ui-surface)", border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Label kind="field" htmlFor={`revise-${section.key}`} style={{ marginBottom: 0 }}>What should change in this section?</Label>
            <Textarea
              id={`revise-${section.key}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="e.g. less prescriptive on timing, focus more on the science of the second touch, drop the welcome-discount recommendation"
              autoFocus
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <Button size="sm" variant="primary" busy={busy} disabled={!draft.trim()} onClick={regenerate}>
                ✨ Regenerate this section
              </Button>
              {!busy && (
                <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>
                  Opus 4.7 · keeps the rest of the review intact
                </span>
              )}
            </div>
            {error && <div style={{ padding: "8px 12px", background: "var(--ui-danger-tint)", borderRadius: "var(--ui-radius-2)", fontSize: 12, color: "var(--ui-danger)" }}>{error}</div>}
            {busy && <MiniReviewLoader label={`regenerating section ${meta.number}`} detail={meta.title.toLowerCase()} engine="opus 4.7 · with thinking" />}
          </div>
        </div>
      )}

      {/* Body — rendered as segments; findings get interactive Done/Reopen buttons */}
      <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column" }}>
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
                gap: 12,
                padding: "8px 8px 8px 16px",
                background: itemDone ? "var(--ui-surface)" : "var(--ui-bg)",
                border: "1px solid var(--ui-border)",
                boxShadow: `inset 2px 0 0 ${itemDone ? "var(--ui-success)" : "var(--ui-danger)"}`,
                borderRadius: "var(--ui-radius-2)",
                margin: "6px 0",
                transition: "background-color var(--ui-dur-2) var(--ui-ease-out)",
              }}
            >
              {/* Text column */}
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: itemDone ? "var(--ui-text-3)" : "var(--ui-text)",
                    fontWeight: 500,
                    lineHeight: 1.5,
                    textDecoration: itemDone ? "line-through" : "none",
                    wordBreak: "break-word",
                  }}
                >
                  {seg.issueText.replace(/^⚠\s*/, "")}
                </div>
                {seg.fixText && (
                  <div
                    style={{
                      fontSize: 13,
                      color: itemDone ? "var(--ui-text-3)" : "var(--ui-text-2)",
                      lineHeight: 1.5,
                      marginTop: 2,
                      textDecoration: itemDone ? "line-through" : "none",
                      wordBreak: "break-word",
                    }}
                  >
                    {seg.fixText}
                  </div>
                )}
              </div>
              {/* Done / Reopen button */}
              {onToggleItemDone && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={itemDone ? undefined : <IcCheck size={14} strokeWidth={2} />}
                  title={itemDone ? "Reopen this item" : "Mark this item done"}
                  onClick={() => handleItemToggle(seg.id, !itemDone)}
                >
                  {itemDone ? "Reopen" : "Done"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
