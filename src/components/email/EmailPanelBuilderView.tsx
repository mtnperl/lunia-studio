"use client";
import { useEffect, useState } from "react";
import { EmailPanelCard, EmailPanelData, downloadPanelAsPng } from "@/components/email/EmailPanelCard";
import { getUpcomingEvents, LuniaCalendarEvent, EVENT_TYPE_COLORS } from "@/lib/lunia-calendar";

// ─── Loader ───────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];
const GEN_STEPS = [
  "READING TOPIC + GOAL",
  "CRAFTING PANEL 1 - HERO",
  "CRAFTING PANEL 2 - VALUE",
  "CRAFTING PANEL 3 - SUMMARY",
  "FINALIZING IMAGE PROMPTS",
];

function PanelGenerationLoader() {
  const [frame, setFrame] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 180);
    const t2 = setInterval(() => setStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 1400);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const spinner = SPINNER_FRAMES[frame];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        fontFamily: "'Courier New', Courier, monospace",
        background: "#000", color: "#fff",
        border: "3px solid #fff", borderRadius: 2,
        padding: "32px 36px", width: 460,
        position: "relative", overflow: "hidden", userSelect: "none",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.03) 3px,rgba(255,255,255,0.03) 4px)",
        }} />
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid #fff", paddingBottom: 10, marginBottom: 18,
          fontSize: 11, letterSpacing: "0.12em",
        }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>LUNIA.EXE</span>
          <span style={{ color: "#888" }}>claude-opus-4-6 · panel-builder</span>
          <span>{spinner}</span>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 4 }}>
            BUILDING 3-PANEL EMAIL
          </div>
          <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.06em" }}>
            Generating copy + image prompts for each panel
          </div>
        </div>
        <div style={{ borderTop: "1px solid #333", borderBottom: "1px solid #333", padding: "12px 0", marginBottom: 16 }}>
          {GEN_STEPS.map((s, i) => {
            const done = i < step, active = i === step;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 5,
                fontSize: 12, letterSpacing: "0.06em",
                color: done ? "#fff" : active ? "#fff" : "#444",
              }}>
                <span style={{ width: 16, flexShrink: 0 }}>{done ? "+" : active ? ">" : "."}</span>
                <span style={{ flex: 1 }}>{s}</span>
                <span style={{ fontSize: 11 }}>{done ? "DONE" : active ? `GEN${frame % 2 === 0 ? "..." : ".  "}` : ""}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
          <span>ANTHROPIC x LUNIA LIFE</span>
          <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>PROCESSING</span>
        </div>
      </div>
    </div>
  );
}

// ─── Saved projects ───────────────────────────────────────────────────────────

export type SavedPanelProject = {
  id: string;
  topic: string;
  emailGoal: string;
  panels: EmailPanelData[];
  savedAt: string;
};

export function loadSavedProjects(): SavedPanelProject[] {
  try {
    return JSON.parse(localStorage.getItem("lunia:panel-projects") ?? "[]");
  } catch { return []; }
}

export function deletePanelProject(id: string) {
  const existing = loadSavedProjects().filter(p => p.id !== id);
  localStorage.setItem("lunia:panel-projects", JSON.stringify(existing));
}

function savePanelProject(
  topic: string,
  emailGoal: string,
  panels: EmailPanelData[],
  existingId?: string,
): string {
  const id = existingId ?? `panels-${Date.now()}`;
  const project: SavedPanelProject = { id, topic, emailGoal, panels, savedAt: new Date().toISOString() };
  const rest = loadSavedProjects().filter(p => p.id !== id);
  rest.unshift(project);
  localStorage.setItem("lunia:panel-projects", JSON.stringify(rest.slice(0, 50)));
  return id;
}

