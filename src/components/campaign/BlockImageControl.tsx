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
import { useRef, useState } from "react";
import { Spinner } from "./Loaders";
import AssetPicker from "./AssetPicker";
import { MAX_UPLOAD_BYTES, fmtSize, needsShrinking, shrinkForUpload } from "@/lib/image-shrink";

/** Model tiers offered per block. Tiers rather than raw ids — see the
 *  `promptModel` note on CampaignBlock for why the id must not be persisted. */
const PROMPT_MODELS: { key: "draft" | "craft" | "content"; label: string; title: string }[] = [
  { key: "draft",   label: "Fast",  title: "Haiku — quickest and cheapest. Fine when the copy already says exactly what the picture should show." },
  { key: "craft",   label: "Craft", title: "Sonnet — the default, and what this button used before the chooser existed." },
  { key: "content", label: "Best",  title: "Opus — slowest and dearest. Worth it when the block's idea is abstract and the other tiers keep returning the brand's default bedroom." },
];

/** Models that DRAW the picture. Verified against live calls before being
 *  listed — the carousel engine's `fal-ai/flux-2/flex` 404s, so a slug sitting
 *  in a constant is not evidence the endpoint exists.
 *
 *  Kept to three. This is a chooser next to a Generate button, not a model
 *  catalogue, and the ones left out lost on looking real: Recraft reads as a
 *  film still, Ideogram lays a teal cast over everything. */
const IMAGE_MODELS: { key: string; label: string; title: string }[] = [
  { key: "gpt-image-2", label: "GPT",      title: "gpt-image-2 — the default. Cleanest and most controllable, and the only one here that can take reference images, but it has a house look that reads as AI on people." },
  { key: "flux-2",      label: "FLUX",     title: "FLUX.2 — the most photographic of the three, and the fastest. Best pick when the shot has a person in it." },
  { key: "seedream-5",  label: "Seedream", title: "Seedream 5 Lite — photographic like FLUX with a different eye; worth trying when FLUX keeps missing the scene. Slower." },
];

