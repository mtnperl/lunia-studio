"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import MarkdownRenderer from "@/components/email-review/MarkdownRenderer";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow, EmailFlowAsset } from "@/lib/types";

const FLOW_TYPE_LABELS: Record<string, string> = {
  abandoned_checkout: "Abandoned checkout",
  browse_abandonment: "Browse abandonment",
  welcome: "Welcome",
  post_purchase: "Post-purchase",
  replenishment: "Replenishment",
  lapsed: "Lapsed customers",
  campaign: "Campaign",
};

const PLACEHOLDERS = [
  "e.g. A 3-email abandoned checkout flow for someone who added Restore to their cart but didn't complete the purchase. Lead with the science, no discounts.",
  "e.g. A welcome flow for first-time buyers who just purchased Restore. Introduce the brand story, explain the three ingredients, build ritual.",
  "e.g. A post-purchase sequence for the 21 days after the first order — guide them through building a sleep habit and set up a replenishment prompt.",
  "e.g. A 2-email lapsed customer win-back. No guilt, no discount — lead with what they're missing and what changed with the formula.",
];

function emailMarkdown(e: EmailFlowAsset, rationale?: string): string {
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

function flowMarkdown(flow: EmailFlow, rationales: Record<string, string>): string {
  const header = `# ${flow.flowName}\n\n_Flow type: ${FLOW_TYPE_LABELS[flow.flowType] ?? flow.flowType} · Trigger: ${flow.trigger}_\n`;
  return [header, ...flow.emails.map((e) => emailMarkdown(e, rationales[e.id]))].join("\n\n---\n\n");
}

// ─── Email card ────────────────────────────────────────────────────────────────

function EmailCard({ email, rationale }: { email: EmailFlowAsset; rationale?: string }) {
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

// ─── Panel ─────────────────────────────────────────────────────────────────────

type Props = {
  onCancel: () => void;
  /** Called when the user wants to run a review on the generated flow. */
  onRunReview: (flow: EmailFlow) => void;
};

export default function CreateFlowPanel({ onCancel, onRunReview }: Props) {
  const [useCase, setUseCase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<EmailFlow | null>(null);
  const [rationales, setRationales] = useState<Record<string, string>>({});

  const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

  async function generate() {
    if (!useCase.trim()) return;
    setBusy(true);
    setError(null);
    setFlow(null);
    try {
      const res = await fetch("/api/email-review/create-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCase: useCase.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.flow) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      setFlow(data.flow as EmailFlow);
      setRationales((data.rationales as Record<string, string>) ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Input area */}
      {!flow && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontFamily: "Arial, sans-serif", fontSize: 16, fontWeight: 700, color: "#102635", marginBottom: 4 }}>
              Describe the flow you need
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Describe the audience, trigger, goal, and any constraints (discount allowed? tone? sequence length?).
              Claude will determine the flow type, pick the canonical email count, and write every email following
              all Lunia brand rules.
            </div>
          </div>

          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            rows={5}
            placeholder={placeholder}
            autoFocus
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              background: "var(--surface-r, #fafaf9)",
              color: "#1A1A1A",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontFamily: "Arial, sans-serif",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(176, 65, 62, 0.08)",
                border: "1px solid rgba(176, 65, 62, 0.3)",
                borderRadius: 8,
                fontSize: 13,
                color: "#B0413E",
              }}
            >
              {error}
            </div>
          )}

          {busy && (
            <MiniReviewLoader
              label="creating flow"
              detail="DRAFTING EMAILS"
              engine="opus 4.7 · with thinking"
            />
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={generate}
              disabled={busy || !useCase.trim()}
              style={{
                padding: "9px 18px",
                fontSize: 13,
                fontWeight: 700,
                background: busy || !useCase.trim() ? "rgba(16,38,53,0.4)" : "#102635",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: busy || !useCase.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {busy ? "Generating…" : "✦ Create flow"}
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              style={{
                padding: "9px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                cursor: busy ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Generated flow */}
      {flow && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Flow header */}
          <div
            style={{
              background: "linear-gradient(135deg, #102635 0%, #1a3a52 100%)",
              borderRadius: 14,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 4,
                }}
              >
                {FLOW_TYPE_LABELS[flow.flowType] ?? flow.flowType} · {flow.emails.length} email{flow.emails.length !== 1 ? "s" : ""}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "Arial, sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: "-0.01em",
                }}
              >
                {flow.flowName}
              </h2>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 }}>
                Trigger: {flow.trigger}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CopyButton
                text={flowMarkdown(flow, rationales)}
                label="Copy all"
                size="md"
              />
              <button
                onClick={() => onRunReview(flow)}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#FFD800",
                  color: "#102635",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                ✦ Run review on this flow →
              </button>
            </div>
          </div>

          {/* Email cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {flow.emails.map((e) => (
              <EmailCard key={e.id} email={e} rationale={rationales[e.id]} />
            ))}
          </div>

          {/* Start over */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              onClick={() => { setFlow(null); setError(null); }}
              style={{
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ← Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
