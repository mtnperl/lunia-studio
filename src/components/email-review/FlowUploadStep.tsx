"use client";
import { useState } from "react";
function randomUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
import LuniaLinter from "@/components/email-review/LuniaLinter";
import type { EmailFlow, EmailFlowAsset, EmailFlowType } from "@/lib/types";

const FLOW_TYPES: { key: EmailFlowType; label: string }[] = [
  { key: "abandoned_checkout", label: "Abandoned checkout" },
  { key: "browse_abandonment", label: "Browse abandonment" },
  { key: "welcome", label: "Welcome / pre-purchase" },
  { key: "post_purchase", label: "Post-purchase / onboarding" },
  { key: "replenishment", label: "Replenishment" },
  { key: "lapsed", label: "Lapsed / reactivation" },
  { key: "campaign", label: "Single campaign" },
];

type Props = {
  onSubmit: (flow: EmailFlow) => void;
  onCancel?: () => void;
};

type DraftEmail = {
  id: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  sendDelayHours: string; // input as string for free typing
  bodyText: string;
  metricsOpen: string;
  metricsClick: string;
  metricsRpr: string;
};

function blankEmail(position: number): DraftEmail {
  return {
    id: randomUUID(),
    subject: "",
    previewText: "",
    senderName: position === 1 ? "Lunia Life" : "",
    senderEmail: position === 1 ? "info@lunialife.com" : "",
    sendDelayHours: position === 1 ? "1" : "",
    bodyText: "",
    metricsOpen: "",
    metricsClick: "",
    metricsRpr: "",
  };
}

export default function FlowUploadStep({ onSubmit, onCancel }: Props) {
  const [flowType, setFlowType] = useState<EmailFlowType>("abandoned_checkout");
  const [flowName, setFlowName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [emails, setEmails] = useState<DraftEmail[]>([blankEmail(1)]);

  function setField(idx: number, patch: Partial<DraftEmail>) {
    setEmails((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function addEmail() {
    setEmails((prev) => [...prev, blankEmail(prev.length + 1)]);
  }

  function removeEmail(idx: number) {
    setEmails((prev) => prev.filter((_, i) => i !== idx));
  }

  function buildFlow(): EmailFlow {
    const cleanedEmails: EmailFlowAsset[] = emails.map((e, i) => {
      const open = parseFloat(e.metricsOpen);
      const click = parseFloat(e.metricsClick);
      const rpr = parseFloat(e.metricsRpr);
      const hasMetrics = !Number.isNaN(open) || !Number.isNaN(click) || !Number.isNaN(rpr);
      return {
        id: e.id,
        position: i + 1,
        subject: e.subject.trim(),
        previewText: e.previewText.trim(),
        senderName: e.senderName.trim(),
        senderEmail: e.senderEmail.trim(),
        sendDelayHours: parseInt(e.sendDelayHours, 10) || 0,
        bodyText: e.bodyText.trim(),
        metrics: hasMetrics
          ? {
              openRate: Number.isNaN(open) ? 0 : open,
              clickRate: Number.isNaN(click) ? 0 : click,
              revenuePerRecipient: Number.isNaN(rpr) ? 0 : rpr,
            }
          : undefined,
      };
    });

    return {
      id: `upload-${Date.now()}`,
      source: "upload",
      flowType,
      flowName: flowName.trim() || `${FLOW_TYPES.find((t) => t.key === flowType)?.label ?? "Flow"} (uploaded)`,
      trigger: trigger.trim() || "(manually uploaded)",
      emails: cleanedEmails,
      fetchedAt: new Date().toISOString(),
    };
  }

  const canSubmit = emails.every((e) => e.subject.trim().length > 0 && e.bodyText.trim().length > 30);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Upload an email flow</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
          Paste the body text of each email. Subject + preview + send delay are required. Metrics are optional but make Section 2 (timing) much sharper.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Flow type">
          <select
            value={flowType}
            onChange={(e) => setFlowType(e.target.value as EmailFlowType)}
            style={selectStyle}
          >
            {FLOW_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Flow name">
          <input
            type="text"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="e.g. Abandoned checkout (Q2)"
            style={inputStyle}
          />
        </Field>
        <Field label="Trigger" style={{ gridColumn: "1 / -1" }}>
          <input
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="e.g. Started Checkout event"
            style={inputStyle}
          />
        </Field>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {emails.map((e, idx) => (
          <div key={e.id} style={{ background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Email {idx + 1}</div>
              {emails.length > 1 && (
                <button
                  onClick={() => removeEmail(idx)}
                  style={{ padding: "4px 10px", fontSize: 11, background: "transparent", color: "var(--subtle)", border: "1px solid var(--border)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Remove
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="Subject"><input value={e.subject} onChange={(ev) => setField(idx, { subject: ev.target.value })} style={inputStyle} placeholder="Subject line" /></Field>
              <Field label="Preview text"><input value={e.previewText} onChange={(ev) => setField(idx, { previewText: ev.target.value })} style={inputStyle} placeholder="Preview / preheader" /></Field>
              <Field label="Sender name"><input value={e.senderName} onChange={(ev) => setField(idx, { senderName: ev.target.value })} style={inputStyle} placeholder="Lunia Life" /></Field>
              <Field label="Sender email"><input value={e.senderEmail} onChange={(ev) => setField(idx, { senderEmail: ev.target.value })} style={inputStyle} placeholder="info@lunialife.com" /></Field>
              <Field label="Send delay (hours from trigger)"><input value={e.sendDelayHours} onChange={(ev) => setField(idx, { sendDelayHours: ev.target.value })} style={inputStyle} placeholder="3" /></Field>
              <Field label="Open rate / Click rate / RPR (optional)" style={{ display: "flex", gap: 6 }}>
                <input value={e.metricsOpen} onChange={(ev) => setField(idx, { metricsOpen: ev.target.value })} placeholder="OR%" style={smallInputStyle} />
                <input value={e.metricsClick} onChange={(ev) => setField(idx, { metricsClick: ev.target.value })} placeholder="CR%" style={smallInputStyle} />
                <input value={e.metricsRpr} onChange={(ev) => setField(idx, { metricsRpr: ev.target.value })} placeholder="$RPR" style={smallInputStyle} />
              </Field>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6 }}>Email body</div>
              <LuniaLinter
                value={e.bodyText}
                onChange={(v) => setField(idx, { bodyText: v })}
                placeholder="Paste the email body. Em dashes, exclamations, FDA Approved badges and other framework violations get flagged in real time."
                rows={10}
                ariaLabel={`Email ${idx + 1} body`}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={addEmail} style={ghostButtonStyle}>+ Add another email</button>
        <div style={{ display: "flex", gap: 8 }}>
          {onCancel && <button onClick={onCancel} style={ghostButtonStyle}>Cancel</button>}
          <button
            onClick={() => onSubmit(buildFlow())}
            disabled={!canSubmit}
            style={{
              ...primaryButtonStyle,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            Use this flow →
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
};

const smallInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "8px 10px",
  width: 70,
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "auto",
};

const ghostButtonStyle: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 12,
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  background: "var(--accent)",
  color: "#fff",
  border: "1px solid var(--accent)",
  borderRadius: 6,
  fontFamily: "inherit",
  letterSpacing: "0.02em",
};
