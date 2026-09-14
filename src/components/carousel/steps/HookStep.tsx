"use client";
import { useState } from "react";
import HookSlide from "@/components/carousel/slides/HookSlide";
import { BrandStyle, CarouselContent, CarouselContrastMode, CarouselStylePreset, type Hook } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { useCarouselApi } from "@/components/carousel/api-context";
import { VISUAL_MOODS } from "@/lib/carousel-visual-moods";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { Button } from "@/components/ui/Button";
import { isEditorialPreset } from "@/lib/carousel-style-presets";
import { HOOK_ANGLES, DEFAULT_SPREAD, hookAngleLabel } from "@/lib/hook-angles";
import { readJsonResponse } from "@/lib/fetch-json";

const IMAGE_STYLE_CHIPS: { value: CarouselImageStyle; label: string }[] = [
  { value: "realistic", label: "Realistic" },
  { value: "cartoon", label: "Illustration" },
  { value: "anime", label: "Anime" },
  { value: "vector", label: "Vector" },
];

// First chip = "Auto" → moodId = null → server picks randomly (today's behavior).
const MOOD_CHIPS: { value: string | null; label: string }[] = [
  { value: null, label: "Auto" },
  ...VISUAL_MOODS.map((m) => ({ value: m.id, label: m.label })),
];

type Props = {
  content: CarouselContent;
  selectedHook: number;
  onSelectHook: (i: number) => void;
  onNext: () => void;
  onImagePromptChange?: (prompt: string) => void;
  brandStyle?: BrandStyle | null;
  backgroundImageUrl?: string | null;
  topic?: string;
  imageStyle?: CarouselImageStyle;
  onImageStyleChange?: (style: CarouselImageStyle) => void;
  onHooksChange?: (hooks: Hook[]) => void;
  hookTone?: string;
  moodId?: string | null;
  onMoodChange?: (id: string | null) => void;
  /** Editorial Scientific only — contrast has no effect on other presets. */
  stylePreset?: CarouselStylePreset;
  contrastMode?: CarouselContrastMode;
  onContrastChange?: (mode: CarouselContrastMode) => void;
};

