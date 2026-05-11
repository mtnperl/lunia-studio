"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { AdditionalEmail } from "@/lib/types";

type Props = {
  emails: AdditionalEmail[];
  /** Pass the review ID so per-email revise can hit the API. */
  reviewId?: string;
  /** Called when the user revises an email and the model returns the updated version. */
  onEmailUpdated?: (email: AdditionalEmail) => void;
};

function fullEmailMarkdown(e: AdditionalEmail): string {
  const alts = e.subjectAlts.length ? `\n\n**Subject alternatives:**\n\n${e.subjectAlts.map((a) => `- ${a}`).join("\n")}` : "";
  return `## ${e.role}\n\n_Position E${e.position} · send at +${e.sendDelayHours}h · ${e.senderName} <${e.senderEmail}>_\n\n**Subject:** ${e.subjectA}\n\n**Preview:** ${e.previewText}${alts}\n\n---\n\n${e.bodyMarkdown}\n\n_Rationale: ${e.rationale}_`;
}

// ─── Per-email card ────────────────────────────────────────────────────────────

function EmailCard({
  email,
  reviewId,
  onEmailUpdated,
}: {
  email: AdditionalEmail;
  reviewId?: string;
  onEmailUpdated?: (email: AdditionalEmail) => void;
}) {
  const [revising, setRevising] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRevise() {
    if (!draft.trim() || !reviewId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/regenerate-additional-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, emailId: email.id, userComment: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.email) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      onEmailUpdated?.(data.email as AdditionalEmail);
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
        borderLeft: "4px solid #FFD800",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <header
        style={{
          background: "#F5F2EC",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
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
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: 700, color: "#102635" }}>
            {email.role}
          </span>
          <span
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 11,
              color: "#5b5340",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            +{email.sendDelayHours}h
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CopyButton text={fullEmailMarkdown(email)} label="Copy email" />
          {reviewId && (
            <button
              onClick={() => { setRevising((v) => !v); setError(null); }}
              disabled={busy}
              title="Ask Claude to revise this email with your guidance"
              style={{
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                background: revising ? "#FFD800" : "transparent",
                color: revising ? "#102635" : "#102635",
                border: `1px solid ${revising ? "#FFD800" : "rgba(16,38,53,0.35)"}`,
                borderRadius: 5,
                cursor: busy ? "wait" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {revising ? "Cancel" : "✎ Revise"}
            </button>
          )}
        </div>
      </header>

      {/* Revise panel — yellow box identical to ReviewSectionCard */}
      {revising && (
        <div style={{ padding: "14px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              background: "#FFFBE6",
              border: "1px solid #FFD800",
              borderRadius: 10,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#5a4500",
              }}
            >
              What should change in this email?
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="e.g. make it more science-led, drop the discount framing, lead with the melatonin mechanism instead"
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
                onClick={submitRevise}
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
                {busy ? "Revising…" : "↺ Revise this email"}
              </button>
              {!busy && (
                <span style={{ fontSize: 11, color: "#5a4500" }}>
                  Opus 4.7 · keeps position and role intact
                </span>
              )}
            </div>
            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "rgba(176, 65, 62, 0.08)",
                  border: "1px solid rgba(176, 65, 62, 0.3)",
                  borderRadius: 5,
                  fontSize: 12,
                  color: "#B0413E",
                }}
              >
                {error}
              </div>
            )}
            {busy && (
              <MiniReviewLoader
                label={`revising E${email.position}`}
                detail={email.role.toUpperCase()}
                engine="opus 4.7 · with thinking"
              />
            )}
          </div>
        </div>
      )}

      {/* Email body */}
      <div style={{ padding: "16px 22px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "8px 14px",
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
          }}
        >
          <Label>Subject</Label>
          <div style={{ color: "#1A1A1A", fontWeight: 700 }}>{email.subjectA}</div>
          {email.subjectAlts.length > 0 && (
            <>
              <Label>A/B alts</Label>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {email.subjectAlts.map((alt, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, color: "#1A1A1A" }}>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#5b5340",
                        letterSpacing: "0.04em",
                        paddingTop: 2,
                      }}
                    >
                      ALT {i + 1}
                    </span>
                    <span style={{ flex: 1 }}>{alt}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Label>Preview</Label>
          <div style={{ color: "#1A1A1A" }}>{email.previewText}</div>
          <Label>Sender</Label>
          <div style={{ color: "#1A1A1A" }}>
            {email.senderName}{" "}
            <span style={{ color: "var(--subtle)" }}>&lt;{email.senderEmail}&gt;</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed #d6cfbe", paddingTop: 12 }}>
          <MarkdownRenderer>{email.bodyMarkdown}</MarkdownRenderer>
        </div>

        {email.rationale && (
          <div
            style={{
              marginTop: 4,
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
            {email.rationale}
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Deck ─────────────────────────────────────────────────────────────────────

export default function AdditionalEmailsDeck({ emails, reviewId, onEmailUpdated }: Props) {
  if (!emails.length) return null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: "Arial, sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: "#102635",
            }}
          >
            New emails to add to this flow
          </h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Generated by Opus 4.7 to bring this flow up to canon. Voice-matched to the existing
            rewrites. Click{" "}
            <strong style={{ color: "#102635" }}>✎ Revise</strong> on any card to guide a
            revision.
          </div>
        </div>
        <CopyButton
          text={emails.map(fullEmailMarkdown).join("\n\n---\n\n")}
          label="Copy all"
          size="md"
        />
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {emails.map((e) => (
          <EmailCard
            key={e.id}
            email={e}
            reviewId={reviewId}
            onEmailUpdated={onEmailUpdated}
          />
        ))}
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
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
