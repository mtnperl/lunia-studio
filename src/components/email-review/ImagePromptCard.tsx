"use client";
import { useEffect, useState } from "react";
import CopyButton from "@/components/email-review/CopyButton";
import { MiniReviewLoader } from "@/components/email-review/ReviewLoaders";
import type { AssetMetadata, FlowReviewImageEngine, FlowReviewImagePrompt } from "@/lib/types";

type Props = {
  reviewId: string;
  prompt: FlowReviewImagePrompt;
  onUpdate: (next: FlowReviewImagePrompt) => void;
};

// ─── References sub-panel ─────────────────────────────────────────────────────

type RefPanelProps = {
  prompt: FlowReviewImagePrompt;
  assets: AssetMetadata[];
  /** Toggle a Claude-picked asset on/off (mutates referenceAssetIds in parent state). */
  onToggleAsset: (assetId: string) => void;
  /** Append a new ad-hoc reference URL. */
  onAddReferenceUrl: (url: string) => void;
  /** Drop one of the ad-hoc URLs. */
  onRemoveReferenceUrl: (url: string) => void;
  disabled: boolean;
};

function ReferencesPanel({ prompt, assets, onToggleAsset, onAddReferenceUrl, onRemoveReferenceUrl, disabled }: RefPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const logoAssets = assets.filter((a) => a.assetType === "logo");
  // Selectable assets = everything else Claude can pick from
  const selectableAssets = assets.filter((a) => a.assetType !== "logo");
  const selectedIds = new Set(prompt.referenceAssetIds ?? []);
  const extraUrls = prompt.referenceImageUrls ?? [];

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("assetType", "other");
      const res = await fetch("/api/assets/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setUploadErr(data.error ?? `Upload failed (${res.status})`);
        return;
      }
      onAddReferenceUrl(data.url as string);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      // Reset the input so the same file can be re-uploaded if needed
      e.target.value = "";
    }
  }

  return (
    <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e8e2d2", borderRadius: 6, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#5b5340", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Reference images
          <span style={{ marginLeft: 6, fontWeight: 500, color: "#8b8270", textTransform: "none", letterSpacing: 0 }}>
            (fed to GPT Image 2 for brand consistency)
          </span>
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            background: "#102635",
            color: "#fff",
            borderRadius: 4,
            cursor: uploading || disabled ? "wait" : "pointer",
            opacity: uploading || disabled ? 0.6 : 1,
          }}
        >
          {uploading ? "Uploading…" : "+ Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading || disabled}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {uploadErr && (
        <div style={{ padding: "6px 8px", background: "rgba(176,65,62,0.08)", border: "1px solid rgba(176,65,62,0.3)", borderRadius: 4, fontSize: 11, color: "#B0413E" }}>
          {uploadErr}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {/* Logo — always attached, locked */}
        {logoAssets.map((a) => (
          <Thumb key={a.id} url={a.url} label="logo · auto" locked />
        ))}

        {/* Claude-picked product/lifestyle assets */}
        {selectableAssets.map((a) => {
          const checked = selectedIds.has(a.id);
          return (
            <Thumb
              key={a.id}
              url={a.url}
              label={`${a.assetType} · ${a.name.slice(0, 18)}`}
              checked={checked}
              onClick={() => !disabled && onToggleAsset(a.id)}
              disabled={disabled}
            />
          );
        })}

        {/* User-uploaded ad-hoc refs */}
        {extraUrls.map((u) => (
          <Thumb
            key={u}
            url={u}
            label="upload · this image only"
            checked
            onClick={() => !disabled && onRemoveReferenceUrl(u)}
            removable
            disabled={disabled}
          />
        ))}

        {logoAssets.length === 0 && selectableAssets.length === 0 && extraUrls.length === 0 && (
          <div style={{ fontSize: 11, color: "#8b8270", fontStyle: "italic", padding: "4px 0" }}>
            No brand assets uploaded yet. Upload a Lunia logo + product shots in the Assets tab, or click <strong>+ Upload</strong> above for a one-off reference.
          </div>
        )}
      </div>
    </div>
  );
}

type ThumbProps = {
  url: string;
  label: string;
  checked?: boolean;
  locked?: boolean;       // logo — can't be toggled off
  removable?: boolean;    // user upload — × on hover
  disabled?: boolean;
  onClick?: () => void;
};

