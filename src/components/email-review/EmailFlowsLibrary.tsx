"use client";
import { useEffect, useState } from "react";
import KlaviyoFlowPicker from "@/components/email-review/KlaviyoFlowPicker";
import type { EmailFlow } from "@/lib/types";

type ReviewSummary = {
  id: string;
  flowId: string;
  flowName: string;
  flowType: string;
  source: "klaviyo" | "upload";
  emailCount: number;
  complianceFlagCount: number;
  imagesReady: number;
  imagesTotal: number;
  frameworkVersion: string;
  writebacksCount: number;
  createdAt: string;
};

type Props = {
  onPickFlow: (flow: EmailFlow) => void;
  onPickReview?: (reviewId: string) => void;
};

export default function EmailFlowsLibrary({ onPickFlow, onPickReview }: Props) {
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/email-review/library")
      .then((r) => r.json())
      .then((d) => alive && setReviews(d.reviews ?? []))
      .catch(() => alive && setReviews([]));
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-ui, Inter)", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--text)" }}>
            Email flows
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Pull a flow from Klaviyo or open one of your saved reviews. The framework runs the same 6-section review on either source.
          </p>
        </div>
      </header>

      {showPicker ? (
        <KlaviyoFlowPicker
          onPicked={(flow) => { setShowPicker(false); onPickFlow(flow); }}
          onCancel={() => setShowPicker(false)}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Klaviyo</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Pull a flow from Klaviyo →</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Browse every flow + recent campaign with the read API key.</span>
          </button>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onPickFlow({ id: `upload-${Date.now()}`, source: "upload", flowType: "abandoned_checkout", flowName: "", trigger: "", emails: [], fetchedAt: new Date().toISOString() }); }}
            style={{
              padding: "20px 22px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Upload</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Paste an email flow manually →</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Use this if Klaviyo isn&apos;t connected, or for a flow you&apos;re drafting.</span>
          </a>
        </div>
      )}

      <section>
        <h2 style={{ fontFamily: "var(--font-ui, Inter)", fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "var(--text)" }}>
          Saved reviews
        </h2>
        {reviews === null ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: 24, background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 10, fontSize: 13, color: "var(--subtle)", textAlign: "center" }}>
            No saved reviews yet. Run one from above.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {reviews.map((r) => (
              <button
                key={r.id}
                onClick={() => onPickReview?.(r.id)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, wordBreak: "break-word" }}>{r.flowName || "(unnamed flow)"}</div>
                <div style={{ fontSize: 11, color: "var(--subtle)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{r.flowType.replace(/_/g, " ")}</span>
                  <span>· {r.source}</span>
                  <span>· {r.emailCount} email{r.emailCount === 1 ? "" : "s"}</span>
                </div>
                <div style={{ fontSize: 11, color: r.complianceFlagCount > 0 ? "var(--error)" : "var(--subtle)" }}>
                  {r.complianceFlagCount > 0 ? `${r.complianceFlagCount} compliance flag${r.complianceFlagCount === 1 ? "" : "s"}` : "No compliance flags"}
                  · {r.imagesReady}/{r.imagesTotal} images ready
                  {r.writebacksCount > 0 && ` · ${r.writebacksCount} writeback${r.writebacksCount === 1 ? "" : "s"}`}
                </div>
                <div style={{ fontSize: 10, color: "var(--subtle)", marginTop: "auto" }}>{new Date(r.createdAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