export default function HookStep({ content, selectedHook, onSelectHook, onNext, onImagePromptChange, brandStyle, backgroundImageUrl, topic, imageStyle = "realistic", onImageStyleChange, onHooksChange, hookTone = "educational", moodId = null, onMoodChange, stylePreset = "default", contrastMode = "standard", onContrastChange }: Props) {
  const apiBase = useCarouselApi();
  const [promptOpen, setPromptOpen] = useState(false);
  const [guidelines, setGuidelines] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [hooksPanelOpen, setHooksPanelOpen] = useState(false);
  const [hooksGuidelines, setHooksGuidelines] = useState("");
  const [regeneratingHooks, setRegeneratingHooks] = useState(false);
  const [hooksRegenError, setHooksRegenError] = useState<string | null>(null);
  // Hook spread: one hook per angle, so the options differ by strategy rather
  // than by wording. Same panel, second button.
  const [spreadAngles, setSpreadAngles] = useState<string[]>(DEFAULT_SPREAD);
  const [spreadBusy, setSpreadBusy] = useState(false);
  const imagePrompt = content.imagePrompt ?? "";
  const hook = content.hooks[selectedHook];

  async function handleRegenerateHooks() {
    setRegeneratingHooks(true);
    setHooksRegenError(null);
    try {
      const res = await fetch(`${apiBase}/regenerate-hooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          hookTone,
          content: { slides: content.slides, spine: content.spine },
          guidelines: hooksGuidelines.trim(),
          stylePreset,
          existing: content.hooks,
          brief: content.brief ?? null,
        }),
      });
      const data = await readJsonResponse<{ error?: string; hooks?: { headline: string; subline: string; sourceNote?: string }[] }>(res, "hook rewrite");
      if (!res.ok || data.error) {
        setHooksRegenError(data.error ?? "Failed to regenerate hooks");
      } else if (Array.isArray(data.hooks) && data.hooks.length > 0) {
        // New hooks join the pool; the ones already written stay on the table.
        onHooksChange?.([...content.hooks, ...data.hooks].slice(0, 12));
        setAlternatives([]);
      } else {
        setHooksRegenError("No hooks returned — please try again");
      }
    } catch (err) {
      setHooksRegenError(err instanceof Error ? err.message : "Network error, please try again");
    } finally {
      setRegeneratingHooks(false);
    }
  }

  /** One hook per selected ANGLE, appended to the pool. "Regenerate" writes
   *  variations under the deck's single hook tone; this opens the same deck
   *  through a different door each time, and tags each option with its angle. */
  async function handleSpread() {
    if (spreadBusy || regeneratingHooks || spreadAngles.length === 0) return;
    setSpreadBusy(true);
    setHooksRegenError(null);
    try {
      const res = await fetch(`${apiBase}/hook-spread`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          content: { slides: content.slides, spine: content.spine },
          guidelines: hooksGuidelines.trim(),
          stylePreset,
          existing: content.hooks,
          brief: content.brief ?? null,
          angles: spreadAngles,
        }),
      });
      const data = await readJsonResponse<{ error?: string; hooks?: { headline: string; subline: string; sourceNote?: string; angle?: string; angleNote?: string }[] }>(res, "hook spread");
      if (!res.ok || data.error) {
        setHooksRegenError(data.error ?? "Failed to write the spread");
      } else if (Array.isArray(data.hooks) && data.hooks.length > 0) {
        onHooksChange?.([...content.hooks, ...data.hooks].slice(0, 24));
        setAlternatives([]);
      } else {
        setHooksRegenError("No hooks returned, please try again");
      }
    } catch (err) {
      setHooksRegenError(err instanceof Error ? err.message : "Network error, please try again");
    } finally {
      setSpreadBusy(false);
    }
  }

  /** Toggle one angle. The last one stays: a spread of nothing has no meaning. */
  function toggleAngle(id: string) {
    setSpreadAngles((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((a) => a !== id) : cur) : [...cur, id].slice(0, 8)));
  }

  async function handleRegeneratePrompt() {
    setRegenerating(true);
    setRegenError(null);
    setAlternatives([]);
    try {
      const res = await fetch(`${apiBase}/regenerate-image-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic ?? "",
          headline: hook?.headline ?? "",
          subline: hook?.subline ?? "",
          currentPrompt: imagePrompt,
          guidelines: guidelines.trim(),
          ...(moodId ? { moodId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setRegenError(data.error ?? "Failed to regenerate prompt");
      } else {
        onImagePromptChange?.(data.prompt);
        if (Array.isArray(data.alternatives) && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
        }
      }
    } catch {
      setRegenError("Network error — please try again");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
        Choose your hook
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 28, fontSize: 14 }}>
        Pick the opening slide that will stop the scroll.
      </p>

      <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 8, marginBottom: 36 }}>
        {content.hooks.map((h, i) => {
          const isSelected = selectedHook === i;
          return (
            <div
              key={i}
              onClick={() => { onSelectHook(i); setAlternatives([]); }}
              style={{
                flexShrink: 0,
                cursor: "pointer",
                position: "relative",
                borderRadius: 10,
                overflow: "hidden",
                outline: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                outlineOffset: 2,
                transition: "outline-color 0.15s",
                boxShadow: isSelected ? "0 0 0 6px rgba(30,122,138,0.15)" : "none",
              }}
            >
              <HookSlide headline={h.headline} subline={h.subline} sourceNote={h.sourceNote} topic={topic} scale={0.28} brandStyle={brandStyle ?? undefined} />

              {isSelected && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="var(--bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div style={{
                marginTop: 8, textAlign: "center",
                fontSize: 12, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? "var(--accent)" : "var(--muted)",
                paddingBottom: 4,
              }}>
                {isSelected ? `✓ Hook ${i + 1} selected` : `Hook ${i + 1}`}
                {hookAngleLabel(h.angle) && (
                  <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--subtle)", marginTop: 3, fontWeight: 500 }}>
                    {hookAngleLabel(h.angle)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rewrite hook copy — expandable */}
      <div style={{ marginBottom: 28, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => setHooksPanelOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)", border: "none", padding: "10px 14px",
            fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Rewrite hook copy
            <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
              — fresh hooks for this same deck
            </span>
          </span>
          <span style={{ fontSize: 16, lineHeight: 1, transform: hooksPanelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ›
          </span>
        </button>

        {hooksPanelOpen && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, marginTop: 0 }}>
              Keeps your 3 content slides and CTA. Replaces the hook options above with 3 new ones, then pick your favourite.
            </p>

            <div style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 8,
            }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "block", marginBottom: 6,
              }}>
                Guidelines (optional)
              </label>
              <AutoTextarea
                value={hooksGuidelines}
                onChange={(e) => setHooksGuidelines(e.target.value)}
                minHeight={40}
                placeholder="e.g. punchier, lead with a number, more myth-busting, less clickbait..."
                style={{
                  width: "100%", fontSize: 12, lineHeight: 1.5,
                  fontFamily: "inherit",
                  color: "var(--text)", background: "transparent",
                  border: "none", outline: "none", padding: 0,
                }}
              />
            </div>

            {hooksRegenError && (
              <p style={{ fontSize: 12, color: "var(--error)", margin: "0 0 8px" }}>{hooksRegenError}</p>
            )}

            <button
              onClick={handleRegenerateHooks}
              disabled={regeneratingHooks}
              style={{
                background: regeneratingHooks ? "var(--surface)" : "var(--text)",
                color: regeneratingHooks ? "var(--muted)" : "var(--bg)",
                border: "none", borderRadius: 6,
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
                fontFamily: "inherit", cursor: regeneratingHooks ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s",
              }}
            >
              {regeneratingHooks ? (
                <>
                  <span style={{
                    display: "inline-block", width: 12, height: 12,
                    border: "2px solid var(--muted)", borderTopColor: "transparent",
                    borderRadius: "50%", animation: "spin 0.7s linear infinite",
                  }} />
                  Writing 3 new hooks...
                </>
              ) : (
                "Regenerate 3 hooks"
              )}
            </button>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "block", marginBottom: 4,
              }}>
                Or write a spread
              </label>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
                One hook per angle, all opening this same deck. Pick the doors you want tried.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {HOOK_ANGLES.map((a) => {
                  const on = spreadAngles.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAngle(a.id)}
                      title={a.job}
                      aria-pressed={on}
                      style={{
                        padding: "5px 10px", borderRadius: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                        border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                        background: on ? "var(--accent-dim)" : "var(--bg)",
                        color: on ? "var(--text)" : "var(--muted)",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleSpread}
                disabled={spreadBusy || regeneratingHooks}
                style={{
                  marginTop: 10,
                  background: spreadBusy ? "var(--surface)" : "var(--text)",
                  color: spreadBusy ? "var(--muted)" : "var(--bg)",
                  border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: spreadBusy ? "not-allowed" : "pointer",
                }}
              >
                {spreadBusy ? "Writing the spread..." : `Write ${spreadAngles.length} hooks by angle`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image prompt — expandable */}
      <div style={{ marginBottom: 28, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => setPromptOpen((v) => !v)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "var(--surface)", border: "none", padding: "10px 14px",
            fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer",
            fontFamily: "inherit", textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🎨</span>
            Hook image prompt
            <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
              — sent to Recraft V3 when you click Preview
            </span>
          </span>
          <span style={{ fontSize: 16, lineHeight: 1, transform: promptOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ›
          </span>
        </button>

        {promptOpen && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
            {/* Image style chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Style:</span>
              {IMAGE_STYLE_CHIPS.map((chip) => {
                const active = imageStyle === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => onImageStyleChange?.(chip.value)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim)" : "transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Mood chips — controls the styleBlock appended after Claude's subject prompt. */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Mood:</span>
              {MOOD_CHIPS.map((chip) => {
                const active = moodId === chip.value || (chip.value === null && !moodId);
                return (
                  <button
                    key={chip.value ?? "auto"}
                    onClick={() => onMoodChange?.(chip.value)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      background: active ? "var(--accent-dim)" : "transparent",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
            {/* Contrast — this panel is the last stop before the FIRST hook image
                is generated, so the setting has to be reachable here and not only
                on the topic screen. Editorial Scientific only: elsewhere the
                image route never reads it. */}
            {isEditorialPreset(stylePreset) && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Contrast:</span>
                {([
                  { value: "standard" as CarouselContrastMode, label: "Standard" },
                  { value: "high" as CarouselContrastMode, label: "Bold post" },
                ]).map((chip) => {
                  const active = contrastMode === chip.value;
                  return (
                    <button
                      key={chip.value}
                      onClick={() => onContrastChange?.(chip.value)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                        background: active ? "var(--accent-dim)" : "transparent",
                        color: active ? "var(--accent)" : "var(--muted)",
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.1s",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
                {contrastMode === "high" && (
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    One bright subject on a dark ground, ivory type, one yellow phrase.
                  </span>
                )}
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, marginTop: 0 }}>
              Claude wrote this prompt for hook {selectedHook + 1}. Edit it directly, or add guidelines and regenerate.
            </p>
            <AutoTextarea
              value={imagePrompt}
              onChange={(e) => onImagePromptChange?.(e.target.value)}
              minHeight={84}
              placeholder="No image prompt generated yet."
              style={{
                width: "100%", fontSize: 13, lineHeight: 1.6,
                fontFamily: "inherit",
                color: imagePrompt ? "var(--text)" : "var(--subtle)",
                marginBottom: 12,
              }}
            />

            {/* Guidelines + regenerate */}
            <div style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 8,
            }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: "var(--muted)",
                textTransform: "uppercase", letterSpacing: "0.06em",
                display: "block", marginBottom: 6,
              }}>
                Guidelines (optional)
              </label>
              <AutoTextarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                minHeight={40}
                placeholder="e.g. warmer tones, focus on water droplets, more abstract, moonlight scene..."
                style={{
                  width: "100%", fontSize: 12, lineHeight: 1.5,
                  fontFamily: "inherit",
                  color: "var(--text)", background: "transparent",
                  border: "none", outline: "none", padding: 0,
                }}
              />
            </div>

            {regenError && (
              <p style={{ fontSize: 12, color: "#dc2626", margin: "0 0 8px" }}>{regenError}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={handleRegeneratePrompt}
                disabled={regenerating}
                style={{
                  background: regenerating ? "var(--surface)" : "var(--text)",
                  color: regenerating ? "var(--muted)" : "var(--bg)",
                  border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 700,
                  fontFamily: "inherit", cursor: regenerating ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, transition: "opacity 0.15s",
                }}
              >
                {regenerating ? (
                  <>
                    <span style={{
                      display: "inline-block", width: 12, height: 12,
                      border: "2px solid var(--muted)", borderTopColor: "transparent",
                      borderRadius: "50%", animation: "spin 0.7s linear infinite",
                    }} />
                    Generating 3 directions...
                  </>
                ) : (
                  <>↺ Generate 3 prompt directions</>
                )}
              </button>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Prompts retune to the selected mood.
              </span>
            </div>

            {/* Alternative prompt suggestions */}
            {alternatives.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "var(--muted)",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                }}>
                  2 more directions — click to use
                </div>
                {alternatives.map((alt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginBottom: 6,
                      fontSize: 12,
                      color: "var(--text)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                    onClick={() => onImagePromptChange?.(alt)}
                    title="Click to use this prompt"
                  >
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: "var(--accent)",
                      background: "var(--accent-dim)", borderRadius: 4,
                      padding: "2px 5px", flexShrink: 0, marginTop: 1,
                      fontFamily: "var(--font-ui)",
                    }}>
                      {i + 2}
                    </span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Button variant="primary" size="lg" onClick={onNext}>Preview carousel →</Button>
    </div>
  );
}
