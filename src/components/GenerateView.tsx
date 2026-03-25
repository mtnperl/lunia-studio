"use client";
import { useState } from "react";
import { Script, FilmingNotes } from "@/lib/types";
import { generateId } from "@/lib/storage";

const PERSONAS = ["Wellness Creator", "Mom", "Biohacker", "Gen Z", "Professional", "Athlete", "Skeptic"];
const FORMATS = ["Voiceover", "Talking Head", "POV", "Day-in-Life", "Testimonial", "Comparison", "Educational"];
const ANGLES = ["Science-backed", "Personal story", "Problem/Solution", "Routine reveal", "Myth-bust", "Social proof"];

const LOADER_MSGS = [
  "Reading brief...",
  "Analyzing persona...",
  "Pulling brand rules...",
  "Drafting hooks...",
  "Writing script body...",
  "Checking for em-dashes...",
  "Removing cringe...",
  "Calibrating tone...",
  "Finalizing...",
];

type HookVariant = { num: number; type: string; text: string };

function parseOutput(raw: string): { hooks: HookVariant[]; scriptLines: string[]; filmingNotes: Partial<FilmingNotes> } {
  const hooks: HookVariant[] = [];
  const hookRe = /Hook\s+(\d+)\s*\[type:\s*([^\]]+)\]:\s*\n([^\n]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = hookRe.exec(raw)) !== null) {
    hooks.push({ num: parseInt(m[1]), type: m[2].trim(), text: m[3].trim() });
  }
  const scriptStart = raw.indexOf("SCRIPT");
  const filmingStart = raw.indexOf("FILMING NOTES");
  const scriptRaw = scriptStart >= 0 ? raw.slice(scriptStart + 6, filmingStart >= 0 ? filmingStart : undefined).trim() : "";
  const scriptLines = scriptRaw.split("\n").map((l) => l.trim()).filter(Boolean);
  const filmingNotes: Partial<FilmingNotes> = {};
  if (filmingStart >= 0) {
    const fn = raw.slice(filmingStart);
    const s = fn.match(/Setting:\s*(.+)/); if (s) filmingNotes.setting = s[1].trim();
    const e = fn.match(/Energy:\s*(.+)/); if (e) filmingNotes.energy = e[1].trim();
    const b = fn.match(/Key visual:\s*(.+)/); if (b) filmingNotes.broll = b[1].trim();
  }
  return { hooks, scriptLines, filmingNotes };
}

