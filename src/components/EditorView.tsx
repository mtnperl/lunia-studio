"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Script, Comment } from "@/lib/types";
import { saveScript } from "@/lib/storage";

function StatusChip({ status }: { status: Script["status"] }) {
  return <span className={`status-${status === "review" ? "review" : status}`}>{status === "review" ? "IN REVIEW" : status.toUpperCase()}</span>;
}

function CommentModal({
  lineIndex, lineText, onClose, onAdd,
}: { lineIndex: number; lineText: string; onClose: () => void; onAdd: (author: string, text: string) => void }) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <p style={{ fontFamily: "var(--font-pixel)", fontSize: 8, marginBottom: 14, letterSpacing: "0.1em" }}>ADD COMMENT — LINE {lineIndex + 1}</p>
        <div style={{ background: "var(--gray1)", border: "2px solid var(--black)", padding: "10px 12px", marginBottom: 16 }}>
          <p style={{ fontFamily: "var(--font-crt)", fontSize: 18, margin: 0 }}>{lineText}</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6 }}>YOUR NAME</label>
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Name or @handle" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6 }}>COMMENT</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-pixel" onClick={() => { if (author && text) { onAdd(author, text); onClose(); } }}>ADD</button>
          <button className="btn-ghost" onClick={onClose}>CANCEL</button>
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
        <p style={{ fontFamily: "var(--font-pixel)", fontSize: 8, marginBottom: 14 }}>LOCK SCRIPT</p>
        <p style={{ fontFamily: "var(--font-crt)", fontSize: 17, color: "var(--gray5)", marginBottom: 16 }}>
          This will make the script permanently read-only and save it to the library.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: "var(--font-pixel)", fontSize: 6, display: "block", marginBottom: 6 }}>FINAL TITLE</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter final script title" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-pixel" onClick={() => { if (title) onConfirm(title); }}>LOCK + SAVE ■</button>
          <button className="btn-ghost" onClick={onClose}>CANCEL</button>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 16 }}>
        <p style={{ fontFamily: "var(--font-pixel)", fontSize: 10, letterSpacing: "0.15em", color: "var(--gray4)" }}>NO SCRIPT LOADED</p>
        <p style={{ fontFamily: "var(--font-crt)", fontSize: 18, color: "var(--gray3)" }}>Generate a script or open one from the library.</p>
      </div>
    );
  }

  const isLocked = script.status === "locked";
  const lineCommentCounts = Object.fromEntries(
    Object.entries(script.comments).map(([k, v]) => [k, v.length])
  );
  const linesWithComments = Object.keys(script.comments).filter((k) => script.comments[parseInt(k)]?.length > 0).map(Number);

  return (
    <div className="animate-slide-in" style={{ paddingBottom: 80 }}>
      {/* Topbar */}
      <div style={{ borderBottom: "2px solid var(--black)", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, background: "var(--gray1)" }}>
        <input
          type="text"
          value={script.title}
          onChange={(e) => update({ title: e.target.value })}
          readOnly={isLocked}
          style={{ fontFamily: "var(--font-pixel)", fontSize: 9, flex: 1, background: isLocked ? "var(--gray2)" : "var(--gray1)", letterSpacing: "0.05em" }}
        />
        <StatusChip status={script.status} />
        <button className="btn-ghost" onClick={share} style={{ fontSize: 7 }}>
          {copied ? "COPIED!" : "SHARE"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px 240px", minHeight: "calc(100vh - 140px)" }}>
        {/* Script pane */}
        <div style={{ borderRight: "2px solid var(--black)", padding: 20 }}>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)", marginBottom: 16, letterSpacing: "0.1em" }}>SCRIPT</p>
          {script.lines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            const hasComments = lineCommentCounts[i] > 0;
            if (isSection) {
              return (
                <div key={i} style={{ margin: "12px 0 6px", paddingLeft: 32 }}>
                  <span className="section-divider">{line}</span>
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
                  fontFamily: "var(--font-mono)", fontSize: 11, minWidth: 28, paddingTop: 6, textAlign: "right" as const,
                  background: hasComments ? "var(--black)" : "transparent",
                  color: hasComments ? "var(--white)" : "var(--gray4)",
                  padding: hasComments ? "2px 4px" : undefined,
                }}>
                  {String(i + 1).padStart(2, "0")}
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
                    flex: 1, fontFamily: "var(--font-crt)", fontSize: 19, resize: "none", overflow: "hidden",
                    background: hoveredLine === i ? "var(--gray1)" : "transparent",
                    border: "2px solid transparent",
                    borderColor: hoveredLine === i ? "var(--gray2)" : "transparent",
                    padding: "4px 8px", lineHeight: 1.5,
                    minHeight: 32,
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
                      fontFamily: "var(--font-pixel)", fontSize: 8, background: "var(--black)", color: "var(--white)",
                      border: "2px solid var(--black)", width: 24, height: 24, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4,
                    }}
                    title="Add comment"
                  >+</button>
                )}
              </div>
            );
          })}
        </div>

        {/* Comment pane */}
        <div style={{ borderRight: "2px solid var(--black)", padding: 16, overflowY: "auto" }}>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)", marginBottom: 14, letterSpacing: "0.1em" }}>COMMENTS</p>
          {linesWithComments.length === 0 ? (
            <p style={{ fontFamily: "var(--font-crt)", fontSize: 16, color: "var(--gray3)" }}>No comments yet. Hover a line to add one.</p>
          ) : (
            linesWithComments.sort((a, b) => a - b).map((lineIdx) => {
              const comments = script.comments[lineIdx] ?? [];
              return (
                <div key={lineIdx} style={{ marginBottom: 16, border: "2px solid var(--black)" }}>
                  <div style={{ background: "var(--black)", padding: "6px 10px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--white)" }}>LINE {lineIdx + 1}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--gray3)" }}>{comments.length}</span>
                  </div>
                  {comments.map((c, ci) => (
                    <div key={ci} style={{ padding: "8px 10px", borderBottom: "1px solid var(--gray2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--font-pixel)", fontSize: 6 }}>{c.author}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--gray4)" }}>{c.time}</span>
                      </div>
                      <p style={{ fontFamily: "var(--font-crt)", fontSize: 17, margin: 0 }}>{c.text}</p>
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
        <div style={{ padding: 16, overflowY: "auto", background: "var(--gray1)" }}>
          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)", marginBottom: 12, letterSpacing: "0.1em" }}>SELECTED HOOK</p>
          <div style={{ border: "2px solid var(--black)", padding: 12, background: "var(--white)", marginBottom: 16, position: "relative" }}>
            <span style={{ position: "absolute", top: 6, left: 8, fontFamily: "var(--font-crt)", fontSize: 40, color: "var(--gray2)", lineHeight: 1 }}>"</span>
            <p style={{ fontFamily: "var(--font-crt)", fontSize: 17, margin: 0, paddingTop: 16, lineHeight: 1.4 }}>{script.hook}</p>
          </div>

          <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)", marginBottom: 10, letterSpacing: "0.1em" }}>FILMING NOTES</p>
          {(["setting", "wardrobe", "broll", "director"] as const).map((field) => (
            <div key={field} style={{ marginBottom: 10 }}>
              <label style={{ fontFamily: "var(--font-pixel)", fontSize: 5, display: "block", marginBottom: 4, color: "var(--gray5)", letterSpacing: "0.08em" }}>
                {field === "broll" ? "B-ROLL" : field === "director" ? "DIRECTOR NOTES" : field.toUpperCase()}
              </label>
              <textarea
                value={script.filmingNotes[field]}
                readOnly={isLocked}
                onChange={(e) => update({ filmingNotes: { ...script.filmingNotes, [field]: e.target.value } })}
                rows={2}
                style={{ fontSize: 15, resize: "vertical" }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontFamily: "var(--font-pixel)", fontSize: 5, display: "block", marginBottom: 4, color: "var(--gray5)" }}>CREATOR</label>
            <input type="text" value={script.creator} readOnly={isLocked} onChange={(e) => update({ creator: e.target.value })} style={{ fontSize: 16 }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "var(--font-pixel)", fontSize: 5, display: "block", marginBottom: 4, color: "var(--gray5)" }}>STATUS</label>
            <select
              value={script.status}
              disabled={isLocked}
              onChange={(e) => update({ status: e.target.value as Script["status"] })}
              style={{ fontSize: 16 }}
            >
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
            </select>
          </div>

          <div style={{ borderTop: "2px solid var(--black)", paddingTop: 14 }}>
            <p style={{ fontFamily: "var(--font-pixel)", fontSize: 5, color: "var(--gray4)", marginBottom: 8, lineHeight: 1.8 }}>
              LOCK script to mark it final. Locking is permanent and saves to library.
            </p>
            {isLocked
              ? <p style={{ fontFamily: "var(--font-pixel)", fontSize: 6, color: "var(--gray4)" }}>SCRIPT IS LOCKED ■</p>
              : <button className="btn-pixel" onClick={() => setLockModal(true)} style={{ width: "100%", justifyContent: "center", fontSize: 7 }}>LOCK + SAVE ■</button>
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
    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Name" style={{ fontSize: 14, padding: "4px 8px" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply..." style={{ flex: 1, fontSize: 14, padding: "4px 8px" }} />
        <button className="btn-pixel" style={{ fontSize: 6, padding: "4px 8px" }} onClick={() => { if (author && text) { onAdd(author, text); setAuthor(""); setText(""); } }}>↵</button>
      </div>
    </div>
  );
}
