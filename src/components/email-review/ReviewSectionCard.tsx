"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { FlowReviewSection, FlowReviewSectionKey } from "@/lib/types";

const META: Record<FlowReviewSectionKey, { number: number; title: string; subtitle: string; icon: string; tint: string }> = {
  headline:  { number: 1, title: "Headline",                                   subtitle: "If you only do three things",        icon: "★", tint: "#FFD800" },
  timing:    { number: 2, title: "Timing",                                     subtitle: "Send cadence + when to fix",         icon: "◷", tint: "#BFFBF8" },
  subjects:  { number: 3, title: "Subject lines, preview, sender",             subtitle: "Open + close levers · A/B options",  icon: "✉", tint: "#F4DDC2" },
  rewrites:  { number: 4, title: "Full body rewrites",                         subtitle: "Version A + Version B per email",    icon: "✎", tint: "#D9E5DD" },
  design:    { number: 5, title: "Design, images, copy",                       subtitle: "Per-email audit",                    icon: "✦", tint: "#E5DFD0" },
  strategy:  { number: 6, title: "Strategic question + Action checklist",     subtitle: "Reframe + this-week / next-two-weeks", icon: "◆", tint: "#C8DDE8" },
};

type Props = {
  reviewId: string;
  section: FlowReviewSection;
  onUpdate: (next: FlowReviewSection) => void;
};

export default function ReviewSectionCard({ reviewId, section, onUpdate }: Props) {
  const meta = META[section.key];
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      {/* Body */}
      <div style={{ padding: "14px 28px 22px" }}>
        <MarkdownRenderer>{section.bodyMarkdown}</MarkdownRenderer>
      </div>
    </article>
  );
}
