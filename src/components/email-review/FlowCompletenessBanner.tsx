"use client";
import { useState } from "react";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { AdditionalEmail, FlowCompletenessGap, SavedFlowReview } from "@/lib/types";

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
  if (completeness.gap <= 0 && existingAdditionalCount === 0) return null; // no banner when at or above canon and nothing generated

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
  const accent = overbuilt ? "#9a6b00" : remaining > 0 ? "#102635" : "#1f6f3a";
  const tint = overbuilt ? "#FFFBE6" : remaining > 0 ? "#FFFBE6" : "#E8F4EC";
  const border = overbuilt ? "#FFD800" : remaining > 0 ? "#FFD800" : "rgba(31,111,58,0.35)";

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
        <div style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "#fff",
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          fontSize: 16,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
        }}>
          {completeness.currentCount}/{completeness.canonicalCount}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            {overbuilt ? "Flow may be overbuilt" : remaining > 0 ? "Flow is short of canon" : "Flow is at canon"}
          </div>
          <div style={{ fontSize: 14, color: "#1A1A1A", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
            {completeness.rationale}
          </div>
        </div>
      </div>

      {remaining > 0 && completeness.suggestedAdditions && completeness.suggestedAdditions.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#5a4500", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            Suggested additions
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {completeness.suggestedAdditions.slice(0, remaining).map((s) => (
              <li key={s.position} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#1A1A1A", fontFamily: "Arial, sans-serif", lineHeight: 1.55 }}>
                <span style={{ flexShrink: 0, padding: "2px 8px", background: "#102635", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", borderRadius: 3, marginTop: 2 }}>
                  E{s.position}
                </span>
                <span style={{ flex: 1 }}>
                  <strong style={{ color: "#102635" }}>{s.role}</strong>{" "}
                  <span style={{ color: "#5b5340" }}>· send at +{s.sendDelayHours}h</span><br />
                  <span style={{ color: "#1A1A1A" }}>{s.purpose}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {remaining > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => generate(remaining)}
            disabled={busy}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              background: busy ? "rgba(16,38,53,0.5)" : "#102635",
              color: "#fff",
              border: "1px solid #102635",
              borderRadius: 6,
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.02em",
            }}
          >
            {busy ? "Generating…" : `+ Generate ${remaining} missing email${remaining === 1 ? "" : "s"}`}
          </button>
          {remaining > 1 && !busy && (
            <button
              onClick={() => generate(1)}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                background: "transparent",
                color: accent,
                border: `1px solid ${border}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
            >
              Or just 1
            </button>
          )}
          <span style={{ fontSize: 11, color: "#5b5340", fontFamily: "Arial, sans-serif" }}>
            Inter typography · voice-matched to your rewrites · Opus 4.7 with thinking
          </span>
        </div>
      )}

      {busy && <MiniReviewLoader label={`drafting ${remaining} new email${remaining === 1 ? "" : "s"}`} detail="MATCHING VOICE" engine="opus 4.7 · with thinking" />}
      {error && <div style={{ padding: "8px 12px", background: "rgba(176, 65, 62, 0.08)", border: "1px solid rgba(176, 65, 62, 0.3)", borderRadius: 6, fontSize: 12, color: "#B0413E" }}>{error}</div>}
    </section>
  );
}
