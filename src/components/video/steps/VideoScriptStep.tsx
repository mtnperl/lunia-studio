"use client";

import { useState } from "react";
import { VideoAdScene, VideoAdSceneType } from "@/lib/types";

const SCENE_META: Record<VideoAdSceneType, { label: string; color: string; fields: string[] }> = {
  hook:    { label: "Hook",    color: "#C8A96E", fields: ["headline", "subline"] },
  science: { label: "Science", color: "#5F9E75", fields: ["headline", "subline", "stat", "caption"] },
  product: { label: "Product", color: "#7A9EC8", fields: ["headline", "subline"] },
  proof:   { label: "Proof",   color: "#C47A5A", fields: ["headline", "stat", "caption"] },
  cta:     { label: "CTA",     color: "#C8A96E", fields: ["headline", "subline"] },
};

type Props = {
  scenes: VideoAdScene[];
  topic: string;
  onUpdate: (scenes: VideoAdScene[]) => void;
  onRegenerate: (sceneType: VideoAdSceneType) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
};

export default function VideoScriptStep({ scenes, topic, onUpdate, onRegenerate, onNext, onBack }: Props) {
  const [regenerating, setRegenerating] = useState<VideoAdSceneType | null>(null);

  function updateField(idx: number, field: keyof VideoAdScene, value: string | number) {
    const next = scenes.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    onUpdate(next);
  }

  async function handleRegenerate(type: VideoAdSceneType) {
    setRegenerating(type);
    try {
      await onRegenerate(type);
    } finally {
      setRegenerating(null);
    }
  }

  const FIELD_LABELS: Partial<Record<keyof VideoAdScene, string>> = {
    headline: "Headline",
    subline: "Subline",
    stat: "Stat",
    caption: "Caption / Attribution",
  };

  const S: Record<string, React.CSSProperties> = {
    label: { fontFamily: "Inter, sans-serif", fontSize: 11, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 6 },
    input: { width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "8px 10px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box" as const },
  };

  const totalSeconds = Math.round(scenes.reduce((acc, s) => acc + s.durationFrames, 0) / 30);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: "var(--text)" }}>
          Review script
        </h2>
        <span style={{ fontFamily: "Fira Code, monospace", fontSize: 12, color: "var(--muted)" }}>
          {totalSeconds}s
        </span>
      </div>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "var(--muted)", marginBottom: 28 }}>
        Edit any scene or regenerate individually. Drag duration to adjust timing.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {scenes.map((scene, idx) => {
          const meta = SCENE_META[scene.type];
          const isRegen = regenerating === scene.type;

          return (
            <div
              key={scene.type}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                overflow: "hidden",
                opacity: isRegen ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border)",
                  background: "var(--surface-r)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: meta.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: meta.color,
                    }}
                  >
                    {meta.label}
                  </span>
                  <span style={{ fontFamily: "Fira Code, monospace", fontSize: 11, color: "var(--muted)" }}>
                    {Math.round(scene.durationFrames / 30)}s
                  </span>
                </div>

                <button
                  onClick={() => handleRegenerate(scene.type)}
                  disabled={isRegen}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "4px 10px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    color: "var(--muted)",
                    cursor: isRegen ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em",
                  }}
                >
                  {isRegen ? "..." : "Regenerate"}
                </button>
              </div>

              {/* Fields */}
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {meta.fields.map((field) => {
                  const value = (scene as Record<string, string | number | undefined>)[field] ?? "";
                  const isLong = field === "subline" || field === "caption";
                  return (
                    <div key={field}>
                      <label style={S.label}>{FIELD_LABELS[field as keyof VideoAdScene] ?? field}</label>
                      {isLong ? (
                        <textarea
                          value={String(value)}
                          onChange={(e) => updateField(idx, field as keyof VideoAdScene, e.target.value)}
                          rows={2}
                          style={{ ...S.input, resize: "none" }}
                        />
                      ) : (
                        <input
                          value={String(value)}
                          onChange={(e) => updateField(idx, field as keyof VideoAdScene, e.target.value)}
                          style={S.input}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Duration slider */}
                <div>
                  <label style={S.label}>Duration: {Math.round(scene.durationFrames / 30)}s</label>
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={15}
                    value={scene.durationFrames}
                    onChange={(e) => updateField(idx, "durationFrames", Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--accent)" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "10px 20px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 4,
            padding: "10px 28px",
            fontFamily: "Inter, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--bg)",
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Choose Assets
        </button>
      </div>
    </div>
  );
}
