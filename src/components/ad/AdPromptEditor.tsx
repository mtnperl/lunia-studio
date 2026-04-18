"use client";
// AdPromptEditor — shared panel for the visual step.
// UX: prompt textarea + guideline chip toggles + "Enhance with Claude" + "Regenerate".
// The enhance button fires /api/ad/enhance-prompt and replaces the textarea in-place;
// the regenerate button hands the current prompt back to the parent.

import { useState } from "react";
import type { VisualFormat } from "@/lib/types";

const CHIPS: { key: string; label: string }[] = [
  { key: "brand-palette", label: "Brand palette" },
  { key: "single-light", label: "Single light source" },
  { key: "negative-space", label: "Negative space" },
  { key: "dark-editorial", label: "Dark editorial" },
  { key: "lifestyle-flatlay", label: "Lifestyle flat lay" },
  { key: "macro-detail", label: "Macro detail" },
  { key: "warm-amber", label: "Warm amber accents" },
  { key: "soft-moonlight", label: "Soft moonlight" },
];

type Props = {
  prompt: string;
  onPromptChange: (p: string) => void;
  activeChipKeys: string[];
  onActiveChipKeysChange: (keys: string[]) => void;
  visualFormat: VisualFormat;
  onRegenerate: () => void;
  regenerating: boolean;
};

export default function AdPromptEditor({
  prompt,
  onPromptChange,
  activeChipKeys,
  onActiveChipKeysChange,
  visualFormat,
  onRegenerate,
  regenerating,
}: Props) {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleChip(key: string) {
    const next = activeChipKeys.includes(key)
      ? activeChipKeys.filter((k) => k !== key)
      : [...activeChipKeys, key];
    onActiveChipKeysChange(next);
  }

  async function handleEnhance() {
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPrompt: prompt,
          visualFormat,
          activeChipKeys,
        }),
      });
      const data = (await res.json()) as { prompt?: string; error?: string };
      if (!res.ok || !data.prompt) {
        setError(data.error ?? "Enhance failed — try again");
        return;
      }
      onPromptChange(data.prompt);
    } catch {
      setError("Network error — check connection and try again");
    } finally {
      setEnhancing(false);
    }
  }

  const disabled = enhancing || regenerating;

  return (
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
        Image prompt
      </div>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        rows={5}
        disabled={disabled}
        style={{
          width: "100%",
          fontFamily: "var(--font-ui), Inter, system-ui, sans-serif",
          fontSize: 13,
          lineHeight: 1.55,
          color: "var(--text)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 12px",
          resize: "vertical",
          outline: "none",
        }}
      />

      {/* Guideline chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 12,
        }}
      >
        {CHIPS.map((c) => {
          const active = activeChipKeys.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => toggleChip(c.key)}
              disabled={disabled}
              style={{
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--bg)" : "var(--muted)",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 14,
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={handleEnhance}
          disabled={disabled || !prompt.trim()}
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
          }}
        >
          {enhancing ? "Enhancing…" : "Enhance with Claude"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={disabled || !prompt.trim()}
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            border: "none",
            borderRadius: 7,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "inherit",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.7 : 1,
          }}
        >
          {regenerating ? "Generating…" : "Regenerate image"}
        </button>
      </div>
    </div>
  );
}
