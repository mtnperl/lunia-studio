"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Script } from "@/lib/types";
import { saveScript } from "@/lib/storage";

function StatusChip({ status }: { status: Script["status"] }) {
  const cls = status === "review" ? "chip chip-review" : status === "locked" ? "chip chip-locked" : "chip chip-draft";
  const label = status === "review" ? "In Review" : status === "locked" ? "Locked" : "Draft";
  return <span className={cls}>{label}</span>;
}

function LockModal({ onConfirm, onClose }: { onConfirm: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Lock script</p>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 20, lineHeight: 1.5 }}>
          This makes the script permanently read-only and saves it to your library.
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>Final title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter final script title" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => { if (title) onConfirm(title); }}>Lock & save</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function AddCommentForm({ onAdd }: { onAdd: (author: string, text: string) => void }) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Your name"
        style={{ fontSize: 13 }}
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        rows={2}
        style={{ fontSize: 13, resize: "none" }}
      />
      <button
        className="btn"
        style={{ alignSelf: "flex-end", fontSize: 12, padding: "5px 14px" }}
        onClick={() => {
          if (author.trim() && text.trim()) {
            onAdd(author.trim(), text.trim());
            setText("");
          }
        }}
      >
        Add comment
      </button>
    </div>
  );
}

export default function EditorView({ script: initialScript, onUpdate }: {
  script: Script | null;
  onUpdate: (s: Script) => void;
}) {
  const [script, setScript] = useState<Script | null>(initialScript);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [lockModal, setLockModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setScript(initialScript); setIsDirty(false); setSelectedLine(null); }, [initialScript]);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (isDirty && script) {
        saveScript({ ...script, savedAt: new Date().toISOString() });
        setIsDirty(false);
      }
    }, 10000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [isDirty, script]);

  const update = useCallback((changes: Partial<Script>) => {
    setScript((prev) => prev ? { ...prev, ...changes } : prev);
    setIsDirty(true);
  }, []);

  function addComment(lineIdx: number, author: string, text: string) {
    if (!script) return;
    const existing = script.comments[lineIdx] ?? [];
    update({
      comments: {
        ...script.comments,
        [lineIdx]: [...existing, { author, text, time: new Date().toLocaleTimeString() }],
      },
    });
  }

  function handleLock(title: string) {
    if (!script) return;
    const locked: Script = { ...script, title, status: "locked", savedAt: new Date().toISOString() };
    setScript(locked);
    saveScript(locked);
    onUpdate(locked);
    setIsDirty(false);
    setLockModal(false);
  }

  function share() {
    if (script) saveScript({ ...script, savedAt: new Date().toISOString() });
    const url = `${window.location.origin}/scripts/${script?.id}`;
    const text = url;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    } else {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }
  }

  function copyScriptText() {
    if (!script) return;
    const lines = [
      `HOOK: ${script.hook}`,
      "",
      ...script.lines,
      "",
      "— FILMING NOTES —",
      `Setting: ${script.filmingNotes.setting}`,
      `Energy: ${script.filmingNotes.energy}`,
      `B-Roll: ${script.filmingNotes.broll}`,
      script.filmingNotes.director ? `Director notes: ${script.filmingNotes.director}` : "",
    ].filter((l) => l !== undefined);
    const text = lines.join("\n").trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2500); });
    } else {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2500);
    }
  }

  function getDuration(lines: string[]): string {
    const words = lines
      .filter((l) => !/^\[(HOOK|BODY|CTA)\]$/.test(l))
      .join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return "";
    const secs = Math.round((words / 130) * 60);
    return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 6) * 6}s`;
  }

  if (!script) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 500 }}>No script loaded</p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Generate a script or open one from your library.</p>
      </div>
    );
  }

  const isLocked = script.status === "locked";
  const selectedComments = selectedLine !== null ? (script.comments[selectedLine] ?? []) : [];

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Topbar */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <input
          type="text"
          value={script.title}
          onChange={(e) => update({ title: e.target.value })}
          readOnly={isLocked}
          style={{ flex: 1, fontWeight: 500, fontSize: 14, border: "none", background: "transparent", padding: 0, outline: "none" }}
        />
        <StatusChip status={script.status} />
        {!isLocked && (
          <button className="btn-ghost" onClick={() => setLockModal(true)} style={{ fontSize: 13, padding: "6px 12px" }}>
            Lock & save
          </button>
        )}
        {getDuration(script.lines) && (
          <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
            {getDuration(script.lines)}
          </span>
        )}
        <button className="btn-ghost" onClick={copyScriptText} style={{ fontSize: 13, padding: "6px 12px" }}>
          {scriptCopied ? "Copied!" : "Copy script"}
        </button>
        <button className="btn-ghost" onClick={share} style={{ fontSize: 13, padding: "6px 12px" }}>
          {copied ? "Link copied!" : "Share"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", minHeight: "calc(100vh - 100px)" }}>

        {/* ── Script pane ── */}
        <div style={{ borderRight: "1px solid var(--border)", padding: "20px 16px", overflowY: "auto" }}>
          <p className="section-label" style={{ marginBottom: 12, paddingLeft: 36 }}>Script — click a line to view notes</p>
          {script.lines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            const hasComments = (script.comments[i]?.length ?? 0) > 0;
            const isSelected = selectedLine === i;

            if (isSection) {
              return (
                <div key={i} style={{ margin: "18px 0 8px", paddingLeft: 36 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                    textTransform: "uppercase" as const, color: "var(--muted)",
                    background: "var(--surface)", padding: "2px 8px", borderRadius: 4,
                  }}>{line}</span>
                </div>
              );
            }

            return (
              <div
                key={i}
                onClick={() => setSelectedLine(isSelected ? null : i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  marginBottom: 2, cursor: "pointer", borderRadius: 6,
                  background: isSelected ? "#f0f4ff" : "transparent",
                  border: `1px solid ${isSelected ? "#c7d7fd" : "transparent"}`,
                  transition: "background .1s, border-color .1s",
                }}
              >
                {/* Line number */}
                <span style={{
                  fontSize: 11, minWidth: 28, paddingTop: 9, textAlign: "right" as const,
                  color: isSelected ? "#4f6ef7" : hasComments ? "var(--accent)" : "var(--subtle)",
                  fontWeight: isSelected || hasComments ? 600 : 400,
                  flexShrink: 0, userSelect: "none" as const,
                }}>
                  {i + 1}
                </span>

                {/* Editable line */}
                <textarea
                  value={line}
                  readOnly={isLocked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const newLines = [...script.lines];
                    newLines[i] = e.target.value;
                    update({ lines: newLines });
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onFocus={() => setSelectedLine(i)}
                  rows={1}
                  style={{
                    flex: 1, fontSize: 14, resize: "none", overflow: "hidden",
                    background: "transparent", border: "none", outline: "none",
                    padding: "6px 8px", lineHeight: 1.6, minHeight: 34,
                    cursor: isLocked ? "default" : "text",
                  }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = t.scrollHeight + "px";
                  }}
                />

                {/* Comment dot indicator */}
                {hasComments && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#4f6ef7",
                    flexShrink: 0, marginTop: 14, marginRight: 6,
                  }} title={`${script.comments[i].length} comment${script.comments[i].length !== 1 ? "s" : ""}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Detail panel ── */}
        <div style={{ overflowY: "auto", background: "var(--surface)", display: "flex", flexDirection: "column" }}>

          {selectedLine !== null ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Selected line preview */}
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
                <p className="section-label" style={{ marginBottom: 6 }}>Line {selectedLine + 1}</p>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  {script.lines[selectedLine] || <span style={{ color: "var(--subtle)" }}>Empty line</span>}
                </p>
              </div>

              {/* Comments for this line */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                <p className="section-label" style={{ marginBottom: 10 }}>
                  Comments {selectedComments.length > 0 && <span style={{ fontWeight: 400, color: "var(--subtle)" }}>({selectedComments.length})</span>}
                </p>

                {selectedComments.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No comments on this line yet.</p>
                ) : (
                  <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedComments.map((c, ci) => (
                      <div key={ci} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{c.author}</span>
                          <span style={{ fontSize: 11, color: "var(--subtle)" }}>{c.time}</span>
                        </div>
                        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  <AddCommentForm onAdd={(a, t) => addComment(selectedLine, a, t)} />
                )}
              </div>

              {/* Filming notes */}
              <div style={{ padding: "14px 16px", flex: 1 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>Filming notes</p>
                {(["setting", "energy", "broll", "director"] as const).map((field) => (
                  <div key={field} style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>
                      {field === "broll" ? "B-Roll" : field === "director" ? "Director notes" : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <textarea
                      value={script.filmingNotes[field]}
                      readOnly={isLocked}
                      onChange={(e) => update({ filmingNotes: { ...script.filmingNotes, [field]: e.target.value } })}
                      rows={2}
                      style={{ fontSize: 13, resize: "vertical", background: "var(--bg)" }}
                    />
                  </div>
                ))}
              </div>
            </div>

          ) : (
            /* No line selected */
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid var(--border)" }}>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                  Click any line in the script to view comments and filming notes.
                </p>
              </div>

              {/* Global filming notes still visible when nothing selected */}
              <div style={{ padding: "14px 16px", flex: 1 }}>
                <p className="section-label" style={{ marginBottom: 12 }}>Filming notes</p>
                {(["setting", "energy", "broll", "director"] as const).map((field) => (
                  <div key={field} style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>
                      {field === "broll" ? "B-Roll" : field === "director" ? "Director notes" : field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <textarea
                      value={script.filmingNotes[field]}
                      readOnly={isLocked}
                      onChange={(e) => update({ filmingNotes: { ...script.filmingNotes, [field]: e.target.value } })}
                      rows={2}
                      style={{ fontSize: 13, resize: "vertical", background: "var(--bg)" }}
                    />
                  </div>
                ))}

                {/* Meta */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Creator</label>
                    <input type="text" value={script.creator} readOnly={isLocked} onChange={(e) => update({ creator: e.target.value })} style={{ fontSize: 13, background: "var(--bg)" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Status</label>
                    <select value={script.status} disabled={isLocked} onChange={(e) => update({ status: e.target.value as Script["status"] })} style={{ fontSize: 13, background: "var(--bg)" }}>
                      <option value="draft">Draft</option>
                      <option value="review">In Review</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {lockModal && <LockModal onConfirm={handleLock} onClose={() => setLockModal(false)} />}
    </div>
  );
}