function Thumb({ url, label, checked, locked, removable, disabled, onClick }: ThumbProps) {
  const interactive = !!onClick && !disabled && !locked;
  return (
    <div
      onClick={interactive ? onClick : undefined}
      style={{
        position: "relative",
        width: 64,
        height: 64,
        borderRadius: 6,
        overflow: "hidden",
        border: locked ? "2px solid #102635" : checked === false ? "1px solid #d6cfbe" : "2px solid #1f6f3a",
        opacity: checked === false ? 0.35 : 1,
        cursor: interactive ? "pointer" : locked ? "default" : "not-allowed",
        background: "#fff",
        transition: "opacity 0.15s, border-color 0.15s",
      }}
      title={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {locked && (
        <div style={{ position: "absolute", top: 2, right: 2, padding: "1px 4px", background: "#102635", color: "#fff", fontSize: 8, fontWeight: 700, borderRadius: 2 }}>
          LOCK
        </div>
      )}
      {removable && (
        <div style={{ position: "absolute", top: 2, right: 2, padding: "0 4px", background: "rgba(176,65,62,0.9)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 2 }}>
          ×
        </div>
      )}
    </div>
  );
}

// ─── Main ImagePromptCard ──────────────────────────────────────────────────────

export default function ImagePromptCard({ reviewId, prompt, onUpdate }: Props) {
  const [busy, setBusy] = useState(false);
  const [showRegen, setShowRegen] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [userComment, setUserComment] = useState("");
  const [assets, setAssets] = useState<AssetMetadata[]>([]);

  // Pull the asset library once per card mount. Light request, cached by browser.
  useEffect(() => {
    let alive = true;
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data)) setAssets(data as AssetMetadata[]);
      })
      .catch(() => { /* silent — UI will show empty refs panel */ });
    return () => { alive = false; };
  }, []);

  // Local mutators for the references panel — they update the prompt object
  // in-place via onUpdate so re-renders persist the change and the next
  // Generate call picks up the latest selection.
  function toggleAsset(assetId: string) {
    const current = prompt.referenceAssetIds ?? [];
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current, assetId];
    onUpdate({ ...prompt, referenceAssetIds: next });
  }

  function addReferenceUrl(url: string) {
    const current = prompt.referenceImageUrls ?? [];
    if (current.includes(url)) return;
    onUpdate({ ...prompt, referenceImageUrls: [...current, url] });
  }

  function removeReferenceUrl(url: string) {
    const current = prompt.referenceImageUrls ?? [];
    onUpdate({ ...prompt, referenceImageUrls: current.filter((u) => u !== url) });
  }

  async function generate(engineOverride?: FlowReviewImageEngine, promptOverride?: string) {
    setBusy(true);
    // Optimistically mark as generating so the MiniReviewLoader shows immediately
    // (the batch path in FlowImagesGrid does the same — keep consistent).
    onUpdate({ ...prompt, status: "generating", errorMessage: undefined });
    try {
      const res = await fetch("/api/email-review/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          promptId: prompt.id,
          engineOverride,
          promptOverride,
          referenceAssetIds: prompt.referenceAssetIds ?? [],
          referenceImageUrls: prompt.referenceImageUrls ?? [],
        }),
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

      {prompt.status === "generating" ? (
        <MiniReviewLoader
          label={`rendering ${prompt.placement.replace(/_/g, " ")} · ${prompt.aspect}`}
          detail={prompt.engine.toUpperCase()}
          engine={`fal.ai · ${prompt.engine}`}
        />
      ) : prompt.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={prompt.imageUrl} alt="" style={{ width: "100%", borderRadius: 6, border: "1px solid #d6cfbe", maxHeight: 400, objectFit: "cover" }} />
      ) : null}

      <pre style={{ margin: 0, padding: 12, background: "#fff", border: "1px solid #e8e2d2", borderRadius: 6, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.55, color: "#1A1A1A", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 240, overflow: "auto" }}>
        {prompt.prompt}
      </pre>

      {/* Reference images panel — always shown so user can adjust before / between renders */}
      <ReferencesPanel
        prompt={prompt}
        assets={assets}
        onToggleAsset={toggleAsset}
        onAddReferenceUrl={addReferenceUrl}
        onRemoveReferenceUrl={removeReferenceUrl}
        disabled={busy || prompt.status === "generating"}
      />

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
            {regenLoading ? "Drafting 3 alternatives…" : prompt.regenSuggestions ? "↺ Get 3 fresh suggestions" : "Get 3 alternative prompts →"}
          </button>
          {regenLoading && (
            <MiniReviewLoader
              label="drafting 3 alternative prompts"
              detail="VARYING ANGLE · LIGHT · CAMERA"
              engine="claude · regen-suggestions"
            />
          )}
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
