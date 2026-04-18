"use client";
// Step 3 — Visual generation + iterative edit loop.
// Left: AdCanvas preview of the current image with overlay. Right: prompt editor
// with chips, regenerate button, and edit-instruction box (Seedream 5 Lite Edit).
// History shown below so user can revert.

import { useState } from "react";
import AdCanvas from "@/components/ad/AdCanvas";
import AdPromptEditor from "@/components/ad/AdPromptEditor";
import AdRetroLoader from "@/components/ad/AdRetroLoader";
import type { AdConcept, AdImageHistoryEntry, VisualFormat } from "@/lib/types";

type Aspect = "1:1" | "4:5";

type Props = {
  concept: AdConcept;
  visualFormat: VisualFormat;
  prompt: string;
  onPromptChange: (p: string) => void;
  activeChipKeys: string[];
  onActiveChipKeysChange: (keys: string[]) => void;
  imageUrl: string | null;
  aspect: Aspect;
  onAspectChange: (a: Aspect) => void;
  history: AdImageHistoryEntry[];
  onHistoryChange: (h: AdImageHistoryEntry[]) => void;
  onImageChange: (url: string | null) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function AdVisualStep({
  concept,
  visualFormat,
  prompt,
  onPromptChange,
  activeChipKeys,
  onActiveChipKeysChange,
  imageUrl,
  aspect,
  onAspectChange,
  history,
  onHistoryChange,
  onImageChange,
  onBack,
  onNext,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState("");

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Image generation failed");
        return;
      }
      const entry: AdImageHistoryEntry = {
        url: data.url,
        prompt,
        createdAt: new Date().toISOString(),
      };
      onHistoryChange([entry, ...history]);
      onImageChange(data.url);
    } catch {
      setError("Network error — check connection and try again");
    } finally {
      setGenerating(false);
    }
  }

  async function handleEditImage() {
    if (!imageUrl || !editInstruction.trim()) return;
    setEditing(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          editInstruction: editInstruction.trim(),
          aspect,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Edit failed");
        return;
      }
      const entry: AdImageHistoryEntry = {
        url: data.url,
        prompt,
        editInstruction: editInstruction.trim(),
        createdAt: new Date().toISOString(),
      };
      onHistoryChange([entry, ...history]);
      onImageChange(data.url);
      setEditInstruction("");
    } catch {
      setError("Network error — check connection and try again");
    } finally {
      setEditing(false);
    }
  }

  const busy = generating || editing;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Aspect toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Generate visual</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            Recraft V4 for base generation. Seedream 5 Lite Edit for iterative refinements.
          </div>
        </div>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          {(["1:1", "4:5"] as const).map((a) => (
            <button
              key={a}
              onClick={() => onAspectChange(a)}
              style={{
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                border: "none",
                cursor: "pointer",
                background: aspect === a ? "var(--accent)" : "transparent",
                color: aspect === a ? "var(--bg)" : "var(--muted)",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(184,92,92,0.08)",
            border: "1px solid rgba(184,92,92,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--error)",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* Preview + editor side by side on wide screens */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Preview */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            Preview
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--surface)",
              position: "relative",
            }}
          >
            <AdCanvas
              imageUrl={imageUrl}
              concept={concept}
              aspect={aspect}
              scale={aspect === "1:1" ? 360 / 1080 : 360 / 1080}
              isFalImage={!!imageUrl}
            />
            {busy && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                }}
              >
                <div style={{ transform: "scale(0.78)", transformOrigin: "center" }}>
                  <AdRetroLoader
                    mode={generating ? "image" : "edit"}
                    detail={
                      generating
                        ? `prompt: ${prompt.substring(0, 56)}`
                        : `instruction: ${editInstruction.substring(0, 56)}`
                    }
                  />
                </div>
              </div>
            )}
          </div>
          {!imageUrl && !busy && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              No image yet — click “Regenerate image” to create the first version.
            </div>
          )}
        </div>

        {/* Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AdPromptEditor
            prompt={prompt}
            onPromptChange={onPromptChange}
            activeChipKeys={activeChipKeys}
            onActiveChipKeysChange={onActiveChipKeysChange}
            visualFormat={visualFormat}
            onRegenerate={handleRegenerate}
            regenerating={generating}
          />

          {/* Edit this image (Seedream) */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              background: "var(--surface)",
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              Edit this image
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
              Natural language instruction — e.g. “darken the background”, “move the bottle left”,
              “add soft purple rim lighting”.
            </div>
            <textarea
              value={editInstruction}
              onChange={(e) => setEditInstruction(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={!imageUrl || busy}
              placeholder={imageUrl ? "" : "Generate an image first"}
              style={{
                width: "100%",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.5,
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 12px",
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                onClick={handleEditImage}
                disabled={!imageUrl || !editInstruction.trim() || busy}
                style={{
                  background: "var(--accent)",
                  color: "var(--bg)",
                  border: "none",
                  borderRadius: 7,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: !imageUrl || !editInstruction.trim() || busy ? "not-allowed" : "pointer",
                  opacity: !imageUrl || !editInstruction.trim() || busy ? 0.6 : 1,
                }}
              >
                {editing ? "Editing…" : "Apply edit"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            History ({history.length})
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {history.map((h, i) => {
              const isActive = h.url === imageUrl;
              return (
                <button
                  key={`${h.url}-${i}`}
                  onClick={() => onImageChange(h.url)}
                  title={h.editInstruction ? `Edit: ${h.editInstruction}` : "Fresh generation"}
                  style={{
                    flexShrink: 0,
                    width: 80,
                    height: aspect === "1:1" ? 80 : 100,
                    border: "2px solid",
                    borderColor: isActive ? "var(--accent)" : "var(--border)",
                    borderRadius: 6,
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "var(--surface)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/ad/image-proxy?url=${encodeURIComponent(h.url)}`}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            color: "var(--muted)",
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
            padding: "8px 0",
          }}
        >
          ← Change concept
        </button>
        <button
          onClick={onNext}
          disabled={!imageUrl}
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 7,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: !imageUrl ? "not-allowed" : "pointer",
            opacity: !imageUrl ? 0.5 : 1,
          }}
        >
          Preview & export →
        </button>
      </div>
    </div>
  );
}