function RetroLoader({ streamText }: { streamText: string }) {
  const lines = LOADER_MSGS.slice(0, Math.max(1, Math.ceil((streamText.length / 800) * LOADER_MSGS.length)));
  return (
    <div className="loader-wrap" style={{ marginTop: 20 }}>
      <div className="hp-label">GEN PROGRESS</div>
      <div className="hp-track"><div className="hp-fill" /></div>
      <div className="loader-log">
        {lines.map((msg, i) => (
          <div key={i} className={i === lines.length - 1 ? "active" : ""}>
            {i === lines.length - 1 ? `> ${msg}` : `  ${msg} OK`}
            {i === lines.length - 1 && <span className="blink">_</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GenerateView({ onOpenEditor }: { onOpenEditor: (s: Script) => void }) {
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [format, setFormat] = useState(FORMATS[0]);
  const [angle, setAngle] = useState(ANGLES[0]);
  const [context, setContext] = useState("");
  const [creator, setCreator] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [done, setDone] = useState(false);
  const [selectedHook, setSelectedHook] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true); setDone(false); setStreamText(""); setSelectedHook(null); setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, persona, format, angle, context, creator }),
      });
      if (res.status === 429) throw new Error("Too many requests — try again in an hour.");
      if (!res.ok || !res.body) throw new Error("Generation failed — please try again.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        full += decoder.decode(value, { stream: true });
        setStreamText(full);
      }
      const p = parseOutput(full);
      if (p.hooks.length === 0) throw new Error("Model returned an unexpected format — try generating again.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally { setLoading(false); }
  }

  const parsed = done ? parseOutput(streamText) : null;

  function openInEditor() {
    if (!parsed || selectedHook === null) return;
    const hook = parsed.hooks.find((h) => h.num === selectedHook);
    onOpenEditor({
      id: generateId(), title: `${persona} · ${format} · ${angle}`,
      hook: hook?.text ?? "", lines: parsed.scriptLines, comments: {},
      filmingNotes: {},
      creator, status: "draft", persona, angle, format, savedAt: new Date().toISOString(),
    });
  }

  const canGenerate = topic.trim().length > 0;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Generate script</h1>
        <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>Fill in the brief and get 3 hooks + a full script.</p>
      </div>

      {/* Form */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        {/* Topic — required */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, letterSpacing: ".02em" }}>
            Topic <span style={{ color: "#e53e3e", fontWeight: 700 }}>*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Why magnesium beats melatonin for deep sleep"
            style={{ borderColor: topic.trim() ? "var(--border-strong)" : undefined }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Persona", value: persona, set: setPersona, opts: PERSONAS },
            { label: "Format", value: format, set: setFormat, opts: FORMATS },
            { label: "Angle", value: angle, set: setAngle, opts: ANGLES },
          ].map(({ label, value, set, opts }) => (
            <div key={label}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6, letterSpacing: ".02em" }}>{label}</label>
              <select value={value} onChange={(e) => set(e.target.value)}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>Creator name</label>
          <input type="text" value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="@handle or name" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
            Additional context <span style={{ fontWeight: 400, color: "var(--subtle)" }}>(optional)</span>
          </label>
          <textarea value={context} onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. creator mentions they have a 6-month-old, audience skews 30–40F..."
            rows={3} style={{ resize: "vertical" }} />
        </div>
        <button className="btn" onClick={generate} disabled={loading || !canGenerate} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "Generating..." : "Generate →"}
        </button>
      </div>

      {/* Retro loader */}
      {loading && <RetroLoader streamText={streamText} />}

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 6, color: "var(--error)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {done && parsed && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 12 }}>Choose a hook</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {parsed.hooks.map((h) => {
              const sel = selectedHook === h.num;
              return (
                <button key={h.num} onClick={() => setSelectedHook(h.num)} style={{
                  textAlign: "left", padding: 16, background: sel ? "var(--surface-r)" : "var(--surface)",
                  border: `1px solid ${sel ? "var(--accent-mid)" : "var(--border)"}`,
                  borderRadius: 8, cursor: "pointer", transition: "all .15s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sel ? "var(--accent)" : "var(--muted)" }}>HOOK {h.num}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3, background: sel ? "var(--accent-dim)" : "var(--surface-h)", color: sel ? "var(--accent)" : "var(--muted)" }}>{h.type}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 15, color: "var(--text)", lineHeight: 1.5 }}>{h.text}</p>
                </button>
              );
            })}
          </div>

          {/* Script preview */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".04em", textTransform: "uppercase" }}>Full script</span>
            </div>
            <div style={{ padding: 16, maxHeight: 340, overflowY: "auto" }}>
              {parsed.scriptLines.map((line, i) => {
                const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
                return isSection
                  ? <div key={i} style={{ margin: "12px 0 4px" }}><span className="section-label">{line.replace(/[[\]]/g, "")}</span></div>
                  : <p key={i} style={{ margin: "3px 0", fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{line}</p>;
              })}
            </div>
          </div>

          <button className="btn" onClick={openInEditor} disabled={selectedHook === null} style={{ width: "100%", justifyContent: "center" }}>
            Open in editor →
          </button>
          {selectedHook === null && <p style={{ textAlign: "center", fontSize: 12, color: "var(--subtle)", marginTop: 8 }}>Select a hook first</p>}
        </div>
      )}
    </div>
  );
}
