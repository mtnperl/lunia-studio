"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Script, Comment } from "@/lib/types";
import { saveScript } from "@/lib/storage";

function StatusChip({ status }: { status: Script["status"] }) {
  const cls = status === "review" ? "chip chip-review" : status === "locked" ? "chip chip-locked" : "chip chip-draft";
  const label = status === "review" ? "In Review" : status === "locked" ? "Locked" : "Draft";
  return <span className={cls}>{label}</span>;
}

function CommentModal({
  lineIndex, lineText, onClose, onAdd,
}: { lineIndex: number; lineText: string; onClose: () => void; onAdd: (author: string, text: string) => void }) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Add Comment — Line {lineIndex + 1}
        </p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px", marginBottom: 16, fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>
          {lineText}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>Your name</label>
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Name or @handle" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 6 }}>Comment</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => { if (author && text) { onAdd(author, text); onClose(); } }}>Add comment</button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
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

export default function EditorView({ script: initialScript, onUpdate }: {
  script: Script | null;
  onUpdate: (s: Script) => void;
}) {
  const [script, setScript] = useState<Script | null>(initialScript);
  const [isDirty, setIsDirty] = useState(false);
  const [commentModal, setCommentModal] = useState<number | null>(null);
  const [lockModal, setLockModal] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setScript(initialScript); setIsDirty(false); }, [initialScript]);

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

  function addReply(lineIdx: number, author: string, text: string) {
    addComment(lineIdx, author, text);
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
    if (script) {
      const saved = { ...script, savedAt: new Date().toISOString() };
      saveScript(saved);
    }
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!script) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)" }}>No script loaded</p>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Generate a script or open one from your library.</p>
      </div>
    );
  }

  const isLocked = script.status === "locked";
  const lineCommentCounts = Object.fromEntries(
    Object.entries(script.comments).map(([k, v]) => [k, v.length])
  );
  const linesWithComments = Object.keys(script.comments).filter((k) => script.comments[parseInt(k)]?.length > 0).map(Number);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Topbar */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, background: "var(--bg)" }}>
        <input
          type="text"
          value={script.title}
          onChange={(e) => update({ title: e.target.value })}
          readOnly={isLocked}
          style={{ flex: 1, fontWeight: 500, fontSize: 14, border: "none", background: "transparent", padding: 0, outline: "none", width: "auto" }}
        />
        <StatusChip status={script.status} />
        <button className="btn-ghost" onClick={share} style={{ fontSize: 13, padding: "6px 12px" }}>
          {copied ? "Copied!" : "Share"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px 220px", minHeight: "calc(100vh - 140px)" }}>
        {/* Script pane */}
        <div style={{ borderRight: "1px solid var(--border)", padding: 20, overflowY: "auto" }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Script</p>
          {script.lines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            const hasComments = (lineCommentCounts[i] ?? 0) > 0;
            if (isSection) {
              return (
                <div key={i} style={{ margin: "16px 0 8px", paddingLeft: 36 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--muted)", background: "var(--surface)", padding: "2px 8px", borderRadius: 4 }}>{line}</span>
                </div>
              );
            }
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 2, position: "relative" }}
              >
                <span style={{
                  fontSize: 11, minWidth: 28, paddingTop: 9, textAlign: "right" as const,
                  color: hasComments ? "var(--accent)" : "var(--subtle)",
                  fontWeight: hasComments ? 600 : 400,
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <textarea
                  value={line}
                  readOnly={isLocked}
                  onChange={(e) => {
                    const newLines = [...script.lines];
                    newLines[i] = e.target.value;
                    update({ lines: newLines });
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  rows={1}
                  style={{
                    flex: 1, fontSize: 14, resize: "none", overflow: "hidden",
                    background: hoveredLine === i ? "var(--surface)" : "transparent",
                    border: "1px solid transparent",
                    borderColor: hoveredLine === i ? "var(--border)" : "transparent",
                    borderRadius: 6,
                    padding: "6px 8px", lineHeight: 1.6,
                    minHeight: 34,
                    transition: "background .1s, border-color .1s",
                  }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = t.scrollHeight + "px";
                  }}
                />
                {hoveredLine === i && !isLocked && (
                  <button
                    onClick={() => setCommentModal(i)}
                    style={{
                      fontSize: 12, fontWeight: 500, background: "var(--surface)", color: "var(--muted)",
                      border: "1px solid var(--border)", borderRadius: 4,
                      width: 24, height: 24, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 6,
                    }}
                    title="Add comment"
                  >+</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Comment pane */}
        <div style={{ borderRight: "1px solid var(--border)", padding: 16, overflowY: "auto" }}>
          <p className="section-label" style={{ marginBottom: 12 }}>Comments</p>
          {linesWithComments.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>No comments yet. Hover a line and click + to add one.</p>
          ) : (
            linesWithComments.sort((a, b) => a - b).map((lineIdx) => {
              const comments = script.comments[lineIdx] ?? [];
              return (
                <div key={lineIdx} style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: "var(--surface)", padding: "6px 10px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>Line {lineIdx + 1}</span>
                    <span style={{ fontSize: 11, color: "var(--subtle)" }}>{comments.length}</span>
                  </div>
                  {comments.map((c, ci) => (
                    <div key={ci} style={{ padding: "10px 12px", borderBottom: ci < comments.length - 1 ? "1px solid var(--border)" : undefined }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.author}</span>
                        <span style={{ fontSize: 11, color: "var(--subtle)" }}>{c.time}</span>
                      </div>
                      <p style={{ fontSize: 13, margin: 0, color: "var(--text)", lineHeight: 1.5 }}>{c.text}</p>
                    </div>
                  ))}
                  {!isLocked && (
                    <ReplyInput onAdd={(a, t) => addReply(lineIdx, a, t)} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar */}
        <div style={{ padding: 16, overflowY: "auto", background: "var(--surface)" }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Selected hook</p>
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg)", marginBottom: 20, fontSize: 13, lineHeight: 1.6, color: "var(--text)" }}>
            {script.hook}
          </div>

          <p className="section-label" style={{ marginBottom: 10 }}>Filming notes</p>
          {(["setting", "wardrobe", "broll", "director"] as const).map((field) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>
                {field === "broll" ? "B-Roll" : field === "director" ? "Director notes" : field.charAt(0).toUpperCase() + field.slice(1)}
              </label>
              <textarea
                value={script.filmingNotes[field]}
                readOnly={isLocked}
                onChange={(e) => update({ filmingNotes: { ...script.filmingNotes, [field]: e.target.value } })}
                rows={2}
                style={{ fontSize: 13, resize: "vertical" }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Creator</label>
            <input type="text" value={script.creator} readOnly={isLocked} onChange={(e) => update({ creator: e.target.value })} style={{ fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Status</label>
            <select
              value={script.status}
              disabled={isLocked}
              onChange={(e) => update({ status: e.target.value as Script["status"] })}
              style={{ fontSize: 13 }}
            >
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
            </select>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            {isLocked
              ? <p style={{ fontSize: 13, color: "var(--muted)" }}>Script is locked.</p>
              : (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
                    Locking is permanent and saves the script to your library.
                  </p>
                  <button className="btn" onClick={() => setLockModal(true)} style={{ width: "100%", justifyContent: "center" }}>
                    Lock & save
                  </button>
                </>
              )
            }
          </div>
        </div>
      </div>

      {commentModal !== null && (
        <CommentModal
          lineIndex={commentModal}
          lineText={script.lines[commentModal]}
          onClose={() => setCommentModal(null)}
          onAdd={(a, t) => addComment(commentModal, a, t)}
        />
      )}
      {lockModal && <LockModal onConfirm={handleLock} onClose={() => setLockModal(false)} />}
    </div>
  );
}

function ReplyInput({ onAdd }: { onAdd: (a: string, t: string) => void }) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" style={{ fontSize: 12, padding: "4px 8px" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply..." style={{ flex: 1, fontSize: 12, padding: "4px 8px" }} />
        <button
          className="btn"
          style={{ fontSize: 12, padding: "4px 10px" }}
          onClick={() => { if (author && text) { onAdd(author, text); setAuthor(""); setText(""); } }}
        >↵</button>
      </div>
    </div>
  );
}
