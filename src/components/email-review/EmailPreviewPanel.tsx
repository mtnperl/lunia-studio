"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import type { EmailFlowAsset } from "@/lib/types";

type Props = {
  emails: EmailFlowAsset[];
};

function formatDelay(hours: number): string {
  if (hours === 0) return "Day 0";
  if (hours < 24) return `+${hours}h`;
  const days = Math.round(hours / 24);
  return `+${days}d`;
}

/** Strip basic HTML tags to get readable plain text for the body copy. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function EmailRow({ email }: { email: EmailFlowAsset }) {
  const [open, setOpen] = useState(false);
  const bodyText = email.bodyText ?? (email.html ? stripHtml(email.html) : "");

  return (
    <div style={{
      border: "1px solid #e2ddd4",
      borderRadius: 8,
      overflow: "hidden",
      background: "#fff",
    }}>
      {/* Collapsed header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        {/* E# badge */}
        <span style={{
          flexShrink: 0,
          padding: "2px 7px",
          background: "#102635",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 4,
          letterSpacing: "0.06em",
          marginTop: 1,
        }}>
          E{email.position} · {formatDelay(email.sendDelayHours)}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Role label (create-flow emails have this) */}
          {email.role && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
              {email.role}
            </div>
          )}
          {/* Subject */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#102635", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {email.subject || <span style={{ color: "#aaa", fontWeight: 400 }}>(no subject)</span>}
          </div>
          {/* Preview text */}
          {email.previewText && (
            <div style={{ fontSize: 11, color: "#7a7060", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {email.previewText}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <span style={{ flexShrink: 0, fontSize: 12, color: "#aaa", marginTop: 2, transition: "transform 0.15s", display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          ›
        </span>
      </button>

      {/* Copy buttons row — always visible */}
      <div style={{ padding: "0 14px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <CopyButton text={email.subject} label="Copy subject" size="sm" />
        {email.previewText && (
          <CopyButton text={email.previewText} label="Copy preview" size="sm" />
        )}
        {bodyText && (
          <CopyButton text={bodyText} label="Copy body" size="sm" />
        )}
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{
          borderTop: "1px solid #e2ddd4",
          padding: "14px 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>
          {/* Subject + preview text detail */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 10, rowGap: 4, fontSize: 12 }}>
            <span style={{ color: "#8b8270", fontWeight: 700 }}>Subject</span>
            <span style={{ color: "#102635", fontWeight: 600 }}>{email.subject || "—"}</span>
            {email.previewText && <>
              <span style={{ color: "#8b8270", fontWeight: 700 }}>Preview</span>
              <span style={{ color: "#4a4030" }}>{email.previewText}</span>
            </>}
            <span style={{ color: "#8b8270", fontWeight: 700 }}>From</span>
            <span style={{ color: "#4a4030" }}>{email.senderName} {email.senderEmail ? `<${email.senderEmail}>` : ""}</span>
          </div>

          {/* Body */}
          {bodyText ? (
            <div style={{
              padding: "10px 12px",
              background: "#F5F2EC",
              border: "1px solid #e2ddd4",
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.6,
              color: "#1A1A1A",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 320,
              overflow: "auto",
              fontFamily: "ui-monospace, Menlo, monospace",
            }}>
              {bodyText}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>No body text available for this email.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmailPreviewPanel({ emails }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!emails || emails.length === 0) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 700, color: "#102635", letterSpacing: "-0.01em" }}>
            Email content · {emails.length} email{emails.length === 1 ? "" : "s"}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--muted)" }}>
            Click any email to expand the body. Copy subject, preview text, or body individually.
          </p>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          style={{
            flexShrink: 0,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 600,
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {collapsed ? "Show ↓" : "Hide ↑"}
        </button>
      </div>

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[...emails].sort((a, b) => a.position - b.position).map((email) => (
            <EmailRow key={email.id} email={email} />
          ))}
        </div>
      )}
    </section>
  );
}
