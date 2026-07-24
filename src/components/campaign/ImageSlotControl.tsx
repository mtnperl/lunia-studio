"use client";
import { useEffect, useRef, useState } from "react";
import type { CampaignImageSlot } from "@/lib/types";
import { VISUAL_MOODS } from "@/lib/carousel-visual-moods";
import AssetPicker from "./AssetPicker";
import { ImageGenStatus, Spinner } from "./Loaders";
import { AutoTextarea } from "@/components/ui/AutoTextarea";

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

// Small line icon — matches the SVG-icon chrome pattern used in CampaignEditor
// (DESIGN.md: no emoji in functional UI, elevation/affordance via 1px borders).
const IcTrash = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
  </svg>
);

export default function ImageSlotControl({
  slot,
  label,
  topic,
  emailContext,
  onChange,
  onGenerated,
  onRemove,
}: {
  slot: CampaignImageSlot;
  label: string;
  topic: string;
  /** The email's actual copy (subject + body) so regenerated image prompts
   *  reflect THIS email's message, not a generic scene. */
  emailContext?: string;
  onChange: (next: CampaignImageSlot) => void;
  /** Called immediately AFTER a successful generation with the new URL,
   *  BEFORE the onChange propagates. Lets the parent register the URL in
   *  the freshly-generated-URL lock so any subsequent state mutation that
   *  tries to revert the slot back to the previous asset URL is rejected. */
  onGenerated?: (url: string) => void;
  /** Remove this image slot entirely. When provided, a trash control shows
   *  in the slot header. Used to drop imported (or any) images. */
  onRemove?: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [regeneratingPrompt, setRegeneratingPrompt] = useState(false);
  // Seeding an email-relevant prompt while switching an asset slot → generated
  // (the "Generate new" affordance). Separate from regeneratingPrompt so the
  // asset-branch button shows its own spinner.
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep a live ref to the current slot so async handlers (generate /
  // regeneratePrompt) merge into the latest version of the slot, not the
  // snapshot they closed over when the click happened. Without this, any
  // parent re-render between click and response can clobber the result.
  const latestSlot = useRef(slot);
  useEffect(() => { latestSlot.current = slot; }, [slot]);

  // A generated slot always shows a ready-to-edit prompt — even one loaded
  // from an older save that has none.
  const effectivePrompt =
    slot.prompt?.trim()
      ? slot.prompt
      : slot.source === "generated" ? buildDefaultPrompt() : "";
  const activeMood = slot.mood ?? DEFAULT_MOOD;

  // Flip to generated — and make sure a prompt + mood are already in place.
  // Clear the previous asset metadata (assetId + url from a prior asset
  // pick) so the slot becomes unambiguously "generated" — otherwise the
  // old asset's URL lingers and can come back if the slot is reseeded.
  function switchToGenerated() {
    onChange({
      ...slot,
      source: "generated",
      prompt: slot.prompt?.trim() ? slot.prompt : buildDefaultPrompt(),
      mood: slot.mood ?? DEFAULT_MOOD,
      assetId: undefined,
      url: null,
    });
  }

  // Flip to upload — clear prior asset/generated metadata so the slot is
  // unambiguously waiting on a fresh file pick.
  function switchToUpload() {
    onChange({
      ...slot,
      source: "upload",
      assetId: undefined,
      url: null,
    });
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/campaign/upload-temp-image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange({ ...latestSlot.current, source: "upload", assetId: undefined, url: data.url });
    } catch {
      setError("Network error, please try again");
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (file) uploadFile(file);
  }

  async function regeneratePrompt() {
    if (regeneratingPrompt) return;
    setRegeneratingPrompt(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/regenerate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, role: slot.role, currentPrompt: effectivePrompt, emailContext }),
      });
      const data = await res.json();
      if (!res.ok || !data.prompt) {
        setError(data.error ?? "Could not rewrite the prompt");
        return;
      }
      // Merge into the LATEST slot, not the one captured at click time.
      onChange({ ...latestSlot.current, prompt: data.prompt });
    } catch {
      setError("Network error, please try again");
    } finally {
      setRegeneratingPrompt(false);
    }
  }

  // "Generate new" from an asset slot: switch the slot to generated mode and
  // seed a prompt drawn from THIS email's copy (same regenerate-prompt →
  // gpt-image-2 pipeline as the rest of the builder), then stop so the user can
  // review/tweak before hitting Generate. Never auto-spends a generation.
  async function generateNew() {
    if (seeding) return;
    setSeeding(true);
    setError(null);
    let prompt = buildDefaultPrompt();
    try {
      const res = await fetch("/api/campaign/regenerate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, role: slot.role, currentPrompt: prompt, emailContext }),
      });
      const data = await res.json();
      if (res.ok && data.prompt) {
        prompt = data.prompt;
      } else {
        setError("Couldn't draft a prompt from the email — starting from a default one.");
      }
    } catch {
      setError("Network error drafting the prompt — starting from a default one.");
    } finally {
      // Regardless of prompt-draft success, flip to generated with a ready prompt
      // and clear the asset so the slot is unambiguously a fresh generation.
      onChange({
        ...latestSlot.current,
        source: "generated",
        prompt,
        mood: latestSlot.current.mood ?? DEFAULT_MOOD,
        assetId: undefined,
        url: null,
      });
      setSeeding(false);
    }
  }

  async function generate() {
    if (generating || !effectivePrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: effectivePrompt,
          aspect: slot.aspect,
          mood: activeMood,
          // Sent purely so the auto-registered asset gets a useful name in
          // the picker — not used by image generation itself.
          topic,
          role: slot.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Image generation failed");
        return;
      }
      // Register the new URL in the parent's per-slot lock FIRST so any
      // subsequent onChange that tries to silently revert the slot back to
      // an asset URL gets caught by the firewall in CampaignEditor.updateImage.
      onGenerated?.(data.url);
      // Merge into the LATEST slot (not the closure snapshot from click time)
      // and strip any leftover asset metadata so the slot is unambiguously
      // a fresh generated image.
      onChange({
        ...latestSlot.current,
        source: "generated",
        prompt: effectivePrompt,
        url: data.url,
        assetId: undefined,
      });
    } catch {
      setError("Network error, please try again");
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
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button style={miniBtn(slot.source === "generated")} onClick={switchToGenerated}>Generated</button>
          <button style={miniBtn(slot.source === "asset")}
            onClick={() => onChange({ ...slot, source: "asset" })}>Asset</button>
          <button style={miniBtn(slot.source === "upload")} onClick={switchToUpload}>Upload</button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Remove this image"
              aria-label="Remove this image"
              style={{
                marginLeft: 2, width: 26, height: 24, display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                border: "1px solid var(--border)", borderRadius: 5,
                background: "transparent", color: "var(--muted)",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <IcTrash />
            </button>
          )}
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
              ? <img key={slot.url} src={slot.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 9, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>No image</span>}
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {slot.source === "generated" ? (
              <>
                <AutoTextarea
                  value={effectivePrompt}
                  onChange={(e) => onChange({ ...slot, prompt: e.target.value })}
                  minHeight={60}
                  placeholder="Lifestyle scene — no text, no bottle, no logo"
                  style={{
                    width: "100%", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45,
                    fontFamily: "inherit", color: "var(--text)", padding: "6px 8px",
                    borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)",
                  }}
                />
                {/* Rewrite the prompt with AI, based on the email topic */}
                <button
                  onClick={regeneratePrompt}
                  disabled={regeneratingPrompt}
                  style={{
                    marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--muted)", borderRadius: 5, fontFamily: "inherit",
                    cursor: regeneratingPrompt ? "wait" : "pointer",
                  }}
                >
                  {regeneratingPrompt && <Spinner size={10} />}
                  {regeneratingPrompt ? "Writing prompt…" : "↻ Regenerate prompt"}
                </button>
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
            ) : slot.source === "upload" ? (
              <>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 6px", lineHeight: 1.45 }}>
                  Temporary — used for this email only, not saved to your asset library. Expires after 7 days.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelected}
                  style={{ display: "none" }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      ...miniBtn(false),
                      cursor: uploading ? "wait" : "pointer",
                    }}
                  >
                    {uploading && <Spinner size={10} />}
                    {uploading ? "Uploading…" : slot.url ? "Replace image" : "Choose file"}
                  </button>
                  <button
                    onClick={generateNew}
                    disabled={seeding}
                    title="Draft a prompt from this email and switch to a fresh AI-generated image"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 9px", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--muted)", borderRadius: 5, fontFamily: "inherit",
                      cursor: seeding ? "wait" : "pointer",
                    }}
                  >
                    {seeding && <Spinner size={10} />}
                    {seeding ? "Drafting…" : "Generate new"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 6px", lineHeight: 1.45 }}>
                  Uses an uploaded or imported image. Swap for another asset, or generate a new one from this email.
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={miniBtn(false)} onClick={() => setPickerOpen((v) => !v)}>
                    {slot.url ? "Swap asset" : "Choose asset"}
                  </button>
                  <button
                    onClick={generateNew}
                    disabled={seeding}
                    title="Draft a prompt from this email and switch to a fresh AI-generated image"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 9px", fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--muted)", borderRadius: 5, fontFamily: "inherit",
                      cursor: seeding ? "wait" : "pointer",
                    }}
                  >
                    {seeding && <Spinner size={10} />}
                    {seeding ? "Drafting…" : "Generate new"}
                  </button>
                </div>
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