// Sanitize em dashes from API responses + ensure new fields have defaults
const sanitizePanel = (p: EmailPanelData): EmailPanelData => ({
  ...p,
  subject:        p.subject.replace(/—/g, " - "),
  subSubject:     p.subSubject.replace(/—/g, " - "),
  body:           p.body.replace(/—/g, " - "),
  cta:            p.cta.replace(/—/g, " - "),
  imagePrompt:    p.imagePrompt.replace(/—/g, " - "),
  overlayEnabled: p.overlayEnabled ?? true,
  textBold:       p.textBold ?? false,
});

// ─── Panel preview card (used in preview step) ────────────────────────────────

const PREVIEW_BRAND = {
  cream: "#F7F4EF", navy: "#102635", navyMid: "#2c3f51", yellow: "#ffd800",
};
const PREVIEW_FONT = "Helvetica, Arial, sans-serif";
const PANEL_LABELS: Record<string, string> = {
  hero: "Panel 1 · Hero",
  value: "Panel 2 · Value",
  summary: "Panel 3 · Summary",
};

function PanelPreviewCard({ panel }: { panel: EmailPanelData }) {
  const isHero = panel.role === "hero";
  const fw = panel.textBold ? 700 : 400;
  const showOverlay = panel.overlayEnabled;

  return (
    <div style={{ width: "100%", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* Label */}
      <div style={{
        padding: "7px 14px",
        background: "var(--surface-r)", borderBottom: "1px solid var(--border)",
        fontFamily: "var(--font-mono)", fontSize: 9,
        color: "var(--subtle)", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {PANEL_LABELS[panel.role]}
      </div>

      {/* Visual */}
      <div style={{ position: "relative", width: "100%", paddingTop: "66.67%", background: "#1A1816", overflow: "hidden" }}>
        {panel.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={panel.imageUrl}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* Gradient overlay */}
        {showOverlay && (
          <div style={{
            position: "absolute", inset: 0,
            background: isHero
              ? "linear-gradient(to bottom, rgba(16,38,53,0.25) 0%, rgba(16,38,53,0.78) 100%)"
              : "linear-gradient(to bottom, transparent 20%, rgba(16,38,53,0.60) 55%, rgba(16,38,53,0.90) 100%)",
          }} />
        )}

        {/* Text */}
        {isHero ? (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "20px 28px", textAlign: "center",
          }}>
            {panel.subject && (
              <div style={{
                fontFamily: PREVIEW_FONT, fontSize: 22, fontWeight: fw,
                color: PREVIEW_BRAND.cream, lineHeight: 1.25, marginBottom: 8,
              }}>
                {panel.subject}
              </div>
            )}
            {panel.subSubject && (
              <div style={{
                fontFamily: PREVIEW_FONT, fontSize: 13, fontWeight: fw,
                color: "rgba(247,244,239,0.82)", lineHeight: 1.55, marginBottom: 14, maxWidth: "88%",
              }}>
                {panel.subSubject}
              </div>
            )}
            {panel.cta && (
              <div style={{
                padding: "9px 24px", borderRadius: 7,
                background: PREVIEW_BRAND.yellow, color: PREVIEW_BRAND.navy,
                fontFamily: PREVIEW_FONT, fontSize: 13, fontWeight: fw,
              }}>
                {panel.cta}
              </div>
            )}
            {!panel.imageUrl && !panel.subject && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>no image yet</span>
            )}
          </div>
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: "18px 20px",
          }}>
            {panel.subject && (
              <div style={{
                fontFamily: PREVIEW_FONT, fontSize: panel.role === "value" ? 17 : 19,
                fontWeight: fw, color: PREVIEW_BRAND.cream, lineHeight: 1.25, marginBottom: 5,
              }}>
                {panel.subject}
              </div>
            )}
            {panel.subSubject && (
              <div style={{
                fontFamily: PREVIEW_FONT, fontSize: 12, fontWeight: fw,
                color: "rgba(247,244,239,0.82)", lineHeight: 1.5,
                marginBottom: panel.role === "value" ? 7 : 10,
              }}>
                {panel.subSubject}
              </div>
            )}
            {panel.role === "value" && panel.body && (
              <div style={{
                fontFamily: PREVIEW_FONT, fontSize: 11, fontWeight: fw,
                color: "rgba(247,244,239,0.65)", lineHeight: 1.55,
                display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {panel.body}
              </div>
            )}
            {panel.role === "summary" && panel.cta && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <div style={{
                  padding: "9px 24px", borderRadius: 7,
                  background: PREVIEW_BRAND.yellow, color: PREVIEW_BRAND.navy,
                  fontFamily: PREVIEW_FONT, fontSize: 13, fontWeight: fw,
                }}>
                  {panel.cta}
                </div>
              </div>
            )}
            {!panel.imageUrl && !panel.subject && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>no image yet</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Step = "input" | "library" | "panels" | "preview";
type ImageLoadState = { loading: boolean; error: string | null };

type Props = {
  initialStep?: "input" | "library";
};

export default function EmailPanelBuilderView({ initialStep = "input" }: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [panelsOrigin, setPanelsOrigin] = useState<"input" | "library">(initialStep);

  const [topic, setTopic] = useState("");
  const [emailGoal, setEmailGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panels, setPanels] = useState<EmailPanelData[]>([]);
  const [imageState, setImageState] = useState<Record<string, ImageLoadState>>({});
  const [regeneratingText, setRegeneratingText] = useState<Record<string, boolean>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Calendar + library suggestions (input step)
  const [upcomingEvents, setUpcomingEvents] = useState<LuniaCalendarEvent[]>([]);
  const [recentProjects, setRecentProjects] = useState<SavedPanelProject[]>([]);

  // Library step
  const [allProjects, setAllProjects] = useState<SavedPanelProject[]>([]);

  useEffect(() => {
    setUpcomingEvents(getUpcomingEvents(3));
    setRecentProjects(loadSavedProjects().slice(0, 3));
  }, []);

  // Reload projects when entering library step
  useEffect(() => {
    if (step === "library") {
      setAllProjects(loadSavedProjects());
    }
  }, [step]);

  const canGenerate = topic.trim().length >= 3;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setSavedId(null);
    try {
      const res = await fetch("/api/email/generate-panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), emailGoal: emailGoal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      setPanels((data.panels as EmailPanelData[]).map(sanitizePanel));
      setImageState({});
      setRegeneratingText({});
      setPanelsOrigin("input");
      setStep("panels");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePanelChange(updated: EmailPanelData) {
    setPanels(prev => prev.map(p => p.id === updated.id ? updated : p));
    setSavedId(null);
  }

  async function handleGenerateImage(panelId: string) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel?.imagePrompt.trim()) return;
    setImageState(prev => ({ ...prev, [panelId]: { loading: true, error: null } }));
    try {
      const res = await fetch("/api/email/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePrompt: panel.imagePrompt, imageStyle: panel.imageStyle }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setImageState(prev => ({ ...prev, [panelId]: { loading: false, error: data.error ?? "Failed" } }));
        return;
      }
      setPanels(prev => prev.map(p => p.id === panelId ? { ...p, imageUrl: data.url } : p));
      setImageState(prev => ({ ...prev, [panelId]: { loading: false, error: null } }));
      setSavedId(null);
    } catch {
      setImageState(prev => ({ ...prev, [panelId]: { loading: false, error: "Network error" } }));
    }
  }

  async function handleRegenerateText(panelId: string) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    setRegeneratingText(prev => ({ ...prev, [panelId]: true }));
    try {
      const res = await fetch("/api/email/regenerate-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, emailGoal, role: panel.role }),
      });
      const data = await res.json();
      if (res.ok) {
        setPanels(prev => prev.map(p => p.id === panelId ? sanitizePanel({
          ...p,
          subject:     data.subject ?? p.subject,
          subSubject:  data.subSubject ?? p.subSubject,
          body:        data.body ?? p.body,
          cta:         data.cta ?? p.cta,
          imagePrompt: data.imagePrompt ?? p.imagePrompt,
        }) : p));
        setSavedId(null);
      }
    } catch { /* silent */ }
    setRegeneratingText(prev => ({ ...prev, [panelId]: false }));
  }

  function handleSave() {
    setSaving(true);
    try {
      const id = savePanelProject(topic, emailGoal, panels, savedId ?? undefined);
      setSavedId(id);
      // Refresh recent list
      setRecentProjects(loadSavedProjects().slice(0, 3));
    } finally { setSaving(false); }
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    for (const panel of panels) {
      await downloadPanelAsPng(panel);
      await new Promise(r => setTimeout(r, 300));
    }
    setDownloadingAll(false);
  }

  function loadProject(project: SavedPanelProject, origin: "input" | "library" = "input") {
    setTopic(project.topic);
    setEmailGoal(project.emailGoal);
    setPanels(project.panels.map(sanitizePanel));
    setImageState({});
    setRegeneratingText({});
    setSavedId(project.id);
    setPanelsOrigin(origin);
    setStep("panels");
  }

  function handleDeleteProject(id: string) {
    deletePanelProject(id);
    setAllProjects(loadSavedProjects());
    setRecentProjects(loadSavedProjects().slice(0, 3));
  }

  // ── Library step ────────────────────────────────────────────────────────────
  if (step === "library") {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => setStep("input")}
            style={{
              padding: "6px 14px", borderRadius: 7,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
              cursor: "pointer",
            }}
          >
            ← New Email
          </button>
          <div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 300,
              color: "var(--text)", margin: 0, letterSpacing: "-0.02em",
            }}>
              Saved Emails
            </h1>
          </div>
        </div>

        {allProjects.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center",
            border: "1px dashed var(--border)", borderRadius: 12,
          }}>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", marginBottom: 8 }}>
              No saved emails yet
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)" }}>
              Build a 3-panel email and click "Save" to add it here
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {allProjects.map(project => (
              <div
                key={project.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", borderRadius: 10,
                  background: "var(--surface-r)", border: "1px solid var(--border)",
                  transition: "border-color 0.12s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-strong)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}
              >
                {/* Panel image thumbnails */}
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  {project.panels.map(panel => (
                    <div key={panel.id} style={{
                      width: 36, height: 24, borderRadius: 4, overflow: "hidden",
                      background: "#1A1816", flexShrink: 0,
                    }}>
                      {panel.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={panel.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                    color: "var(--text)", lineHeight: 1.3, marginBottom: 2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {project.topic}
                  </div>
                  {project.emailGoal && (
                    <div style={{
                      fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {project.emailGoal}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div style={{
                  flexShrink: 0,
                  fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
                  letterSpacing: "0.05em",
                }}>
                  {new Date(project.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>

                {/* Edit button */}
                <button
                  onClick={() => loadProject(project, "library")}
                  style={{
                    flexShrink: 0,
                    padding: "5px 14px", borderRadius: 6,
                    background: "var(--accent-dim)", border: "1px solid var(--accent-mid)",
                    fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
                    color: "var(--accent)", cursor: "pointer",
                    transition: "all 0.12s",
                  }}
                >
                  Edit
                </button>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  title="Delete"
                  style={{
                    flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                    background: "var(--surface-h)", border: "1px solid var(--border)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--subtle)", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--error)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--error)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--subtle)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Input step ──────────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 40px 80px", position: "relative" }}>
        {loading && <PanelGenerationLoader />}

        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300,
            color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            3-Panel Email
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            Enter a topic. Claude generates copy + image prompts for Hero, Value, and Summary panels. Generate images, edit, then preview and download as PNG.
          </p>
        </div>

        {/* ── 2026 Calendar suggestions ── */}
        {upcomingEvents.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--subtle)", marginBottom: 8,
            }}>
              2026 Calendar - Next Upcoming
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {upcomingEvents.map((ev, i) => (
                <button
                  key={i}
                  onClick={() => setTopic(ev.suggestedTopic)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    background: topic === ev.suggestedTopic ? "var(--accent-dim)" : "var(--surface-r)",
                    border: topic === ev.suggestedTopic ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                    textAlign: "left", transition: "all 0.12s",
                  }}
                >
                  <div style={{
                    flexShrink: 0, width: 44,
                    fontFamily: "var(--font-mono)", fontSize: 9,
                    color: "var(--subtle)", letterSpacing: "0.06em",
                  }}>
                    {ev.date}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
                      color: "var(--text)", lineHeight: 1.3, marginBottom: 2,
                    }}>
                      {ev.event}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-ui)", fontSize: 11,
                      color: "var(--muted)", lineHeight: 1.3,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {ev.suggestedTopic}
                    </div>
                  </div>
                  <div style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)", fontSize: 8,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: EVENT_TYPE_COLORS[ev.type] ?? "var(--subtle)",
                    padding: "2px 6px", borderRadius: 4,
                    background: "var(--surface-h)",
                  }}>
                    {ev.type.split(" / ")[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent projects ── */}
        {recentProjects.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "var(--subtle)", marginBottom: 8,
            }}>
              Recent Projects
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => loadProject(project, "input")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                    background: "var(--surface-r)", border: "1px solid var(--border)",
                    textAlign: "left", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 500,
                      color: "var(--text)", lineHeight: 1.3, marginBottom: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {project.topic}
                    </div>
                    {project.emailGoal && (
                      <div style={{
                        fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--subtle)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {project.emailGoal}
                      </div>
                    )}
                  </div>
                  <div style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
                    letterSpacing: "0.05em",
                  }}>
                    {new Date(project.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div style={{
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--muted)",
                    letterSpacing: "0.06em",
                  }}>
                    Resume →
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Topic */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--muted)", marginBottom: 8,
          }}>
            Email Topic *
          </div>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && canGenerate) handleGenerate(); }}
            placeholder="e.g. Better sleep with magnesium glycinate"
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 400,
              color: "var(--text)", boxSizing: "border-box", outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Goal */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--muted)", marginBottom: 8,
          }}>
            Goal / Context
            <span style={{ color: "var(--subtle)", fontWeight: 400, marginLeft: 6 }}>optional</span>
          </div>
          <textarea
            value={emailGoal}
            onChange={e => setEmailGoal(e.target.value)}
            rows={2}
            placeholder="e.g. 20% off offer, targeting browse-but-not-bought customers"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 400,
              color: "var(--text)", lineHeight: 1.6,
              resize: "vertical", boxSizing: "border-box", outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Panel preview chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["Hero · Subject + CTA", "Value · Info", "Summary · Close + CTA"] as const).map((label, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 10px", borderRadius: 8,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Panel {i + 1}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", marginTop: 3, lineHeight: 1.3 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          style={{
            width: "100%", padding: "13px 28px", borderRadius: 10,
            cursor: loading || !canGenerate ? "not-allowed" : "pointer",
            background: loading || !canGenerate ? "var(--surface-h)" : "var(--accent)",
            border: "none",
            fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
            color: loading || !canGenerate ? "var(--muted)" : "var(--bg)",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Generating..." : "Generate 3 Panels"}
        </button>

        {error && (
          <div style={{
            marginTop: 14, padding: "10px 14px", borderRadius: 8,
            background: "rgba(184,92,92,0.08)", border: "1px solid var(--error)",
            color: "var(--error)", fontFamily: "var(--font-ui)", fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Preview step ─────────────────────────────────────────────────────────────
  if (step === "preview") {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 120px" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.08em", marginBottom: 5 }}>
            EMAIL PREVIEW
          </div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300,
            color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.01em",
          }}>
            {topic}
          </h2>
          {emailGoal && (
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.5 }}>
              {emailGoal}
            </div>
          )}
        </div>

        {/* Stacked panels — email-width container */}
        <div style={{
          maxWidth: 600, margin: "0 auto",
          display: "flex", flexDirection: "column", gap: 3,
          border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden",
        }}>
          {panels.map(panel => (
            <PanelPreviewCard key={panel.id} panel={panel} />
          ))}
        </div>

        {/* Hint */}
        <div style={{
          maxWidth: 600, margin: "12px auto 0",
          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)",
          letterSpacing: "0.06em", textAlign: "center",
        }}>
          600px wide · email standard · each panel exports as a separate PNG
        </div>

        {/* Sticky footer */}
        <div style={{
          position: "sticky", bottom: 0,
          background: "var(--bg)", borderTop: "1px solid var(--border)",
          padding: "14px 0",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
        }}>
          <button
            onClick={() => setStep("panels")}
            style={{
              padding: "8px 18px", borderRadius: 8,
              cursor: "pointer",
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
            }}
          >
            ← Edit
          </button>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              style={{
                padding: "8px 16px", borderRadius: 8,
                cursor: downloadingAll ? "not-allowed" : "pointer",
                background: "var(--surface-r)", border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)", fontSize: 13,
                color: downloadingAll ? "var(--subtle)" : "var(--muted)",
                display: "flex", alignItems: "center", gap: 6,
                opacity: downloadingAll ? 0.6 : 1, transition: "all 0.12s",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1v8M3 6.5l3 3 3-3M1 11h10" />
              </svg>
              {downloadingAll ? "Downloading..." : "Download All (3 PNGs)"}
            </button>

            <button
              onClick={handleSave}
              disabled={saving || !!savedId}
              style={{
                padding: "8px 24px", borderRadius: 8,
                cursor: saving || savedId ? "default" : "pointer",
                background: savedId ? "var(--success)" : "var(--accent)",
                border: "none",
                fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
                color: "#fff", transition: "all 0.15s",
              }}
            >
              {savedId ? "Saved" : saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Panels step (edit) ───────────────────────────────────────────────────────
  const anyImageLoading = Object.values(imageState).some(s => s.loading);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 120px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.08em", marginBottom: 5 }}>
          3-PANEL EMAIL
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300,
          color: "var(--text)", margin: "0 0 4px", letterSpacing: "-0.01em",
        }}>
          {topic}
        </h2>
        {emailGoal && (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.5 }}>
            {emailGoal}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {panels.map(panel => (
          <EmailPanelCard
            key={panel.id}
            panel={panel}
            onPanelChange={handlePanelChange}
            onGenerateImage={() => handleGenerateImage(panel.id)}
            onRegenerateText={() => handleRegenerateText(panel.id)}
            imageLoading={imageState[panel.id]?.loading ?? false}
            imageError={imageState[panel.id]?.error ?? null}
            regeneratingText={regeneratingText[panel.id] ?? false}
          />
        ))}
      </div>

      {/* Sticky footer */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--bg)", borderTop: "1px solid var(--border)",
        padding: "14px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
      }}>
        <button
          onClick={() => setStep(panelsOrigin)}
          disabled={anyImageLoading}
          style={{
            padding: "8px 18px", borderRadius: 8,
            cursor: anyImageLoading ? "not-allowed" : "pointer",
            background: "var(--surface-r)", border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)", fontSize: 13,
            color: anyImageLoading ? "var(--subtle)" : "var(--muted)",
          }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleSave}
            disabled={saving || !!savedId}
            style={{
              padding: "8px 18px", borderRadius: 8,
              cursor: saving || savedId ? "default" : "pointer",
              background: savedId ? "var(--surface-r)" : "var(--surface-r)",
              border: savedId ? "1px solid var(--success)" : "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13,
              color: savedId ? "var(--success)" : "var(--muted)",
              transition: "all 0.15s",
            }}
          >
            {savedId ? "Saved" : saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={() => setStep("preview")}
            disabled={anyImageLoading}
            style={{
              padding: "8px 20px", borderRadius: 8,
              cursor: anyImageLoading ? "not-allowed" : "pointer",
              background: anyImageLoading ? "var(--surface-h)" : "var(--accent)",
              border: "none",
              fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
              color: anyImageLoading ? "var(--muted)" : "var(--bg)",
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.12s",
            }}
          >
            Preview →
          </button>
        </div>
      </div>
    </div>
  );
}
