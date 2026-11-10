"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import type { EmailFlowAsset } from "@/lib/types";
import { IcChevron } from "@/components/ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function emailMarkdown(e: EmailFlowAsset, rationale?: string): string {
  const lines = [
    `### E${e.position} — ${e.role ?? e.subject}`,
    `_+${e.sendDelayHours}h · ${e.senderName} <${e.senderEmail}>_`,
    ``,
    `**Subject:** ${e.subject}`,
    `**Preview:** ${e.previewText}`,
    ``,
    `---`,
    ``,
    e.bodyText ?? "",
  ];
  if (rationale) lines.push(``, `_Why: ${rationale}_`);
  return lines.join("\n");
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--subtle)",
        paddingTop: 3,
      }}
    >
      {children}
    </span>
  );
}

// ─── EmailCard ─────────────────────────────────────────────────────────────────

export default function EmailCard({ email, rationale }: { email: EmailFlowAsset; rationale?: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "4px solid var(--ui-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "var(--ui-surface)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "3px 9px",
              background: "var(--ui-ink)",
              color: "var(--ui-on-ink)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              borderRadius: 3,
              textTransform: "uppercase",
            }}
          >
            E{email.position}
          </span>
          {email.role && (
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>
              {email.role}
            </span>
          )}
          <span style={{ fontSize: 12, color: "var(--ui-text-2)", fontWeight: 400 }}>
            +{email.sendDelayHours}h
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CopyButton text={emailMarkdown(email, rationale)} label="Copy" />
          <IcChevron size={16} strokeWidth={1.75} style={{ color: "var(--ui-text-3)", transition: "transform var(--ui-dur-2) var(--ui-ease-in-out)", transform: expanded ? "rotate(180deg)" : "none" }} />
        </div>
      </header>

      {expanded && (
        <div style={{ padding: "16px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Metadata grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              gap: "7px 14px",
              fontSize: 13,
            }}
          >
            <MetaLabel>Subject</MetaLabel>
            <div style={{ color: "var(--ui-text)", fontWeight: 600 }}>{email.subject}</div>

            <MetaLabel>Preview</MetaLabel>
            <div style={{ color: "var(--ui-text)" }}>{email.previewText}</div>

            <MetaLabel>Sender</MetaLabel>
            <div style={{ color: "var(--ui-text)" }}>
              {email.senderName}{" "}
              <span style={{ color: "var(--subtle)" }}>&lt;{email.senderEmail}&gt;</span>
            </div>
          </div>

          {/* Body */}
          {email.bodyText && (
            <div style={{ borderTop: "1px dashed var(--ui-border)", paddingTop: 12 }}>
              <MarkdownRenderer>{email.bodyText}</MarkdownRenderer>
            </div>
          )}

          {/* Rationale */}
          {rationale && (
            <div
              style={{
                padding: "8px 12px",
                background: "var(--surface-r)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--muted)",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--ui-text)", fontWeight: 500, marginRight: 6 }}>Why</strong>
              {rationale}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
