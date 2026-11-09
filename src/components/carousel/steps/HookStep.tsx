"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import HookSlide from "@/components/carousel/slides/HookSlide";
import { BrandStyle, CarouselContent, CarouselContrastMode, CarouselStylePreset, type Hook } from "@/lib/types";
import type { CarouselImageStyle } from "@/components/carousel/steps/TopicStep";
import { useCarouselApi } from "@/components/carousel/api-context";
import { VISUAL_MOODS } from "@/lib/carousel-visual-moods";
import { AutoTextarea } from "@/components/ui/AutoTextarea";
import { Button } from "@/components/ui/Button";
import { IcCheck, IcChevron, IcRefresh, Label } from "@/components/ui";
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

  const panel: CSSProperties = { marginBottom: 24, border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-3)", overflow: "hidden" };
  const panelHead: CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    background: "var(--ui-surface)", border: "none", minHeight: 40, padding: "8px 16px",
    fontSize: 13, fontWeight: 500, color: "var(--ui-text)", cursor: "pointer",
    fontFamily: "inherit", textAlign: "left",
  };
  const chevron = (open: boolean) => <IcChevron size={16} strokeWidth={1.75} style={{ color: "var(--ui-text-2)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform var(--ui-dur-2) var(--ui-ease-in-out)" }} />;
  const well: CSSProperties = { background: "var(--ui-bg)", border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-2)", padding: "8px 12px", marginBottom: 8 };
  const note: CSSProperties = { fontSize: 12, color: "var(--ui-text-2)", lineHeight: 1.5, margin: "0 0 8px" };
  const bare: CSSProperties = { width: "100%", fontSize: 13, lineHeight: 1.5, fontFamily: "inherit", color: "var(--ui-text)", background: "transparent", border: "none", outline: "none", padding: 0 };

  return (
    <div>
      <h2 style={{ fontSize: "var(--ui-text-24)", lineHeight: "var(--ui-lh-24)", fontWeight: 600, margin: "0 0 var(--ui-space-3)", letterSpacing: "var(--ui-tracking-tight)" }}>
        Choose your hook
      </h2>
      <p style={{ color: "var(--ui-text-2)", margin: "0 0 var(--ui-space-8)", fontSize: 14 }}>
        Pick the opening slide that will stop the scroll
      </p>

      <div role="radiogroup" aria-label="Hooks" style={{ display: "flex", gap: 20, overflowX: "auto", padding: "4px 4px 8px", marginBottom: 32 }}>
        {content.hooks.map((h, i) => {
          const isSelected = selectedHook === i;
          const angle = hookAngleLabel(h.angle);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Hook ${i + 1}${angle ? `, ${angle}` : ""}`}
              onClick={() => { onSelectHook(i); setAlternatives([]); }}
              className="ui-focusable"
              style={{ flexShrink: 0, cursor: "pointer", background: "none", border: "none", padding: 0, fontFamily: "inherit", textAlign: "center" }}
            >
              <div style={{
                position: "relative",
                borderRadius: "var(--ui-radius-3)",
                overflow: "hidden",
                outline: `2px solid ${isSelected ? "var(--ui-text)" : "transparent"}`,
                outlineOffset: 2,
                transition: "outline-color var(--ui-dur-2) var(--ui-ease-out)",
              }}>
                <HookSlide headline={h.headline} subline={h.subline} sourceNote={h.sourceNote} topic={topic} scale={0.28} brandStyle={brandStyle ?? undefined} />
                {isSelected && (
                  <div style={{
                    position: "absolute", top: 8, right: 8,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "var(--ui-ink)", color: "var(--ui-on-ink)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <IcCheck size={14} strokeWidth={2} />
                  </div>
                )}
              </div>
              <div style={{ marginTop: 8, paddingBottom: 4, fontSize: 12, fontWeight: 500, color: isSelected ? "var(--ui-text)" : "var(--ui-text-2)" }}>
                Hook {i + 1}
                {angle && <div style={{ fontSize: 11, fontWeight: 400, color: "var(--ui-text-3)", marginTop: 2 }}>{angle}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Rewrite hook copy — expandable */}
      <div style={panel}>
        <button type="button" aria-expanded={hooksPanelOpen} onClick={() => setHooksPanelOpen((v) => !v)} style={panelHead}>
          <span>
            Rewrite hook copy
            <span style={{ fontWeight: 400, color: "var(--ui-text-2)", marginLeft: 8 }}>Fresh hooks for this same deck</span>
          </span>
          {chevron(hooksPanelOpen)}
        </button>

        {hooksPanelOpen && (
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--ui-border)" }}>
            <p style={note}>Keeps your content slides and CTA. Adds 3 new hook options to the ones above, then pick your favourite.</p>

            <div style={well}>
              <Label kind="field">Guidelines (optional)</Label>
              <AutoTextarea
                value={hooksGuidelines}
                onChange={(e) => setHooksGuidelines(e.target.value)}
                minHeight={40}
                placeholder="e.g. punchier, lead with a number, more myth-busting, less clickbait"
                style={bare}
              />
            </div>

            {hooksRegenError && <p style={{ ...note, color: "var(--ui-danger)" }}>{hooksRegenError}</p>}

            <Button variant="primary" size="sm" busy={regeneratingHooks} onClick={handleRegenerateHooks}>
              Regenerate 3 hooks
            </Button>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-border)" }}>
              <Label kind="field">Or write a spread</Label>
              <p style={note}>One hook per angle, all opening this same deck. Pick the doors you want tried.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {HOOK_ANGLES.map((a) => (
                  <Chip key={a.id} on={spreadAngles.includes(a.id)} title={a.job} onClick={() => toggleAngle(a.id)}>{a.label}</Chip>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <Button variant="primary" size="sm" busy={spreadBusy} disabled={regeneratingHooks} onClick={handleSpread}>
                  Write {spreadAngles.length} hooks by angle
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image prompt — expandable */}
      <div style={panel}>
        <button type="button" aria-expanded={promptOpen} onClick={() => setPromptOpen((v) => !v)} style={panelHead}>
          <span>
            Hook image prompt
            <span style={{ fontWeight: 400, color: "var(--ui-text-2)", marginLeft: 8 }}>Sent to Recraft V3 when you click Preview</span>
          </span>
          {chevron(promptOpen)}
        </button>

        {promptOpen && (
          <div style={{ padding: "12px 16px 16px", borderTop: "1px solid var(--ui-border)" }}>
            <ChipRow label="Style">
              {IMAGE_STYLE_CHIPS.map((chip) => (
                <Chip key={chip.value} on={imageStyle === chip.value} onClick={() => onImageStyleChange?.(chip.value)}>{chip.label}</Chip>
              ))}
            </ChipRow>

            {/* Mood chips — controls the styleBlock appended after Claude's subject prompt. */}
            <ChipRow label="Mood">
              {MOOD_CHIPS.map((chip) => (
                <Chip key={chip.value ?? "auto"} on={moodId === chip.value || (chip.value === null && !moodId)} onClick={() => onMoodChange?.(chip.value)}>{chip.label}</Chip>
              ))}
            </ChipRow>
            {/* Contrast — this panel is the last stop before the FIRST hook image
                is generated, so the setting has to be reachable here and not only
                on the topic screen. Editorial Scientific only: elsewhere the
                image route never reads it. */}
            {isEditorialPreset(stylePreset) && (
              <ChipRow label="Contrast">
                {([
                  { value: "standard" as CarouselContrastMode, label: "Standard" },
                  { value: "high" as CarouselContrastMode, label: "Bold post" },
                ]).map((chip) => (
                  <Chip key={chip.value} on={contrastMode === chip.value} onClick={() => onContrastChange?.(chip.value)}>{chip.label}</Chip>
                ))}
                {contrastMode === "high" && (
                  <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>One bright subject on a dark ground, ivory type, one yellow phrase</span>
                )}
              </ChipRow>
            )}
            <p style={note}>Claude wrote this prompt for hook {selectedHook + 1}. Edit it directly, or add guidelines and regenerate.</p>
            <AutoTextarea
              value={imagePrompt}
              onChange={(e) => onImagePromptChange?.(e.target.value)}
              minHeight={84}
              placeholder="No image prompt generated yet"
              style={{
                width: "100%", fontSize: 13, lineHeight: 1.6,
                fontFamily: "inherit",
                color: imagePrompt ? "var(--ui-text)" : "var(--ui-text-3)",
                marginBottom: 12,
              }}
            />

            {/* Guidelines + regenerate */}
            <div style={well}>
              <Label kind="field">Guidelines (optional)</Label>
              <AutoTextarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                minHeight={40}
                placeholder="e.g. warmer tones, focus on water droplets, more abstract, moonlight scene"
                style={bare}
              />
            </div>

            {regenError && <p style={{ ...note, color: "var(--ui-danger)" }}>{regenError}</p>}

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Button variant="primary" size="sm" busy={regenerating} icon={<IcRefresh size={14} strokeWidth={1.75} />} onClick={handleRegeneratePrompt}>
                Generate 3 prompt directions
              </Button>
              <span style={{ fontSize: 12, color: "var(--ui-text-2)" }}>Prompts retune to the selected mood</span>
            </div>

            {/* Alternative prompt suggestions */}
            {alternatives.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Label kind="field">Two more directions, click one to use it</Label>
                {alternatives.map((alt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ui-focusable"
                    onClick={() => onImagePromptChange?.(alt)}
                    title="Use this prompt"
                    style={{
                      width: "100%", textAlign: "left",
                      background: "var(--ui-bg)",
                      border: "1px solid var(--ui-border)",
                      borderRadius: "var(--ui-radius-2)",
                      padding: "8px 12px",
                      marginBottom: 8,
                      fontSize: 12, fontFamily: "inherit",
                      color: "var(--ui-text)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      transition: "border-color var(--ui-dur-2) var(--ui-ease-out)",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, fontFamily: "var(--ui-font-mono)", color: "var(--ui-text-3)", flexShrink: 0, marginTop: 1 }}>
                      {String(i + 2).padStart(2, "0")}
                    </span>
                    <span>{alt}</span>
                  </button>
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

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: "var(--ui-text-2)", minWidth: 64, flexShrink: 0 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ on, onClick, title, children }: { on: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      title={title}
      onClick={onClick}
      className="ui-focusable"
      style={{
        height: 28, padding: "0 12px", borderRadius: "var(--ui-radius-2)", fontSize: 12, fontFamily: "inherit", cursor: "pointer",
        fontWeight: on ? 500 : 400,
        border: `1px solid ${on ? "var(--ui-text)" : "var(--ui-border)"}`,
        background: on ? "var(--ui-selection-tint)" : "var(--ui-bg)",
        color: on ? "var(--ui-text)" : "var(--ui-text-2)",
        transition: "border-color var(--ui-dur-1) var(--ui-ease-out), background-color var(--ui-dur-1) var(--ui-ease-out), color var(--ui-dur-1) var(--ui-ease-out)",
      }}
    >
      {children}
    </button>
  );
}
