"use client";
import { useEffect, useState } from "react";
import { EmailPanelCard, EmailPanelData, downloadPanelAsPng } from "@/components/email/EmailPanelCard";

// ─── Loader ───────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["◢◣◤◥", "◣◤◥◢", "◤◥◢◣", "◥◢◣◤"];
const GEN_STEPS = [
  "READING TOPIC + GOAL",
  "CRAFTING PANEL 1 — HERO",
  "CRAFTING PANEL 2 — VALUE",
  "CRAFTING PANEL 3 — SUMMARY",
  "FINALIZING IMAGE PROMPTS",
];

function PanelGenerationLoader() {
  const [frame, setFrame] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const spinTimer = setInterval(() => setFrame(f => (f + 1) % SPINNER_FRAMES.length), 180);
    const stepTimer = setInterval(() => setStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 1400);
    return () => { clearInterval(spinTimer); clearInterval(stepTimer); };
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
          <span style={{ fontWeight: 700, fontSize: 13 }}>◆ LUNIA.EXE</span>
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
            const done = i < step;
            const active = i === step;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 5,
                fontSize: 12, letterSpacing: "0.06em",
                color: done ? "#fff" : active ? "#fff" : "#444",
              }}>
                <span style={{ width: 16, flexShrink: 0 }}>
                  {done ? "✓" : active ? ">" : "·"}
                </span>
                <span style={{ flex: 1 }}>{s}</span>
                <span style={{ fontSize: 11 }}>
                  {done ? "DONE" : active ? `GEN${frame % 2 === 0 ? "..." : ".  "}` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#555", letterSpacing: "0.1em" }}>
          <span>ANTHROPIC × LUNIA LIFE</span>
          <span style={{ color: frame % 2 === 0 ? "#fff" : "#555" }}>● PROCESSING</span>
        </div>
      </div>
    </div>
  );
}

// ─── Save helpers ─────────────────────────────────────────────────────────────

type SavedPanelProject = {
  id: string;
  topic: string;
  emailGoal: string;
  panels: EmailPanelData[];
  savedAt: string;
};

function savePanelProject(topic: string, emailGoal: string, panels: EmailPanelData[]): string {
  const id = `panels-${Date.now()}`;
  const project: SavedPanelProject = { id, topic, emailGoal, panels, savedAt: new Date().toISOString() };
  const existing: SavedPanelProject[] = JSON.parse(localStorage.getItem("lunia:panel-projects") ?? "[]");
  existing.unshift(project);
  localStorage.setItem("lunia:panel-projects", JSON.stringify(existing.slice(0, 50)));
  return id;
}

// ─── Main view ────────────────────────────────────────────────────────────────

type ImageLoadState = { loading: boolean; error: string | null };

export default function EmailPanelBuilderView() {
  const [step, setStep] = useState<"input" | "panels">("input");
  const [topic, setTopic] = useState("");
  const [emailGoal, setEmailGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panels, setPanels] = useState<EmailPanelData[]>([]);
  const [imageState, setImageState] = useState<Record<string, ImageLoadState>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

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
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }
      setPanels(data.panels);
      setImageState({});
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
    if (!panel || !panel.imagePrompt.trim()) return;
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

  function handleSave() {
    setSaving(true);
    try {
      const id = savePanelProject(topic, emailGoal, panels);
      setSavedId(id);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadAll() {
    setDownloadingAll(true);
    for (const panel of panels) {
      await downloadPanelAsPng(panel);
      // Small gap between downloads so browser doesn't batch them
      await new Promise(r => setTimeout(r, 300));
    }
    setDownloadingAll(false);
  }

  // ── Input step ──────────────────────────────────────────────────────────────
  if (step === "input") {
    return (
      <div
        style={{ maxWidth: 640, margin: "0 auto", padding: "56px 40px 80px", position: "relative" }}
      >
        {loading && <PanelGenerationLoader />}

        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300,
            color: "var(--text)", margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.2,
          }}>
            3-Panel Email Builder
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            Enter a topic and Claude generates copy + image prompts for 3 panels: Hero, Value, Summary. Generate images, edit text, then download as PNG.
          </p>
        </div>

        {/* Topic field */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
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
              fontFamily: "var(--font-ui)", fontSize: 15, fontWeight: 500,
              color: "var(--text)", boxSizing: "border-box", outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>

        {/* Goal / context field */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "var(--muted)", marginBottom: 8,
          }}>
            Email Goal / Context
            <span style={{ color: "var(--subtle)", fontWeight: 400, marginLeft: 6 }}>(optional)</span>
          </div>
          <textarea
            value={emailGoal}
            onChange={e => setEmailGoal(e.target.value)}
            rows={3}
            placeholder="e.g. Promote our new sleep formula, target customers who've browsed but not bought. Run a 20% off offer."
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13,
              color: "var(--text)", lineHeight: 1.6,
              resize: "vertical", boxSizing: "border-box", outline: "none",
              transition: "border-color 0.12s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", marginTop: 5, letterSpacing: "0.06em" }}>
            Mention the offer, audience, or angle — Claude will keep all 3 panels on-brief
          </div>
        </div>

        {/* Panel preview chips */}
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {(["Hero · Subject + CTA", "Value · Product info", "Summary · Close + CTA"] as const).map((label, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--subtle)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Panel {i + 1}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Generate button */}
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
          {loading ? "Generating..." : "Generate 3 Panels →"}
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

  // ── Panels step ─────────────────────────────────────────────────────────────
  const anyImageLoading = Object.values(imageState).some(s => s.loading);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 120px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.08em", marginBottom: 6 }}>
          3-PANEL EMAIL
        </div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 300,
          color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.01em",
        }}>
          {topic}
        </h2>
        {emailGoal && (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--subtle)", lineHeight: 1.5 }}>
            {emailGoal}
          </div>
        )}
      </div>

      {/* Panel cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {panels.map(panel => (
          <EmailPanelCard
            key={panel.id}
            panel={panel}
            onPanelChange={handlePanelChange}
            onGenerateImage={() => handleGenerateImage(panel.id)}
            imageLoading={imageState[panel.id]?.loading ?? false}
            imageError={imageState[panel.id]?.error ?? null}
          />
        ))}
      </div>

      {/* Sticky footer */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--bg)", borderTop: "1px solid var(--border)",
        padding: "14px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 10,
      }}>
        <button
          onClick={() => { setStep("input"); setSavedId(null); }}
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
          {/* Download all */}
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll || anyImageLoading}
            style={{
              padding: "8px 16px", borderRadius: 8,
              cursor: downloadingAll || anyImageLoading ? "not-allowed" : "pointer",
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13,
              color: downloadingAll ? "var(--subtle)" : "var(--muted)",
              display: "flex", alignItems: "center", gap: 6,
              opacity: downloadingAll ? 0.6 : 1,
              transition: "all 0.12s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 1v8M3.5 6.5l3 3 3-3M1 11h11" />
            </svg>
            {downloadingAll ? "Downloading..." : "Download All PNGs"}
          </button>

          {/* Save */}
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
            {savedId ? "✓ Saved" : saving ? "Saving..." : "Save Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
