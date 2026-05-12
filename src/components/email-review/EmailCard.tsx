"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import type { EmailFlowAsset } from "@/lib/types";

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
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--subtle)",
        fontFamily: "Arial, sans-serif",
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
        borderLeft: "4px solid #BFFBF8",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#F5F2EC",
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
              background: "#102635",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              borderRadius: 3,
              textTransform: "uppercase",
            }}
          >
            E{email.position}
          </span>
          {email.role && (
            <span style={{ fontFamily: "Arial, sans-serif", fontSize: 14, fontWeight: 700, color: "#102635" }}>
              {email.role}
            </span>
          )}
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 12, color: "#5b5340", fontWeight: 400 }}>
            +{email.sendDelayHours}h
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CopyButton text={emailMarkdown(email, rationale)} label="Copy" />
          <span style={{ fontSize: 11, color: "#5b5340" }}>{expanded ? "▲" : "▼"}</span>
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
              fontFamily: "Arial, sans-serif",
              fontSize: 13,
            }}
          >
            <MetaLabel>Subject</MetaLabel>
            <div style={{ color: "#1A1A1A", fontWeight: 700 }}>{email.subject}</div>

            <MetaLabel>Preview</MetaLabel>
            <div style={{ color: "#1A1A1A" }}>{email.previewText}</div>

            <MetaLabel>Sender</MetaLabel>
            <div style={{ color: "#1A1A1A" }}>
              {email.senderName}{" "}
              <span style={{ color: "var(--subtle)" }}>&lt;{email.senderEmail}&gt;</span>
            </div>
          </div>

          {/* Body */}
          {email.bodyText && (
            <div style={{ borderTop: "1px dashed #d6cfbe", paddingTop: 12 }}>
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
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--text)", fontStyle: "normal", marginRight: 6 }}>Why:</strong>
              {rationale}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