export default function BlockImageControl({
  imageUrl,
  imagePrompt,
  aspect,
  topic,
  suggestPrompt,
  onChange,
  compact = false,
  blockText,
  emailContext,
  promptModel,
  promptInstructions,
  imageModel,
  onSettingsChange,
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
  /** The copy this picture sits beside. Sent as the FOCUS when rewriting, so
   *  the scene is about this block rather than about the brand. */
  blockText?: string;
  /** The rest of the email, for context only. */
  emailContext?: string;
  /** Which model tier rewrites the prompt. Unset = "craft". */
  promptModel?: "draft" | "craft" | "content";
  /** Standing instructions fed into every rewrite for this block. */
  promptInstructions?: string;
  /** Which model draws the picture. Unset = gpt-image-2. */
  imageModel?: string;
  /** Persist the two settings above onto the block. Omitted by the grid
   *  cells, which share their parent block's settings rather than each
   *  carrying their own — four cells with four model choosers is a control
   *  panel, not an editor. */
  onSettingsChange?: (patch: { promptModel?: "draft" | "craft" | "content"; promptInstructions?: string; imageModel?: string }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [choosing, setChoosing] = useState(false);
  /** Why the model picked (or declined to pick) the last library image.
   *  Shown once, under the buttons — a choice you cannot see the reasoning
   *  for is just an image appearing by itself. */
  const [choiceNote, setChoiceNote] = useState<string | null>(null);

  /** Ask the model for a scene that actually depicts this block's copy. The
   *  offline writer composes from the copy verbatim, which keeps it tied to
   *  the email but reads like an instruction rather than a photograph; this is
   *  the escape hatch when that is not good enough. */
  async function rewritePrompt() {
    if (rewriting) return;
    setRewriting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/regenerate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          role: "secondary",
          focus: blockText ?? suggestPrompt(),
          emailContext,
          currentPrompt: imagePrompt ?? "",
          model: promptModel,
          instructions: promptInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.prompt) {
        setError(data.error ?? "Could not rewrite the prompt");
        return;
      }
      onChange({ imagePrompt: data.prompt as string });
    } catch {
      setError("Network error, please try again");
    } finally {
      setRewriting(false);
    }
  }

  /** Ask the model to pick a picture you already own rather than draw a new
   *  one. Same tier as the rewrite — a block set to Best gets Best for both,
   *  which is the setting the user already reasoned about. Generation is
   *  untouched and sits one button along; this only ever sets the image URL.
   */
  async function chooseFromLibrary() {
    if (choosing) return;
    setChoosing(true);
    setError(null);
    setChoiceNote(null);
    try {
      const res = await fetch("/api/campaign/choose-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          focus: blockText ?? suggestPrompt(),
          emailContext,
          model: promptModel,
          instructions: promptInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not choose an image");
        return;
      }
      if (!data.url) {
        // Not an error: the model looked and declined. Say so plainly so the
        // user knows the click did something and can generate instead.
        setChoiceNote(data.reason ? `No fit — ${data.reason}` : "Nothing in the library fits this block.");
        return;
      }
      onChange({ imageUrl: data.url as string });
      setChoiceNote(data.reason ? `Picked — ${data.reason}` : null);
    } catch {
      setError("Network error, please try again");
    } finally {
      setChoosing(false);
    }
  }

  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Same endpoint the hero/secondary slots use: the blob lands under temp/ and
  // is swept after a few days, so a one-off campaign photo never accumulates
  // in the permanent asset library.
  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    setChoiceNote(null);
    try {
      // A photo straight off a phone is usually past the limit, and the
      // failure it used to produce ("File too large") asked you to go and
      // resize it yourself for a picture that ends up a few hundred pixels
      // wide in an email. Shrink it here instead.
      let upload: Blob = file;
      let filename = file.name;
      if (needsShrinking(file)) {
        const shrunk = await shrinkForUpload(file);
        if (shrunk.blob.size < file.size) {
          upload = shrunk.blob;
          filename = shrunk.name;
          setChoiceNote(`${fmtSize(file.size)} photo resized to ${fmtSize(shrunk.blob.size)} before upload.`);
        }
        if (upload.size > MAX_UPLOAD_BYTES) {
          setError(`Could not get this under ${fmtSize(MAX_UPLOAD_BYTES)} (best was ${fmtSize(upload.size)}). Try exporting it smaller.`);
          return;
        }
      }

      const body = new FormData();
      body.append("file", upload, filename);
      const res = await fetch("/api/campaign/upload-temp-image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onChange({ imageUrl: data.url as string });
    } catch {
      setError("Network error, please try again");
    } finally {
      setUploading(false);
    }
  }

  const effectivePrompt = (imagePrompt ?? "").trim() || suggestPrompt().trim();

  async function generate() {
    if (busy || !effectivePrompt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt, aspect, topic, role: "secondary", imageModel }),
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
      {/* How the rewrite is done, not what the picture is. Sits directly above
          the button it changes, and only where the block owns the setting —
          the grid cells share their parent block's, so they render nothing
          here rather than four copies of the same two controls. */}
      {!compact && onSettingsChange && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* "Model" alone was ambiguous and read as the image model, which
                is the one anybody looking at a Generate button means. Both are
                named for what they actually produce. */}
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Writes prompt
            </span>
            <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 5, overflow: "hidden", background: "var(--bg)" }}>
              {PROMPT_MODELS.map((m, i) => {
                const active = (promptModel ?? "craft") === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onSettingsChange({ promptModel: m.key })}
                    title={m.title}
                    aria-pressed={active}
                    style={{
                      padding: "3px 9px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                      border: "none", borderRight: i === PROMPT_MODELS.length - 1 ? "none" : "1px solid var(--border)",
                      background: active ? "var(--accent-dim)" : "transparent",
                      color: active ? "var(--text)" : "var(--muted)",
                      cursor: "pointer", lineHeight: 1.6,
                    }}
                  >{m.label}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Draws image
            </span>
            <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 5, overflow: "hidden", background: "var(--bg)" }}>
              {IMAGE_MODELS.map((m, i) => {
                const active = (imageModel ?? "gpt-image-2") === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => onSettingsChange({ imageModel: m.key })}
                    title={m.title}
                    aria-pressed={active}
                    style={{
                      padding: "3px 9px", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                      border: "none", borderRight: i === IMAGE_MODELS.length - 1 ? "none" : "1px solid var(--border)",
                      background: active ? "var(--accent-dim)" : "transparent",
                      color: active ? "var(--text)" : "var(--muted)",
                      cursor: "pointer", lineHeight: 1.6,
                    }}
                  >{m.label}</button>
                );
              })}
            </div>
          </div>
          <textarea
            value={promptInstructions ?? ""}
            onChange={(e) => onSettingsChange({ promptInstructions: e.target.value })}
            rows={2}
            placeholder="Instructions for the rewrite — e.g. shot on film, no people, show the product in use"
            title="Kept on the block and applied every time you press Rewrite prompt. Does not change the prompt you have now — press Rewrite to use it."
            style={{ ...input, resize: "vertical", lineHeight: 1.45 }}
          />
        </div>
      )}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          style={{ ...btn, opacity: 1, cursor: "pointer" }}
          title="Pick an image already in your asset library"
        >Library</button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ ...btn, opacity: uploading ? 0.5 : 1, cursor: uploading ? "wait" : "pointer" }}
          title="Upload a photo from this device"
        >
          {uploading && <Spinner size={9} color="var(--text)" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            // Reset first, so picking the same file twice still fires onChange.
            e.target.value = "";
            if (f) void uploadFile(f);
          }}
        />
        <button
          type="button"
          onClick={rewritePrompt}
          disabled={rewriting}
          style={{ ...btn, opacity: rewriting ? 0.5 : 1, cursor: rewriting ? "wait" : "pointer" }}
          title="Rewrite the prompt so the photo depicts what THIS block says, rather than the brand in general"
        >
          {rewriting && <Spinner size={9} color="var(--text)" />}
          {rewriting ? "Writing…" : "✨ Rewrite prompt"}
        </button>
        <button
          type="button"
          onClick={chooseFromLibrary}
          disabled={choosing}
          style={{ ...btn, opacity: choosing ? 0.5 : 1, cursor: choosing ? "wait" : "pointer" }}
          title="Let the model pick an image from your library that matches this block, instead of generating a new one"
        >
          {choosing && <Spinner size={9} color="var(--text)" />}
          {choosing ? "Choosing…" : "✨ Choose from library"}
        </button>
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
      {choiceNote && <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.45 }}>{choiceNote}</div>}
      {pickerOpen && (
        <AssetPicker
          onPick={(asset) => {
            onChange({ imageUrl: asset.url });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
