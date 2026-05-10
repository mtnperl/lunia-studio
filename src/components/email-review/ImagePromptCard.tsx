"use client";
import { useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import type { FlowReviewImageEngine, FlowReviewImagePrompt } from "@/lib/types";

type Props = {
  reviewId: string;
  prompt: FlowReviewImagePrompt;
  onUpdate: (next: FlowReviewImagePrompt) => void;
};

export default function ImagePromptCard({ reviewId, prompt, onUpdate }: Props) {
  const [busy, setBusy] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [userComment, setUserComment] = useState("");

  async function generate(engineOverride?: FlowReviewImageEngine, promptOverride?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/email-review/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, promptId: prompt.id, engineOverride, promptOverride }),
      });
      const data = await res.json();
      if (!res.ok || !data.prompt) {
        onUpdate({ ...prompt, status: "error", errorMessage: data.error ?? `${res.status}` });
        return;
      }
      onUpdate(data.prompt as FlowReviewImagePrompt);
    } catch (err) {
      onUpdate({ ...prompt, status: "error", errorMessage: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  }

  async function loadRegenSuggestions() {
    setRegenLoading(true);
    setRegenError(null);
    try {
      const res = await fetch("/api/email-review/regen-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, promptId: prompt.id, userComment }),
      });
      const data = await res.json();
      if (!res.ok || !data.suggestions) {
        setRegenError(data.error ?? `${res.status}`);
        return;
      }
      onUpdate({ ...prompt, regenSuggestions: data.suggestions });
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegenLoading(false);
    }
  }

  return (
    <article style={{ background: "#F5F2EC", border: "1px solid #d6cfbe", borderLeft: "4px solid #102635", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ padding: "2px 8px", background: "#102635", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 4 }}>
            {prompt.engine}
          </span>
          <span style={{ fontSize: 11, color: "#5b5340", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {prompt.placement.replace(/_/g, " ")} · {prompt.aspect}
          </span>
          {prompt.status === "ready" && <span style={{ fontSize: 10, color: "#1f6f3a", fontWeight: 700 }}>READY</span>}
          {prompt.status === "generating" && <span style={{ fontSize: 10, color: "#9a6b00", fontWeight: 700 }}>GENERATING…</span>}
          {prompt.status === "error" && <span style={{ fontSize: 10, color: "#B0413E", fontWeight: 700 }}>ERROR</span>}
        </div>
        <CopyButton text={prompt.prompt} label="Copy prompt" />
      </div>

      {prompt.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prompt.imageUrl} alt="" style={{ width: "100%", borderRadius: 6, border: "1px solid #d6cfbe", maxHeight: 400, objectFit: "cover" }} />
      )}

      <pre style={{ margin: 0, padding: 12, background: "#fff", border: "1px solid #e8e2d2", borderRadius: 6, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.55, color: "#1A1A1A", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 240, overflow: "auto" }}>
        {prompt.prompt}
      </pre>

      {prompt.errorMessage && (
        <div style={{ padding: "8px 12px", background: "rgba(176, 65, 62, 0.08)", border: "1px solid rgba(176, 65, 62, 0.3)", borderRadius: 6, fontSize: 12, color: "#B0413E" }}>
          {prompt.errorMessage}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => generate()}
          disabled={busy || prompt.status === "generating"}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            background: "#102635",
            color: "#fff",
            border: "1px solid #102635",
            borderRadius: 5,
            cursor: busy || prompt.status === "generating" ? "wait" : "pointer",
            fontFamily: "inherit",
            opacity: busy || prompt.status === "generating" ? 0.6 : 1,
          }}
        >
          {prompt.imageUrl ? "↺ Re-render this prompt" : "Generate image"}
        </button>
        {prompt.imageUrl && (
          <button
            onClick={() => setShowRegen((v) => !v)}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              background: showRegen ? "rgba(0,0,0,0.05)" : "transparent",
              color: "#102635",
              border: "1px solid #102635",
              borderRadius: 5,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            🎲 Regenerate (3 alternative prompts)
          </button>
        )}
        {prompt.history && prompt.history.length > 0 && (
          <span style={{ alignSelf: "center", fontSize: 11, color: "#5b5340" }}>{prompt.history.length} prior render{prompt.history.length === 1 ? "" : "s"} kept</span>
        )}
      </div>

      {showRegen && (
        <div style={{ marginTop: 6, padding: 14, background: "#fff", border: "1px solid #e8e2d2", borderRadius: 6, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, color: "#5b5340", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>What to change (optional)</label>
            <input
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              placeholder="e.g. less product-focused, warmer light, woman holding the bottle"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 12,
                background: "#fff",
                border: "1px solid #d6cfbe",
                borderRadius: 5,
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={loadRegenSuggestions}
            disabled={regenLoading}
            style={{
              alignSelf: "flex-start",
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 700,
              background: "#102635",
              color: "#fff",
              border: "1px solid #102635",
              borderRadius: 5,
              cursor: regenLoading ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: regenLoading ? 0.6 : 1,
            }}
          >
            {regenLoading ? "Generating 3 suggestions…" : prompt.regenSuggestions ? "↺ Get 3 fresh suggestions" : "Get 3 alternative prompts →"}
          </button>
          {regenError && (
            <div style={{ padding: "6px 10px", background: "rgba(176, 65, 62, 0.08)", border: "1px solid rgba(176, 65, 62, 0.3)", borderRadius: 5, fontSize: 12, color: "#B0413E" }}>{regenError}</div>
          )}
          {prompt.regenSuggestions && prompt.regenSuggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {prompt.regenSuggestions.map((s, i) => (
                <div key={i} style={{ padding: 12, background: "#F5F2EC", border: "1px solid #d6cfbe", borderRadius: 5, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ padding: "2px 6px", background: "#102635", color: "#fff", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 3 }}>{s.engine}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#102635" }}>Alternative {i + 1}</span>
                    </div>
                    <button
                      onClick={() => generate(s.engine, s.prompt)}
                      style={{
                        padding: "5px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "#102635",
                        color: "#fff",
                        border: "1px solid #102635",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Render this →
                    </button>
                  </div>
                  {s.rationale && <div style={{ fontSize: 11, color: "#5b5340", fontStyle: "italic" }}>{s.rationale}</div>}
                  <pre style={{ margin: 0, padding: 8, background: "#fff", border: "1px solid #e8e2d2", borderRadius: 4, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, lineHeight: 1.5, color: "#1A1A1A", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 160, overflow: "auto" }}>{s.prompt}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
