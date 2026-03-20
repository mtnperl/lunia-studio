"use client";
import { useState } from "react";
import { Script, FilmingNotes } from "@/lib/types";
import { generateId } from "@/lib/storage";

const PERSONAS = ["Wellness Creator", "Mom", "Biohacker", "Gen Z", "Professional", "Athlete", "Skeptic"];
const FORMATS = ["Voiceover", "Talking Head", "POV", "Day-in-Life", "Testimonial", "Comparison"];
const ANGLES = ["Science-backed", "Personal story", "Problem/Solution", "Routine reveal", "Myth-bust", "Social proof"];

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
  const scriptRaw = scriptStart >= 0
    ? raw.slice(scriptStart + 6, filmingStart >= 0 ? filmingStart : undefined).trim()
    : "";

  const scriptLines = scriptRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const filmingNotes: Partial<FilmingNotes> = {};
  if (filmingStart >= 0) {
    const fn = raw.slice(filmingStart);
    const settingM = fn.match(/Setting:\s*(.+)/);
    const wardrobeM = fn.match(/Energy:\s*(.+)/);
    const brollM = fn.match(/Key visual:\s*(.+)/);
    if (settingM) filmingNotes.setting = settingM[1].trim();
    if (wardrobeM) filmingNotes.wardrobe = wardrobeM[1].trim();
    if (brollM) filmingNotes.broll = brollM[1].trim();
  }

  return { hooks, scriptLines, filmingNotes };
}

