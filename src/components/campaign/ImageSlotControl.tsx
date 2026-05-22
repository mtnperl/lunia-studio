"use client";
import { useState } from "react";
import type { CampaignImageSlot } from "@/lib/types";
import AssetPicker from "./AssetPicker";
import { Spinner, ImageGenStatus } from "./Loaders";

const miniBtn = (active = false): React.CSSProperties => ({
  padding: "4px 9px", fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--accent)" : "var(--muted)",
  borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
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

  async function generate() {
    if (generating || !slot.prompt?.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: slot.prompt, aspect: slot.aspect }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Image generation failed");
        return;
      }
      onChange({ ...slot, url: data.url });
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
          <button style={miniBtn(slot.source === "generated")}
            onClick={() => onChange({ ...slot, source: "generated" })}>Generated</button>
          <button style={miniBtn(slot.source === "asset")}
            onClick={() => onChange({ ...slot, source: "asset" })}>Asset</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {/* Thumbnail */}
        <div style={{
          width: 84, height: slot.aspect === "1:1" ? 84 : 105, flexShrink: 0,
          borderRadius: 6, overflow: "hidden", background: "var(--bg)",
          border: "1px solid var(--border)", position: "relative",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {slot.url
            ? <img src={slot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 9, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>No image</span>}
          {generating && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Spinner size={18} color="#fff" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {slot.source === "generated" ? (
            generating ? (
              <ImageGenStatus />
            ) : (
              <>
                <textarea
                  value={slot.prompt ?? ""}
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
                <button
                  onClick={generate}
                  disabled={!slot.prompt?.trim()}
                  style={{
                    marginTop: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700,
                    background: "var(--accent)", color: "var(--bg)", border: "none",
                    borderRadius: 5, fontFamily: "inherit",
                    cursor: !slot.prompt?.trim() ? "not-allowed" : "pointer",
                    opacity: !slot.prompt?.trim() ? 0.55 : 1,
                  }}
                >
                  {slot.url ? "Regenerate" : "Generate image"}
                </button>
              </>
            )
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

      {slot.source === "asset" && pickerOpen && (
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
