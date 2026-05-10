"use client";
import { useEffect, useState } from "react";
import KlaviyoFlowPicker from "@/components/email-review/KlaviyoFlowPicker";
import FlowUploadStep from "@/components/email-review/FlowUploadStep";
import ReviewSectionCard from "@/components/email-review/ReviewSectionCard";
import FlowImagesGrid from "@/components/email-review/FlowImagesGrid";
import CopyButton from "@/components/email-review/CopyButton";
import KlaviyoPushButton from "@/components/email-review/KlaviyoPushButton";
import ExportDocxButton from "@/components/email-review/ExportDocxButton";
import { AnalyzeLoader } from "@/components/email-review/ReviewLoaders";
import type { EmailFlow, SavedFlowReview } from "@/lib/types";

type Mode = "input" | "running" | "review";

type Props = {
  initialFlow?: EmailFlow | null;
  onConsumed?: () => void;
};

const SECTION_ORDER: SavedFlowReview["sections"][number]["key"][] = [
  "headline", "timing", "subjects", "rewrites", "design", "strategy",
];

export default function EmailReviewView({ initialFlow, onConsumed }: Props) {
  const [mode, setMode] = useState<Mode>("input");
  const [flow, setFlow] = useState<EmailFlow | null>(initialFlow ?? null);
  const [review, setReview] = useState<SavedFlowReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [showInputType, setShowInputType] = useState<"choose" | "klaviyo" | "upload">("choose");

  // Auto-pick the appropriate input mode if a flow was handed in by the
  // parent (e.g. clicking a Klaviyo-loaded flow from the EmailFlowsLibrary).
  useEffect(() => {
    if (initialFlow) {
      setFlow(initialFlow);
      // Klaviyo flows arrive with emails populated → run analyze. Upload flows
      // come in with empty emails → drop user into the upload form prefilled.
      if (initialFlow.source === "upload" && initialFlow.emails.length === 0) {
        setShowInputType("upload");
      } else {
        setShowInputType("choose");
        // Auto-run analyze for Klaviyo flows
        runAnalyze(initialFlow);
      }
      onConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFlow]);

  async function runAnalyze(f: EmailFlow) {
    setMode("running");
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/email-review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: f }),
      });
      const data = await res.json();
      if (!res.ok || !data.review) {
        setError(data.error ?? `${res.status}`);
        setMode("input");
        return;
      }
      setReview(data.review as SavedFlowReview);
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMode("input");
    } finally {
      setRunning(false);
    }
  }

  async function copyEntire() {
    if (!review) return "";
    const res = await fetch("/api/email-review/copy-payload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: review.id, format: "markdown" }),
    });
    const data = await res.json();
    return data.payload ?? "";
  }

  if (mode === "input") {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 32px 80px", display: "flex", flexDirection: "column", gap: 20 }}>
        <header>
          <h1 style={{ fontFamily: "var(--font-ui, Inter)", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: "var(--text)" }}>Email flow review</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Pull a flow from Klaviyo or upload one manually. The review runs the framework&apos;s 6 sections, lints brand voice, and drafts replacement images.
          </p>
        </header>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(184, 92, 92, 0.08)", border: "1px solid rgba(184, 92, 92, 0.3)", borderRadius: 8, fontSize: 13, color: "var(--error)" }}>{error}</div>
        )}

        {showInputType === "choose" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button
              onClick={() => setShowInputType("klaviyo")}
              style={inputCardStyle}
            >
              <span style={cardKickerStyle}>Klaviyo</span>
              <span style={cardTitleStyle}>Pick a flow from Klaviyo →</span>
              <span style={cardSubStyle}>Browse + select. We pull every email + send delay automatically.</span>
            </button>
            <button
              onClick={() => setShowInputType("upload")}
              style={inputCardStyle}
            >
              <span style={cardKickerStyle}>Upload</span>
              <span style={cardTitleStyle}>Paste an email flow manually →</span>
              <span style={cardSubStyle}>Use this if Klaviyo isn&apos;t connected, or for a flow you&apos;re drafting.</span>
            </button>
          </div>
        )}

        {showInputType === "klaviyo" && (
          <KlaviyoFlowPicker
            onPicked={(f) => { setFlow(f); runAnalyze(f); }}
            onCancel={() => setShowInputType("choose")}
          />
        )}

        {showInputType === "upload" && (
          <FlowUploadStep
            onSubmit={(f) => { setFlow(f); runAnalyze(f); }}
            onCancel={() => setShowInputType("choose")}
          />
        )}
      </div>
    );
  }

  if (mode === "running") {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 32px 80px" }}>
        <AnalyzeLoader
          flowName={flow?.flowName ?? "(loading)"}
          emailCount={flow?.emails.length ?? 0}
          frameworkVersion="v1.0"
        />
        {running && (
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "var(--subtle)", fontFamily: "'Courier New', Courier, monospace", letterSpacing: "0.08em" }}>
            sonnet 4.6 with thinking · ~30-60s typical · ~120s max
          </div>
        )}
      </div>
    );
  }

  // mode === "review"
  if (!review) return null;
  const sections = SECTION_ORDER.map((k) => review.sections.find((s) => s.key === k)).filter(Boolean) as SavedFlowReview["sections"];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px 80px", display: "flex", flexDirection: "column", gap: 22 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Lunia email flow review · framework {review.frameworkVersion}
          </div>
          <h1 style={{ fontFamily: "Arial, sans-serif", fontSize: 28, fontWeight: 700, margin: "4px 0 0", color: "#102635", letterSpacing: "-0.01em" }}>
            {review.flow.flowName}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
            {review.flow.flowType.replace(/_/g, " ")} · {review.flow.source} · {review.flow.emails.length} emails · {new Date(review.createdAt).toLocaleString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <CopyButton text={copyEntire} label="Copy entire review" size="md" variant="outline" />
          <ExportDocxButton reviewId={review.id} flowName={review.flow.flowName} />
          <button
            onClick={() => { setMode("input"); setReview(null); setShowInputType("choose"); }}
            style={{ padding: "7px 14px", fontSize: 12, background: "transparent", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
          >
            ← New review
          </button>
        </div>
      </header>

      <section style={{ background: "#102635", color: "#fff", borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#BFFBF8", letterSpacing: "0.08em", textTransform: "uppercase" }}>If you only do three things</div>
        <ol style={{ margin: "12px 0 0", paddingLeft: 22, fontFamily: "Arial, sans-serif", fontSize: 14, lineHeight: 1.55 }}>
          {review.ifYouOnlyDoThree.map((item, i) => (
            <li key={i} style={{ marginBottom: 8 }}>{item}</li>
          ))}
        </ol>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sections.map((s) => (
          <ReviewSectionCard key={s.key} section={s} />
        ))}
      </div>

      <FlowImagesGrid review={review} onReviewUpdate={setReview} />

      {/* Per-email Klaviyo writeback row — only meaningful for Klaviyo-sourced flows */}
      {review.flow.source === "klaviyo" && (
        <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontFamily: "Arial, sans-serif", fontSize: 18, fontWeight: 700, color: "#102635" }}>
            Push rewrites to Klaviyo
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Each push clones the source template and swaps it onto the flow message as a draft. You publish manually in Klaviyo.
            Works with a full-access <code style={{ background: "var(--surface-r)", padding: "1px 5px", borderRadius: 3 }}>KLAVIYO_API_KEY</code>; or set a separate <code style={{ background: "var(--surface-r)", padding: "1px 5px", borderRadius: 3 }}>KLAVIYO_API_KEY_WRITE</code> if you want write capability isolated.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {review.flow.emails.map((email, i) => (
              <div key={email.id} style={{ background: "var(--surface-r)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Email {i + 1} — {email.subject || "(no subject)"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <KlaviyoPushButton reviewId={review.id} emailId={email.id} sourceTemplateId={email.id} target="body" contentVersion="A" bodyHtml={email.html} label={`Push body Version A`} />
                  <KlaviyoPushButton reviewId={review.id} emailId={email.id} sourceTemplateId={email.id} target="body" contentVersion="B" bodyHtml={email.html} label={`Push body Version B`} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const inputCardStyle: React.CSSProperties = {
  padding: "22px 24px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const cardKickerStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--accent)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "var(--text)",
};

const cardSubStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--muted)",
};
