"use client";
import { useConfirm } from "@/components/ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

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
  /** Open a saved review by id. */
  onPickReview: (reviewId: string) => void;
  /** Send the user to the input flow to start a new review. */
  onNewReview?: () => void;
};

export default function EmailFlowsLibrary({ onPickReview, onNewReview }: Props) {
  const confirm = useConfirm();
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/email-review/library")
      .then((r) => r.json())
      .then((d) => alive && setReviews(d.reviews ?? []))
      .catch(() => alive && setReviews([]));
    return () => { alive = false; };
  }, []);

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Delete this saved review?", description: "This cannot be undone.", confirmLabel: "Delete", tone: "danger" }))) return;
    setDeleting(id);
    try {
      await fetch(`/api/email-review/${id}`, { method: "DELETE" });
      setReviews((prev) => (prev ?? []).filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "var(--ui-tracking-tight)", color: "var(--ui-text)" }}>
            Saved flow reviews
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Every review you&apos;ve run on a Klaviyo flow or uploaded one. Click any row to reopen — sections, image prompts, and Klaviyo writeback history are all preserved.
          </p>
        </div>
        {onNewReview && (
          <Button variant="primary" size="md" onClick={onNewReview}>
            + Run a new review
          </Button>
        )}
      </header>

      {reviews === null ? (
        <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>
      ) : reviews.length === 0 ? (
        <div style={{ padding: 36, background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 12, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600 }}>No saved reviews yet</div>
          <div style={{ fontSize: 12, color: "var(--subtle)", maxWidth: 420, lineHeight: 1.5 }}>
            Head to <strong>Flow reviews</strong> in the sidebar to run your first review — either from a Klaviyo flow or by uploading one manually.
          </div>
          {onNewReview && (
            <Button variant="primary" size="md" onClick={onNewReview}>
              Run a new review →
            </Button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
              }}
            >
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                title="Delete this saved review"
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 22,
                  height: 22,
                  padding: 0,
                  fontSize: 13,
                  background: "transparent",
                  color: "var(--subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  cursor: deleting === r.id ? "wait" : "pointer",
                  lineHeight: 1,
                  fontFamily: "inherit",
                  zIndex: 1,
                }}
              >
                ×
              </button>
              <button
                onClick={() => onPickReview(r.id)}
                style={{
                  textAlign: "left",
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3, wordBreak: "break-word", paddingRight: 30 }}>
                  {r.flowName || "(unnamed flow)"}
                </div>
                <div style={{ fontSize: 11, color: "var(--subtle)", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ textTransform: "uppercase", letterSpacing: "var(--ui-tracking-caps)", fontWeight: 600 }}>{r.flowType.replace(/_/g, " ")}</span>
                  <span>· {r.source}</span>
                  <span>· {r.emailCount} email{r.emailCount === 1 ? "" : "s"}</span>
                </div>
                <div style={{ fontSize: 11, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Pill color={r.complianceFlagCount > 0 ? "error" : "neutral"}>
                    {r.complianceFlagCount > 0 ? `${r.complianceFlagCount} compliance flag${r.complianceFlagCount === 1 ? "" : "s"}` : "No flags"}
                  </Pill>
                  <Pill color={r.imagesReady === r.imagesTotal && r.imagesTotal > 0 ? "success" : "neutral"}>
                    {r.imagesReady}/{r.imagesTotal} images
                  </Pill>
                  {r.writebacksCount > 0 && <Pill color="accent">{r.writebacksCount} pushed</Pill>}
                </div>
                <div style={{ fontSize: 11, color: "var(--subtle)", marginTop: "auto" }}>{new Date(r.createdAt).toLocaleString()}</div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: "error" | "success" | "accent" | "neutral" }) {
  const bg =
    color === "error"   ? "var(--ui-danger-tint)"
  : color === "success" ? "var(--ui-success-tint)"
  : color === "accent"  ? "var(--ui-selection-tint)"
                        : "var(--surface-r)";
  const border =
    color === "error"   ? "transparent"
  : color === "success" ? "transparent"
  : color === "accent"  ? "transparent"
                        : "var(--border)";
  const fg =
    color === "error"   ? "var(--ui-danger)"
  : color === "success" ? "var(--ui-success)"
  : color === "accent"  ? "var(--ui-text)"
                        : "var(--muted)";
  return (
    <span style={{ padding: "2px 8px", borderRadius: "var(--ui-radius-1)", background: bg, border: `1px solid ${border}`, color: fg, fontSize: 11, fontWeight: 500 }}>
      {children}
    </span>
  );
}