export default function GenerateView({
  onOpenEditor,
}: {
  onOpenEditor: (script: Script) => void;
}) {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, format, angle, context, creator }),
      });
      if (!res.ok || !res.body) throw new Error("Generation failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        full += decoder.decode(value, { stream: true });
        setStreamText(full);
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const parsed = done ? parseOutput(streamText) : null;

  function openInEditor() {
    if (!parsed || selectedHook === null) return;
    const hook = parsed.hooks.find((h) => h.num === selectedHook);
    const script: Script = {
      id: generateId(),
      title: `${persona} ${format} — ${angle}`,
      hook: hook?.text ?? "",
      lines: parsed.scriptLines,
      comments: {},
      filmingNotes: {
        setting: parsed.filmingNotes.setting ?? "",
        wardrobe: parsed.filmingNotes.wardrobe ?? "",
        broll: parsed.filmingNotes.broll ?? "",
        director: "",
      },
      creator,
      status: "draft",
      persona,
      angle,
      format,
      savedAt: new Date().toISOString(),
    };
    onOpenEditor(script);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-20 animate-slide-in">
      {/* Header */}
      <div className="mb-8">
        <p style={{ fontFamily: "var(--font-pixel)", fontSize: 11, letterSpacing: "0.15em" }}>
          GENERATE SCRIPT<span className="animate-blink">_</span>
        </p>
        <p style={{ fontFamily: "var(--font-crt)", fontSize: 18, color: "var(--gray4)", marginTop: 6 }}>
          Fill out the brief and generate three hook variants + a full script.
        </p>
      </div>

      {/* Form */}
      <div style={{ border: "2px solid var(--black)", padding: 24, boxShadow: "4px 4px 0 var(--black)", background: "var(--white)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "PERSONA", value: persona, set: setPersona, opts: PERSONAS },
            { label: "FORMAT", value: format, set: setFormat, opts: FORMATS },
            { label: "ANGLE", value: angle, set: setAngle, opts: ANGLES },
          ].map(({ label, value, set, opts }) => (
            <div key={label}>
              <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6, letterSpacing: "0.1em" }}>{label}</label>
              <select value={value} onChange={(e) => set(e.target.value)}>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6, letterSpacing: "0.1em" }}>CREATOR NAME</label>
          <input type="text" value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="@handle or name" />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6, letterSpacing: "0.1em" }}>ADDITIONAL CONTEXT <span style={{ color: "var(--gray4)" }}>(OPTIONAL)</span></label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="e.g. creator mentions they have a 6-month-old, audience skews 30-40F..."
            rows={3}
            style={{ resize: "vertical" }}
          />
        </div>

        <button className="btn-pixel" onClick={generate} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
          {loading ? "GENERATING..." : "GENERATE SCRIPT ▶"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ marginTop: 24, border: "2px solid var(--black)", padding: 16, boxShadow: "4px 4px 0 var(--black)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)" }}>GEN</span>
            <div className="hp-bar-track" style={{ flex: 1 }}>
              <div className="hp-bar-fill" />
            </div>
          </div>
          <p style={{ fontFamily: "var(--font-crt)", fontSize: 16, color: "var(--gray4)" }}>
            GENERATING<span className="animate-blink">...</span>
          </p>
          <pre style={{ fontFamily: "var(--font-crt)", fontSize: 16, whiteSpace: "pre-wrap", color: "var(--gray5)", marginTop: 8, maxHeight: 200, overflow: "auto" }}>
            {streamText}
          </pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, border: "2px solid var(--black)", padding: 12, background: "var(--gray1)" }}>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--black)" }}>ERROR: {error}</p>
        </div>
      )}

      {/* Results */}
      {done && parsed && (
        <div style={{ marginTop: 24 }}>
          {/* Hook variants */}
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 7, marginBottom: 12, letterSpacing: "0.1em" }}>SELECT A HOOK</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {parsed.hooks.map((h) => {
              const selected = selectedHook === h.num;
              return (
                <button
                  key={h.num}
                  onClick={() => setSelectedHook(h.num)}
                  style={{
                    background: selected ? "var(--black)" : "var(--white)",
                    color: selected ? "var(--white)" : "var(--black)",
                    border: `2px solid var(--black)`,
                    padding: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: selected ? "none" : "4px 4px 0 var(--black)",
                    transform: selected ? "translate(4px,4px)" : "none",
                    transition: "all 0.08s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7 }}>HOOK {h.num}</span>
                    <span style={{
                      fontFamily: "var(--font-pixel)", fontSize: 5,
                      background: selected ? "var(--gray5)" : "var(--gray2)",
                      color: selected ? "var(--white)" : "var(--gray5)",
                      padding: "2px 6px", border: `1px solid ${selected ? "var(--gray4)" : "var(--gray3)"}`
                    }}>{h.type.toUpperCase()}</span>
                  </div>
                  <p style={{ fontFamily: "var(--font-crt)", fontSize: 20, margin: 0, lineHeight: 1.3 }}>{h.text}</p>
                </button>
              );
            })}
          </div>

          {/* Script preview */}
          <div style={{ border: "2px solid var(--black)", boxShadow: "4px 4px 0 var(--black)", marginBottom: 20 }}>
            <div style={{ background: "var(--black)", padding: "8px 14px" }}>
              <span style={{ fontFamily: "var(--font-pixel)", fontSize: 7, color: "var(--white)", letterSpacing: "0.1em" }}>FULL SCRIPT</span>
            </div>
            <div style={{ padding: 16, maxHeight: 320, overflowY: "auto" }}>
              {parsed.scriptLines.map((line, i) => {
                const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
                return isSection
                  ? <div key={i} style={{ margin: "10px 0 6px" }}><span className="section-divider">{line}</span></div>
                  : <p key={i} style={{ fontFamily: "var(--font-crt)", fontSize: 18, margin: "4px 0", lineHeight: 1.5 }}>{line}</p>;
              })}
            </div>
          </div>

          <button
            className="btn-pixel"
            onClick={openInEditor}
            disabled={selectedHook === null}
            style={{ width: "100%", justifyContent: "center" }}
          >
            OPEN IN EDITOR →
          </button>
          {selectedHook === null && (
            <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)", textAlign: "center", marginTop: 8 }}>
              SELECT A HOOK FIRST
            </p>
          )}
        </div>
      )}
    </div>
  );
}
