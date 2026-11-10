"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { AdditionalEmail } from "@/lib/types";
import { Button } from "@/components/ui";

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
        borderLeft: "4px solid var(--ui-border-strong)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <header
        style={{
          background: "var(--ui-surface)",
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
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ui-text)" }}>
            {email.role}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--ui-text-2)",
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
            <Button variant="secondary" size="sm" onClick={() => { setRevising((v) => !v); setError(null); }} disabled={busy} title="Ask Claude to revise this email with your guidance">
              {revising ? "Cancel" : "Revise"}
            </Button>
          )}
        </div>
      </header>

      {/* Revise panel — yellow box identical to ReviewSectionCard */}
      {revising && (
        <div style={{ padding: "14px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              background: "var(--ui-surface)",
              border: "1px solid var(--ui-border-strong)",
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
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ui-text-2)",
              }}
            >
              What should change in this email?
            </label>
            <textarea className="ui-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="e.g. make it more science-led, drop the discount framing, lead with the melatonin mechanism instead"
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button variant="primary" size="sm" onClick={submitRevise} disabled={busy || !draft.trim()}>
                {busy ? "Revising…" : "✨ Revise this email"}
              </Button>
              {!busy && (
                <span style={{ fontSize: 11, color: "var(--ui-text-2)" }}>
                  Opus 4.7 · keeps position and role intact
                </span>
              )}
            </div>
            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--ui-danger-tint)",
                  border: "1px solid var(--ui-border)",
                  borderRadius: 5,
                  fontSize: 12,
                  color: "var(--ui-danger)",
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
            fontSize: 13,
          }}
        >
          <Label>Subject</Label>
          <div style={{ color: "var(--ui-text)", fontWeight: 600 }}>{email.subjectA}</div>
          {email.subjectAlts.length > 0 && (
            <>
              <Label>A/B alts</Label>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {email.subjectAlts.map((alt, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, color: "var(--ui-text)" }}>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--ui-text-2)",
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
          <div style={{ color: "var(--ui-text)" }}>{email.previewText}</div>
          <Label>Sender</Label>
          <div style={{ color: "var(--ui-text)" }}>
            {email.senderName}{" "}
            <span style={{ color: "var(--subtle)" }}>&lt;{email.senderEmail}&gt;</span>
          </div>
        </div>

        <div style={{ borderTop: "1px dashed var(--ui-border)", paddingTop: 12 }}>
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
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--ui-text)", fontWeight: 500, marginRight: 6 }}>Why</strong>
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
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ui-text)",
            }}
          >
            New emails to add to this flow
          </h2>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Generated by Opus 4.7 to bring this flow up to canon. Voice-matched to the existing
            rewrites. Click{" "}
            <strong style={{ color: "var(--ui-text)", fontWeight: 600 }}>Revise</strong> on any card to guide a
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
