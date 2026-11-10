"use client";
import { useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { AdditionalEmail, FlowCompletenessGap, SavedFlowReview } from "@/lib/types";
import { Button } from "@/components/ui";

type Props = {
  reviewId: string;
  completeness: FlowCompletenessGap;
  existingAdditionalCount: number;
  onAdditionalEmails: (emails: AdditionalEmail[], total: number) => void;
};

export default function FlowCompletenessBanner({ reviewId, completeness, existingAdditionalCount, onAdditionalEmails }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, completeness.gap - existingAdditionalCount);
  // Always render — even at canon. User needs to see the count.
  // Only skip when overbuilt AND nothing generated (overbuilt is a warning, not an action).
  if (completeness.gap < 0 && existingAdditionalCount === 0) return null;

  async function generate(n: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/generate-additional-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, count: n }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.emails)) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      onAdditionalEmails(data.emails as AdditionalEmail[], typeof data.total === "number" ? data.total : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const overbuilt = completeness.gap < 0;
  const atCanon = completeness.gap === 0 && remaining === 0;
  const accent = overbuilt ? "var(--ui-warning)" : remaining > 0 ? "var(--ui-text)" : "var(--ui-success)";
  const tint = overbuilt ? "var(--ui-warning-tint)" : remaining > 0 ? "var(--ui-surface)" : "var(--ui-success-tint)";
  const border = "var(--ui-border)";

  return (
    <section style={{
      background: tint,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Big count chip */}
        <div style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ui-bg)",
          border: "1px solid var(--ui-border)",
          color: accent,
          fontFamily: "var(--ui-font-mono)",
          fontVariantNumeric: "tabular-nums",
          borderRadius: 10,
          padding: "8px 14px",
          lineHeight: 1,
          gap: 2,
          minWidth: 64,
          textAlign: "center",
        }}>
          <span style={{ fontSize: 22, fontWeight: 600 }}>{completeness.currentCount}<span style={{ fontSize: 13, opacity: 0.7 }}>/{completeness.canonicalCount}</span></span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", opacity: 0.85 }}>emails</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: accent, letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", marginBottom: 4 }}>
            {overbuilt ? "Flow may be overbuilt" : remaining > 0 ? `${remaining} email${remaining === 1 ? "" : "s"} short of the framework recommendation` : "Flow is at the recommended count"}
          </div>
          <div style={{ fontSize: 14, color: "var(--ui-text)", lineHeight: 1.5 }}>
            {completeness.rationale}
          </div>
        </div>
      </div>

      {remaining > 0 && completeness.suggestedAdditions && completeness.suggestedAdditions.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ui-text-2)", letterSpacing: "var(--ui-tracking-caps)", textTransform: "uppercase", marginBottom: 6 }}>
            Suggested additions
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {completeness.suggestedAdditions.slice(0, remaining).map((s) => (
              <li key={s.position} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--ui-text)", lineHeight: 1.55 }}>
                <span style={{ flexShrink: 0, padding: "2px 8px", background: "var(--ui-ink)", color: "var(--ui-on-ink)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", borderRadius: 3, marginTop: 2 }}>
                  E{s.position}
                </span>
                <span style={{ flex: 1 }}>
                  <strong style={{ color: "var(--ui-text)" }}>{s.role}</strong>{" "}
                  <span style={{ color: "var(--ui-text-2)" }}>· send at +{s.sendDelayHours}h</span><br />
                  <span style={{ color: "var(--ui-text)" }}>{s.purpose}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {remaining > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="primary" size="md" onClick={() => generate(remaining)} disabled={busy}>
            {busy ? "Generating…" : `+ Generate ${remaining} missing email${remaining === 1 ? "" : "s"}`}
          </Button>
          {remaining > 1 && !busy && (
            <Button variant="secondary" size="md" onClick={() => generate(1)}>
              Or just 1
            </Button>
          )}
          <span style={{ fontSize: 11, color: "var(--ui-text-2)" }}>
            Inter typography · voice-matched to your rewrites · Opus 4.7 with thinking
          </span>
        </div>
      )}

      {busy && <MiniReviewLoader label={`drafting ${remaining} new email${remaining === 1 ? "" : "s"}`} detail="MATCHING VOICE" engine="opus 4.7 · with thinking" />}
      {error && <div style={{ padding: "8px 12px", background: "var(--ui-danger-tint)", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 12, color: "var(--ui-danger)" }}>{error}</div>}
    </section>
  );
}
