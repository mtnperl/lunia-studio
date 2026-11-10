"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import EmailCard, { emailMarkdown } from "@/components/email-review/EmailCard";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow } from "@/lib/types";
import { Button } from "@/components/ui";

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

function flowMarkdown(flow: EmailFlow, rationales: Record<string, string>): string {
  const header = `# ${flow.flowName}\n\n_Flow type: ${FLOW_TYPE_LABELS[flow.flowType] ?? flow.flowType} · Trigger: ${flow.trigger}_\n`;
  return [header, ...flow.emails.map((e) => emailMarkdown(e, rationales[e.id]))].join("\n\n---\n\n");
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
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ui-text)", marginBottom: 4 }}>
              Describe the flow you need
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Describe the audience, trigger, goal, and any constraints (discount allowed? tone? sequence length?).
              Claude will determine the flow type, pick the canonical email count, and write every email following
              all Lunia brand rules.
            </div>
          </div>

          <textarea className="ui-input"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            rows={5}
            placeholder={placeholder}
            autoFocus
          />

          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--ui-danger-tint)",
                border: "1px solid var(--ui-border)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--ui-danger)",
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
            <Button variant="primary" size="md" onClick={generate} disabled={busy || !useCase.trim()}>
              {busy ? "Generating…" : "✨ Create flow"}
            </Button>
            <Button variant="secondary" size="md" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Generated flow */}
      {flow && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Flow header */}
          <div
            style={{
              background: "var(--ui-surface)",
              border: "1px solid var(--ui-border)",
              borderRadius: "var(--ui-radius-4)",
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
                  fontSize: 12,
                  fontFamily: "var(--ui-font-mono)",
                  color: "var(--ui-text-3)",
                  marginBottom: 4,
                }}
              >
                {FLOW_TYPE_LABELS[flow.flowType] ?? flow.flowType} · {flow.emails.length} email{flow.emails.length !== 1 ? "s" : ""}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--ui-text)",
                  letterSpacing: "var(--ui-tracking-tight)",
                }}
              >
                {flow.flowName}
              </h2>
              <div style={{ fontSize: 13, color: "var(--ui-text-2)", marginTop: 4 }}>
                Trigger: {flow.trigger}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CopyButton
                text={flowMarkdown(flow, rationales)}
                label="Copy all"
                size="md"
              />
              <Button size="md" variant="primary" onClick={() => onRunReview(flow)}>
                ✨ Run review on this flow
              </Button>
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
            <Button variant="secondary" size="md" onClick={() => { setFlow(null); setError(null); }}>
              ← Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

