"use client";
import { useState } from "react";
import type { CampaignImageSlot } from "@/lib/types";
import { VISUAL_MOODS } from "@/lib/carousel-visual-moods";
import AssetPicker from "./AssetPicker";
import { ImageGenStatus } from "./Loaders";

const DEFAULT_MOOD = "lifestyle-health";

/** A ready-to-edit prompt so switching to "Generated" never lands on a blank
 *  box. Lifestyle scene only — text / bottle / logo are excluded server-side. */
function buildDefaultPrompt(): string {
  return "A calm, photoreal wellness lifestyle scene — a serene bedroom in soft morning light, warm neutral linens, a quiet restful mood.";
}

const miniBtn = (active = false): React.CSSProperties => ({
  padding: "4px 9px", fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--accent)" : "var(--muted)",
  borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
});

const moodChip = (active: boolean): React.CSSProperties => ({
  padding: "3px 8px", fontSize: 10, fontWeight: active ? 700 : 500,
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--accent)" : "var(--muted)",
  borderRadius: 20, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
});

export default function ImageSlotControl({
  slot,
  label,
  onChange,
}: {
  slot: CampaignImageSlot;
  label: string;
  onChange: (next: CampaignImageSlot) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // A generated slot always shows a ready-to-edit prompt — even one loaded
  // from an older save that has none.
  const effectivePrompt =
    slot.prompt?.trim()
      ? slot.prompt
      : slot.source === "generated" ? buildDefaultPrompt() : "";
  const activeMood = slot.mood ?? DEFAULT_MOOD;

  // Flip to generated — and make sure a prompt + mood are already in place.
  function switchToGenerated() {
    onChange({
      ...slot,
      source: "generated",
      prompt: slot.prompt?.trim() ? slot.prompt : buildDefaultPrompt(),
      mood: slot.mood ?? DEFAULT_MOOD,
    });
  }

  async function generate() {
    if (generating || !effectivePrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, aspect: slot.aspect, mood: activeMood }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Image generation failed");
        return;
      }
      onChange({ ...slot, prompt: effectivePrompt, url: data.url });
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={miniBtn(slot.source === "generated")} onClick={switchToGenerated}>Generated</button>
          <button style={miniBtn(slot.source === "asset")}
            onClick={() => onChange({ ...slot, source: "asset" })}>Asset</button>
        </div>
      </div>

      {generating ? (
        <ImageGenStatus />
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          {/* Thumbnail */}
          <div style={{
            width: 84, height: slot.aspect === "1:1" ? 84 : 105, flexShrink: 0,
            borderRadius: 6, overflow: "hidden", background: "var(--bg)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {slot.url
              ? <img src={slot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 9, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>No image</span>}
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {slot.source === "generated" ? (
              <>
                <textarea
                  value={effectivePrompt}
                  onChange={(e) => onChange({ ...slot, prompt: e.target.value })}
                  rows={3}
                  placeholder="Lifestyle scene — no text, no bottle, no logo"
                  style={{
                    width: "100%", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45,
                    fontFamily: "inherit", color: "var(--text)", padding: "6px 8px",
                    borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)",
                    resize: "vertical",
                  }}
                />
                {/* Visual mood — the carousel v2 style list, shown as chips */}
                <div style={{ marginTop: 7 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Visual mood
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {VISUAL_MOODS.map((m) => (
                      <button key={m.id} style={moodChip(activeMood === m.id)}
                        onClick={() => onChange({ ...slot, mood: m.id })}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={generate}
                  disabled={!effectivePrompt.trim()}
                  style={{
                    marginTop: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700,
                    background: "var(--accent)", color: "var(--bg)", border: "none",
                    borderRadius: 5, fontFamily: "inherit",
                    cursor: !effectivePrompt.trim() ? "not-allowed" : "pointer",
                    opacity: !effectivePrompt.trim() ? 0.55 : 1,
                  }}
                >
                  {slot.url ? "Regenerate" : "Generate image"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 6px", lineHeight: 1.45 }}>
                  Uses an uploaded asset (bottle / logo / product). Never AI-generated.
                </p>
                <button style={miniBtn(false)} onClick={() => setPickerOpen((v) => !v)}>
                  {slot.url ? "Swap asset" : "Choose asset"}
                </button>
              </>
            )}
            {error && <p style={{ fontSize: 10, color: "var(--error)", margin: "6px 0 0" }}>{error}</p>}
          </div>
        </div>
      )}

      {slot.source === "asset" && pickerOpen && !generating && (
        <AssetPicker
          selectedId={slot.assetId}
          onClose={() => setPickerOpen(false)}
          onPick={(asset) => {
            onChange({ ...slot, assetId: asset.id, url: asset.url });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
