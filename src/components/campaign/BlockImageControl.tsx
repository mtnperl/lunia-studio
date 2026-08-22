"use client";
// The picture on a block that owns its own image (imagetext, imagebullets,
// headerimage) or on one grid cell.
//
// Deliberately NOT the asset-picker/slot machinery ImageSlotControl drives:
// those images live in content.images and are placed by index, while these
// travel with the block, so moving, duplicating or banking the block as a
// snippet carries the picture along.
//
// Generation is always an explicit click, never automatic — the same rule
// ImageSlotControl follows, so adding a block never silently spends a
// generation.
import { useState } from "react";
import { Spinner } from "./Loaders";

export default function BlockImageControl({
  imageUrl,
  imagePrompt,
  aspect,
  topic,
  suggestPrompt,
  onChange,
  compact = false,
}: {
  imageUrl?: string;
  imagePrompt?: string;
  aspect: "1:1" | "4:5" | "16:9";
  topic: string;
  /** Text from the block used to seed the prompt when it is empty, so the
   *  button is useful before the user has written a prompt themselves. */
  suggestPrompt: () => string;
  onChange: (patch: { imageUrl?: string; imagePrompt?: string }) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectivePrompt = (imagePrompt ?? "").trim() || suggestPrompt().trim();

  async function generate() {
    if (busy || !effectivePrompt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, aspect, topic, role: "secondary" }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Image generation failed");
        return;
      }
      // Persist the prompt that produced it, so regenerating is one click and
      // the user can edit rather than retype.
      onChange({ imageUrl: data.url as string, imagePrompt: effectivePrompt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "6px 8px", borderRadius: 5, fontSize: 12,
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const btn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 9px",
    borderRadius: 5, fontSize: 11, fontFamily: "inherit", cursor: effectivePrompt ? "pointer" : "not-allowed",
    border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)",
    opacity: effectivePrompt ? 1 : 0.5,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <input
          type="text"
          value={imageUrl ?? ""}
          onChange={(e) => onChange({ imageUrl: e.target.value })}
          placeholder="Image URL, or generate one"
          style={{ ...input, flex: 1 }}
        />
        {imageUrl?.trim() && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)", flexShrink: 0 }} />
        )}
      </div>
      {!compact && (
        <textarea
          value={imagePrompt ?? ""}
          onChange={(e) => onChange({ imagePrompt: e.target.value })}
          rows={2}
          placeholder={suggestPrompt().trim() ? `Prompt (defaults to: ${suggestPrompt().trim().slice(0, 44)}…)` : "Image prompt"}
          title="Written from this email's copy. Edit it, then press Generate."
          style={{ ...input, resize: "vertical", lineHeight: 1.45 }}
        />
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={generate}
          disabled={busy || !effectivePrompt}
          style={btn}
          title={effectivePrompt ? `Generate from: ${effectivePrompt.slice(0, 120)}` : "Write some copy or a prompt first"}
        >
          {busy && <Spinner size={9} color="var(--text)" />}
          {busy ? "Generating…" : imageUrl?.trim() ? "Regenerate" : "Generate image"}
        </button>
        {imageUrl?.trim() && (
          <button type="button" onClick={() => onChange({ imageUrl: "" })} style={{ ...btn, opacity: 1, cursor: "pointer" }} title="Remove the image">
            Clear
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: "var(--error)" }}>{error}</div>}
    </div>
  );
}
