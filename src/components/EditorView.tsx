"use client";
import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { Script, Suggestion } from "@/lib/types";
import { saveScript, generateId } from "@/lib/storage";

// ─── StatusChip ───────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: Script["status"] }) {
  const cls = status === "review" ? "chip chip-review" : status === "locked" ? "chip chip-locked" : "chip chip-draft";
  const label = status === "review" ? "In Review" : status === "locked" ? "Locked" : "Draft";
  return <span className={cls}>{label}</span>;
}

// ─── LockModal ────────────────────────────────────────────────────────────────
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

// ─── AddCommentForm ───────────────────────────────────────────────────────────
function AddCommentForm({ onAdd }: { onAdd: (author: string, text: string) => void }) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" style={{ fontSize: 13 }} />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." rows={2} style={{ fontSize: 13, resize: "none" }} />
      <button
        className="btn"
        style={{ alignSelf: "flex-end", fontSize: 12, padding: "5px 14px" }}
        onClick={() => { if (author.trim() && text.trim()) { onAdd(author.trim(), text.trim()); setText(""); } }}
      >
        Add comment
      </button>
    </div>
  );
}

// ─── AddSuggestionForm ────────────────────────────────────────────────────────
function AddSuggestionForm({
  rangeLabel,
  onAdd,
}: {
  rangeLabel: string;
  onAdd: (author: string, text: string) => void;
}) {
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, fontFamily: "var(--font-mono)" }}>{rangeLabel}</p>
      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" style={{ fontSize: 13 }} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your replacement text. New lines split into separate script lines."
        rows={4}
        style={{ fontSize: 13, resize: "vertical", lineHeight: 1.5 }}
      />
      <button
        className="btn"
        style={{
          alignSelf: "flex-end", fontSize: 12, padding: "5px 14px",
          background: "var(--warning)", color: "#fff", borderColor: "var(--warning)",
        }}
        onClick={() => { if (author.trim() && text.trim()) { onAdd(author.trim(), text.trim()); setText(""); } }}
      >
        Save suggestion
      </button>
    </div>
  );
}

// ─── ShotSheet (Shot View right panel) ───────────────────────────────────────
function ShotSheet({
  script,
  isLocked,
  onUpdate,
}: {
  script: Script;
  isLocked: boolean;
  onUpdate: (changes: Partial<Script>) => void;
}) {
  const [loadingLine, setLoadingLine] = useState<number | null>(null);

  async function suggestVisuals(lineIdx: number, lineText: string) {
    setLoadingLine(lineIdx);
    try {
      const res = await fetch("/api/scripts/suggest-visuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line: lineText,
          lineIndex: lineIdx,
          scriptLines: script.lines,
          hook: script.hook,
        }),
      });
      if (!res.ok) return;
      const { setting, energy, broll } = await res.json();
      onUpdate({
        filmingNotes: {
          ...script.filmingNotes,
          [lineIdx]: {
            ...script.filmingNotes[lineIdx],
            ...(setting ? { setting } : {}),
            ...(energy ? { energy } : {}),
            ...(broll ? { broll } : {}),
          },
        },
      });
    } finally {
      setLoadingLine(null);
    }
  }

  const contentLines = script.lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => !/^\[(HOOK|BODY|CTA)\]$/.test(line));

  return (
    <div style={{ overflowY: "auto", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
        <p className="section-label">Shot sheet — visual instructions</p>
      </div>
      {contentLines.map(({ line, i }) => {
        const notes = script.filmingNotes[i] ?? {};
        return (
          <div
            key={i}
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              transition: "background .12s",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)", flexShrink: 0, fontWeight: 600 }}>
                  L{i + 1}
                </span>
                <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {line.slice(0, 52)}{line.length > 52 ? "…" : ""}
                </span>
              </div>
              {!isLocked && (
                <button
                  onClick={() => suggestVisuals(i, line)}
                  disabled={loadingLine === i}
                  title="AI: suggest visuals for this line"
                  style={{
                    fontSize: 11, padding: "3px 8px", flexShrink: 0,
                    background: loadingLine === i ? "var(--surface-h)" : "var(--accent-dim)",
                    border: "1px solid var(--accent-mid)", borderRadius: 4,
                    color: "var(--accent)", cursor: "pointer", fontWeight: 600,
                    opacity: loadingLine === i ? 0.6 : 1,
                  }}
                >
                  {loadingLine === i ? "…" : "⚡ Suggest"}
                </button>
              )}
            </div>

            {/* Fields */}
            {(["setting", "energy", "broll", "director"] as const).map((field) => (
              <div key={field} style={{ marginBottom: 8 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700, color: "var(--subtle)",
                  marginBottom: 3, textTransform: "uppercase", letterSpacing: ".07em",
                }}>
                  {field === "broll" ? "B-Roll" : field === "director" ? "Director" : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  type="text"
                  value={notes[field] ?? ""}
                  readOnly={isLocked}
                  placeholder={
                    field === "setting" ? "e.g. Kitchen counter, morning light" :
                    field === "energy" ? "e.g. Calm, direct, conversational" :
                    field === "broll" ? "e.g. Close-up of pill in palm" :
                    "e.g. Pause after line 3"
                  }
                  onChange={(e) => onUpdate({
                    filmingNotes: {
                      ...script.filmingNotes,
                      [i]: { ...script.filmingNotes[i], [field]: e.target.value },
                    },
                  })}
                  style={{ fontSize: 12, padding: "5px 8px", background: "var(--bg)" }}
                />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDuration(lines: string[]): string {
  const words = lines
    .filter((l) => !/^\[(HOOK|BODY|CTA)\]$/.test(l))
    .join(" ").trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "";
  const secs = Math.round((words / 130) * 60);
  return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 6) * 6}s`;
}

function getSectionDuration(lines: string[], section: "HOOK" | "BODY" | "CTA"): string {
  let inSection = false;
  const sectionLines: string[] = [];
  for (const line of lines) {
    if (line === `[${section}]`) { inSection = true; continue; }
    if (/^\[(HOOK|BODY|CTA)\]$/.test(line) && line !== `[${section}]`) { inSection = false; continue; }
    if (inSection) sectionLines.push(line);
  }
  const words = sectionLines.join(" ").trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "";
  const secs = Math.round((words / 130) * 60);
  return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 6) * 6}s`;
}

// ─── EditorView ───────────────────────────────────────────────────────────────
export default function EditorView({
  script: initialScript,
  onUpdate,
  onOpenEditor,
}: {
  script: Script | null;
  onUpdate: (s: Script) => void;
  onOpenEditor?: (s: Script) => void;
}) {
  const [script, setScript] = useState<Script | null>(initialScript);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectionEndLine, setSelectionEndLine] = useState<number | null>(null);
  const [lockModal, setLockModal] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "shot">("edit");
  const [rightPanelHasMore, setRightPanelHasMore] = useState(false);
  const [suggestionMode, setSuggestionMode] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setScript(initialScript);
    setIsDirty(false);
    setSelectedLine(null);
    setSelectionEndLine(null);
    setSuggestionMode(false);
    setViewMode("edit");
  }, [initialScript]);

  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      if (isDirty && script) {
        const updated = { ...script, savedAt: new Date().toISOString() };
        saveScript(updated);
        setLastSavedAt(new Date());
        setIsDirty(false);
      }
    }, 10000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [isDirty, script]);

  // Re-check right-panel overflow whenever the selection or content changes.
  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    // Use rAF so the DOM has finished painting the new content before measuring.
    const id = requestAnimationFrame(() => {
      setRightPanelHasMore(el.scrollHeight > el.clientHeight + 8);
    });
    return () => cancelAnimationFrame(id);
  }, [selectedLine, script?.comments, script?.filmingNotes]);

  function handleRightPanelScroll() {
    const el = rightPanelRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 8;
    setRightPanelHasMore(!atBottom);
  }

  // Callback ref: resizes a textarea to fit its content on every React commit.
  // Using a callback ref (not useLayoutEffect) guarantees it fires on every
  // render — including initial mount — so lines always show their full text.
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);

  const update = useCallback((changes: Partial<Script>) => {
    setScript((prev) => prev ? { ...prev, ...changes } : prev);
    setIsDirty(true);
  }, []);

  function addLineAfter(index: number) {
    if (!script) return;
    const newLines = [...script.lines];
    newLines.splice(index + 1, 0, "");
    update({ lines: newLines });
    // Focus the new line after render
    setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>(".script-line-textarea");
      if (textareas[index + 1]) textareas[index + 1].focus();
    }, 50);
  }

  function addLineAtEnd() {
    if (!script) return;
    update({ lines: [...script.lines, ""] });
    setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>(".script-line-textarea");
      if (textareas.length > 0) textareas[textareas.length - 1].focus();
    }, 50);
  }

  function deleteLineAt(index: number) {
    if (!script || script.lines.length <= 1) return;
    const newLines = [...script.lines];
    newLines.splice(index, 1);
    // Shift filmingNotes and comments keys
    const newFilmingNotes: Script["filmingNotes"] = {};
    const newComments: Script["comments"] = {};
    Object.entries(script.filmingNotes).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < index) newFilmingNotes[ki] = v;
      else if (ki > index) newFilmingNotes[ki - 1] = v;
    });
    Object.entries(script.comments).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < index) newComments[ki] = v;
      else if (ki > index) newComments[ki - 1] = v;
    });
    update({ lines: newLines, filmingNotes: newFilmingNotes, comments: newComments });
    if (selectedLine === index) setSelectedLine(null);
    else if (selectedLine !== null && selectedLine > index) setSelectedLine(selectedLine - 1);
  }

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

  // ── Suggestions (range-based human rewrites) ──────────────────────────────
  function addSuggestion(startLine: number, endLine: number, author: string, text: string) {
    if (!script) return;
    const lo = Math.min(startLine, endLine);
    const hi = Math.max(startLine, endLine);
    const next: Suggestion = {
      id: generateId(),
      startLine: lo,
      endLine: hi,
      text,
      author,
      createdAt: new Date().toISOString(),
    };
    update({ suggestions: [...(script.suggestions ?? []), next] });
  }

  function dismissSuggestion(id: string) {
    if (!script) return;
    update({ suggestions: (script.suggestions ?? []).filter((s) => s.id !== id) });
  }

  function acceptSuggestion(id: string) {
    if (!script) return;
    const suggestion = (script.suggestions ?? []).find((s) => s.id === id);
    if (!suggestion) return;
    const { startLine, endLine, text } = suggestion;
    const replacementLines = text.split("\n");
    const removed = endLine - startLine + 1;
    const delta = replacementLines.length - removed;

    const newLines = [...script.lines];
    newLines.splice(startLine, removed, ...replacementLines);

    const shift = (idx: number): number | null => {
      if (idx < startLine) return idx;
      if (idx > endLine) return idx + delta;
      return null; // dropped — was inside the replaced range
    };

    const newComments: Script["comments"] = {};
    Object.entries(script.comments).forEach(([k, v]) => {
      const ki = shift(Number(k));
      if (ki !== null) newComments[ki] = v;
    });

    const newFilmingNotes: Script["filmingNotes"] = {};
    Object.entries(script.filmingNotes).forEach(([k, v]) => {
      const ki = shift(Number(k));
      if (ki !== null) newFilmingNotes[ki] = v;
    });

    const remainingSuggestions = (script.suggestions ?? [])
      .filter((s) => s.id !== id)
      .map((s) => {
        if (s.endLine < startLine) return s;
        if (s.startLine > endLine) return { ...s, startLine: s.startLine + delta, endLine: s.endLine + delta };
        return null; // overlapping suggestion is invalidated
      })
      .filter((s): s is Suggestion => s !== null);

    update({
      lines: newLines,
      comments: newComments,
      filmingNotes: newFilmingNotes,
      suggestions: remainingSuggestions,
    });
    setSelectedLine(null);
    setSelectionEndLine(null);
    setSuggestionMode(false);
  }

  function handleLock(title: string) {
    if (!script) return;
    const locked: Script = { ...script, title, status: "locked", savedAt: new Date().toISOString() };
    setScript(locked);
    saveScript(locked);
    onUpdate(locked);
    setIsDirty(false);
    setLockModal(false);
    setLastSavedAt(new Date());
  }

  function handleUnlock() {
    if (!script) return;
    const unlocked: Script = { ...script, status: "draft", savedAt: new Date().toISOString() };
    setScript(unlocked);
    saveScript(unlocked);
    onUpdate(unlocked);
    setIsDirty(false);
    setLastSavedAt(new Date());
  }

  async function expandScript() {
    if (!script || expanding) return;
    setExpanding(true);
    try {
      const res = await fetch("/api/scripts/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hook: script.hook,
          lines: script.lines,
          persona: script.persona,
          angle: script.angle,
          format: script.format,
          subjectNotes: script.subjectNotes,
          instructions: script.instructions,
        }),
      });
      if (!res.ok) return;
      const { newLines } = await res.json() as { newLines: string[] };
      if (!newLines?.length) return;
      // Insert new lines before [CTA] if it exists, otherwise append
      const ctaIdx = script.lines.findIndex((l) => l === "[CTA]");
      const insertAt = ctaIdx >= 0 ? ctaIdx : script.lines.length;
      const updated = [...script.lines];
      updated.splice(insertAt, 0, ...newLines);
      update({ lines: updated });
    } finally {
      setExpanding(false);
    }
  }

  function cycleStatus() {
    if (!script || script.status === "locked") return;
    update({ status: script.status === "draft" ? "review" : "draft" });
  }

  function duplicate() {
    if (!script || !onOpenEditor) return;
    onOpenEditor({
      ...script,
      id: generateId(),
      title: `Copy of ${script.title}`,
      status: "draft",
      savedAt: new Date().toISOString(),
      reviewEmails: undefined,
    });
  }

  function share() {
    if (script) saveScript({ ...script, savedAt: new Date().toISOString() });
    const url = `${window.location.origin}/scripts/${script?.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
    } else {
      const el = document.createElement("textarea");
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }
  }

  function copyScriptText() {
    if (!script) return;
    const noteLines: string[] = [];
    Object.entries(script.filmingNotes).forEach(([idx, notes]) => {
      if (!notes) return;
      const lineText = script.lines[Number(idx)];
      if (!lineText) return;
      const parts = [
        notes.setting ? `Setting: ${notes.setting}` : "",
        notes.energy ? `Energy: ${notes.energy}` : "",
        notes.broll ? `B-Roll: ${notes.broll}` : "",
        notes.director ? `Director: ${notes.director}` : "",
      ].filter(Boolean);
      if (parts.length) noteLines.push(`Line ${Number(idx) + 1}: ${parts.join(" · ")}`);
    });
    const lines = [
      `HOOK: ${script.hook}`,
      "",
      ...script.lines,
      ...(noteLines.length ? ["", "— FILMING NOTES —", ...noteLines] : []),
    ];
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

  // ── Empty state ──────────────────────────────────────────────────────────────
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
  const selectedFilmingNotes = selectedLine !== null ? (script.filmingNotes[selectedLine] ?? {}) : {};

  // Autosave label
  const saveLabel = isDirty
    ? "Unsaved changes"
    : lastSavedAt
    ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ── Topbar ── */}
      <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 20px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          value={script.title}
          onChange={(e) => update({ title: e.target.value })}
          readOnly={isLocked}
          style={{ flex: 1, minWidth: 140, fontWeight: 500, fontSize: 14, border: "none", background: "transparent", padding: 0, outline: "none" }}
        />

        {/* Autosave indicator */}
        {saveLabel && (
          <span style={{ fontSize: 11, color: isDirty ? "var(--warning)" : "var(--subtle)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
            {saveLabel}
          </span>
        )}

        {/* Clickable status chip — cycles draft ↔ review */}
        <button
          onClick={cycleStatus}
          disabled={isLocked}
          title={isLocked ? "Locked" : "Click to toggle status"}
          style={{ background: "none", border: "none", padding: 0, cursor: isLocked ? "default" : "pointer" }}
        >
          <StatusChip status={script.status} />
        </button>

        {/* View mode toggle */}
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
          {(["edit", "shot"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                fontSize: 12, fontWeight: 600, padding: "5px 12px",
                background: viewMode === mode ? "var(--accent-dim)" : "transparent",
                color: viewMode === mode ? "var(--accent)" : "var(--muted)",
                border: "none", cursor: "pointer",
                borderRight: mode === "edit" ? "1px solid var(--border)" : "none",
              }}
            >
              {mode === "edit" ? "Edit" : "Shot"}
            </button>
          ))}
        </div>

        {getDuration(script.lines) && (
          <span style={{
            fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700,
            color: "var(--accent)", background: "var(--accent-dim)",
            border: "1px solid var(--accent-mid)", borderRadius: 5,
            padding: "3px 9px", whiteSpace: "nowrap", letterSpacing: ".03em",
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>
            <span style={{ fontSize: 12 }}>⏱</span> {getDuration(script.lines)} video
          </span>
        )}

        {isLocked ? (
          <button className="btn-ghost" onClick={handleUnlock} style={{ fontSize: 13, padding: "6px 12px", flexShrink: 0 }}>
            Unlock
          </button>
        ) : (
          <button className="btn-ghost" onClick={() => setLockModal(true)} style={{ fontSize: 13, padding: "6px 12px", flexShrink: 0 }}>
            Lock & save
          </button>
        )}
        <button className="btn-ghost" onClick={copyScriptText} style={{ fontSize: 13, padding: "6px 12px", flexShrink: 0 }}>
          {scriptCopied ? "Copied!" : "Copy"}
        </button>
        <button className="btn-ghost" onClick={share} style={{ fontSize: 13, padding: "6px 12px", flexShrink: 0 }}>
          {copied ? "Link copied!" : "Share"}
        </button>
        {onOpenEditor && (
          <button className="btn-ghost" onClick={duplicate} style={{ fontSize: 13, padding: "6px 12px", flexShrink: 0 }}>
            Duplicate
          </button>
        )}
      </div>

      {/* ── Main panes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", minHeight: "calc(100vh - 100px)" }}>

        {/* ── Script pane (both modes) ── */}
        <div style={{ borderRight: "1px solid var(--border)", padding: "20px 16px", overflowY: "auto" }}>
          <p className="section-label" style={{ marginBottom: 12, paddingLeft: 36 }}>
            {viewMode === "edit" ? "Script — click a line to view notes" : "Script — read-only in shot view"}
          </p>

          {/* Hook block */}
          <div style={{
            marginBottom: 20, marginLeft: 36,
            borderLeft: "3px solid var(--accent)",
            background: "var(--accent-dim)",
            borderRadius: "0 6px 6px 0",
            padding: "10px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "var(--accent)" }}>Hook</span>
            </div>
            <textarea
              ref={autoResize}
              value={script.hook}
              readOnly={isLocked || viewMode === "shot"}
              onChange={(e) => update({ hook: e.target.value })}
              rows={2}
              placeholder="Your hook line..."
              style={{
                width: "100%", fontSize: 14, fontWeight: 500, resize: "none", overflow: "hidden",
                background: "transparent", border: "none", outline: "none",
                padding: 0, lineHeight: 1.6, color: "var(--text)",
                cursor: isLocked || viewMode === "shot" ? "default" : "text",
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = t.scrollHeight + "px";
              }}
            />
          </div>

          {/* Script lines */}
          {(() => {
            const allSuggestions = script.suggestions ?? [];
            const suggestionByLine = new Map<number, Suggestion>();
            const suggestionEndsAt = new Map<number, Suggestion>();
            allSuggestions.forEach((s) => {
              for (let k = s.startLine; k <= s.endLine; k++) suggestionByLine.set(k, s);
              suggestionEndsAt.set(s.endLine, s);
            });
            const rLo = selectedLine === null ? null : Math.min(selectedLine, selectionEndLine ?? selectedLine);
            const rHi = selectedLine === null ? null : Math.max(selectedLine, selectionEndLine ?? selectedLine);
            return script.lines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            const hasComments = (script.comments[i]?.length ?? 0) > 0;
            const hasFilmingNotes = Object.values(script.filmingNotes[i] ?? {}).some(Boolean);
            const inRange = rLo !== null && rHi !== null && i >= rLo && i <= rHi;
            const isSelected = selectedLine === i || inRange;
            const isHovered = hoveredLine === i;
            const coveringSuggestion = suggestionByLine.get(i);
            const endingSuggestion = suggestionEndsAt.get(i);

            if (isSection) {
              const sectionName = line.replace(/[[\]]/g, "") as "HOOK" | "BODY" | "CTA";
              const dur = getSectionDuration(script.lines, sectionName);
              return (
                <div key={i} style={{ margin: "18px 0 8px", paddingLeft: 36, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                    textTransform: "uppercase" as const, color: "var(--muted)",
                    background: "var(--surface)", padding: "2px 8px", borderRadius: 4,
                  }}>{line}</span>
                  {dur && (
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--subtle)",
                      background: "var(--surface)", padding: "2px 6px", borderRadius: 3,
                    }}>{dur}</span>
                  )}
                </div>
              );
            }

            const handleLineClick = () => {
              if (viewMode !== "edit") return;
              if (suggestionMode && selectedLine !== null) {
                setSelectionEndLine(i);
                return;
              }
              setSelectedLine(selectedLine === i ? null : i);
              setSelectionEndLine(null);
            };

            return (
              <Fragment key={i}>
              <div
                onClick={handleLineClick}
                onMouseEnter={() => setHoveredLine(i)}
                onMouseLeave={() => setHoveredLine(null)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  marginBottom: 2, cursor: viewMode === "edit" ? "pointer" : "default", borderRadius: 6,
                  background: coveringSuggestion ? "var(--surface-h)" : isSelected ? "var(--accent-dim)" : "transparent",
                  border: `1px solid ${isSelected ? "var(--accent-mid)" : "transparent"}`,
                  transition: "background .1s, border-color .1s",
                  position: "relative",
                  opacity: coveringSuggestion ? 0.55 : 1,
                }}
              >
                {/* Line number */}
                <span style={{
                  fontSize: 11, minWidth: 28, paddingTop: 9, textAlign: "right" as const,
                  color: isSelected ? "var(--accent)" : hasComments ? "var(--accent)" : "var(--subtle)",
                  fontWeight: isSelected || hasComments ? 600 : 400,
                  flexShrink: 0, userSelect: "none" as const,
                }}>
                  {i + 1}
                </span>

                {/* Editable / read-only line */}
                {viewMode === "shot" ? (
                  <p style={{
                    flex: 1, fontSize: 14, padding: "6px 8px", lineHeight: 1.6,
                    margin: 0, color: "var(--text)", userSelect: "none",
                    textDecoration: coveringSuggestion ? "line-through" : "none",
                  }}>
                    {line || <span style={{ color: "var(--subtle)" }}>Empty line</span>}
                  </p>
                ) : (
                  <textarea
                    ref={autoResize}
                    value={line}
                    readOnly={isLocked || !!coveringSuggestion || suggestionMode}
                    className="script-line-textarea"
                    onClick={(e) => {
                      if (suggestionMode) { e.preventDefault(); handleLineClick(); return; }
                      e.stopPropagation();
                    }}
                    onChange={(e) => {
                      const newLines = [...script.lines];
                      newLines[i] = e.target.value;
                      update({ lines: newLines });
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onFocus={() => { if (!suggestionMode) setSelectedLine(i); }}
                    rows={1}
                    style={{
                      flex: 1, fontSize: 14, resize: "none", overflow: "hidden",
                      background: "transparent", border: "none", outline: "none",
                      padding: "6px 8px", lineHeight: 1.6, minHeight: 34,
                      cursor: isLocked || suggestionMode ? "pointer" : "text",
                      textDecoration: coveringSuggestion ? "line-through" : "none",
                    }}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = t.scrollHeight + "px";
                    }}
                  />
                )}

                {/* Indicators + inline actions */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, marginTop: 10, marginRight: 4, minWidth: 20 }}>
                  {hasComments && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }}
                      title={`${script.comments[i].length} comment${script.comments[i].length !== 1 ? "s" : ""}`} />
                  )}
                  {hasFilmingNotes && (
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: "var(--warning)" }}
                      title="Has filming notes" />
                  )}
                  {/* + and × buttons on hover (edit mode only) */}
                  {!isLocked && viewMode === "edit" && isHovered && !coveringSuggestion && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); addLineAfter(i); }}
                        title="Add line below"
                        style={{
                          width: 16, height: 16, borderRadius: 3, fontSize: 13, lineHeight: 1,
                          background: "var(--surface-h)", border: "1px solid var(--border-strong)",
                          color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0, fontWeight: 700,
                        }}
                      >+</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLineAt(i); }}
                        title="Delete line"
                        style={{
                          width: 16, height: 16, borderRadius: 3, fontSize: 11, lineHeight: 1,
                          background: "var(--surface-h)", border: "1px solid var(--border-strong)",
                          color: "var(--subtle)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          padding: 0,
                        }}
                      >×</button>
                    </>
                  )}
                </div>
              </div>

              {/* Suggestion callout — appears below the LAST line of any pending suggestion range */}
              {endingSuggestion && !isLocked && (
                <div style={{
                  marginLeft: 36, marginTop: 6, marginBottom: 14,
                  border: "1px solid var(--warning)",
                  borderLeft: "4px solid var(--warning)",
                  borderRadius: 6,
                  background: "color-mix(in srgb, var(--warning) 8%, var(--bg))",
                  padding: "10px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
                      textTransform: "uppercase" as const, color: "var(--warning)",
                    }}>
                      Suggested rewrite · {endingSuggestion.author}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--subtle)", fontFamily: "var(--font-mono)" }}>
                      lines {endingSuggestion.startLine + 1}–{endingSuggestion.endLine + 1}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap", marginBottom: 10 }}>
                    {endingSuggestion.text}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); acceptSuggestion(endingSuggestion.id); }}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "5px 14px",
                        background: "var(--warning)", color: "#fff",
                        border: "1px solid var(--warning)", borderRadius: 5, cursor: "pointer",
                      }}
                    >Accept</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissSuggestion(endingSuggestion.id); }}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: "5px 14px",
                        background: "transparent", color: "var(--muted)",
                        border: "1px solid var(--border-strong)", borderRadius: 5, cursor: "pointer",
                      }}
                    >Dismiss</button>
                  </div>
                </div>
              )}
              </Fragment>
            );
          });
          })()}

          {/* Global add line + AI expand buttons */}
          {!isLocked && viewMode === "edit" && (
            <div style={{ paddingLeft: 36, marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={addLineAtEnd}
                style={{
                  fontSize: 12, fontWeight: 600, color: "var(--muted)",
                  background: "transparent", border: "1px dashed var(--border-strong)",
                  borderRadius: 6, padding: "7px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "color .15s, border-color .15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget).style.color = "var(--accent)"; (e.currentTarget).style.borderColor = "var(--accent-mid)"; }}
                onMouseLeave={(e) => { (e.currentTarget).style.color = "var(--muted)"; (e.currentTarget).style.borderColor = "var(--border-strong)"; }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>+</span> Add line
              </button>
              <button
                onClick={expandScript}
                disabled={expanding}
                style={{
                  fontSize: 12, fontWeight: 600,
                  color: expanding ? "var(--muted)" : "var(--accent)",
                  background: expanding ? "var(--surface-h)" : "var(--accent-dim)",
                  border: `1px solid ${expanding ? "var(--border-strong)" : "var(--accent-mid)"}`,
                  borderRadius: 6, padding: "7px 16px", cursor: expanding ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all .15s", opacity: expanding ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{expanding ? "⟳" : "✦"}</span>
                {expanding ? "Expanding…" : "Expand script"}
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        {viewMode === "shot" ? (
          <ShotSheet script={script} isLocked={isLocked} onUpdate={update} />
        ) : (
          <div style={{ position: "relative", overflow: "hidden", background: "var(--surface)" }}>
          <div ref={rightPanelRef} onScroll={handleRightPanelScroll} style={{ overflowY: "auto", height: "100%", display: "flex", flexDirection: "column" }}>
            {selectedLine !== null ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Selected line(s) preview */}
                <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
                  {(() => {
                    const lo = Math.min(selectedLine, selectionEndLine ?? selectedLine);
                    const hi = Math.max(selectedLine, selectionEndLine ?? selectedLine);
                    const isRange = lo !== hi;
                    return (
                      <>
                        <p className="section-label" style={{ marginBottom: 6 }}>
                          {isRange ? `Lines ${lo + 1}–${hi + 1}` : `Line ${selectedLine + 1}`}
                        </p>
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", whiteSpace: "pre-wrap" }}>
                          {isRange
                            ? script.lines.slice(lo, hi + 1).join("\n") || <span style={{ color: "var(--subtle)" }}>Empty</span>
                            : (script.lines[selectedLine] || <span style={{ color: "var(--subtle)" }}>Empty line</span>)}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Suggest a rewrite */}
                {!isLocked && (
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: suggestionMode ? 10 : 0 }}>
                      <p className="section-label" style={{ margin: 0 }}>Suggest a rewrite</p>
                      {!suggestionMode ? (
                        <button
                          onClick={() => { setSuggestionMode(true); setSelectionEndLine(selectedLine); }}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "4px 10px",
                            background: "color-mix(in srgb, var(--warning) 14%, var(--bg))",
                            color: "var(--warning)",
                            border: "1px solid var(--warning)",
                            borderRadius: 5, cursor: "pointer", letterSpacing: ".02em",
                          }}
                        >
                          + Rewrite
                        </button>
                      ) : (
                        <button
                          onClick={() => { setSuggestionMode(false); setSelectionEndLine(null); }}
                          style={{
                            fontSize: 11, fontWeight: 600, padding: "4px 10px",
                            background: "transparent", color: "var(--muted)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: 5, cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    {suggestionMode && (() => {
                      const lo = Math.min(selectedLine, selectionEndLine ?? selectedLine);
                      const hi = Math.max(selectedLine, selectionEndLine ?? selectedLine);
                      const rangeLabel = lo === hi
                        ? `Replacing line ${lo + 1} · click another line to extend`
                        : `Replacing lines ${lo + 1}–${hi + 1}`;
                      return (
                        <AddSuggestionForm
                          rangeLabel={rangeLabel}
                          onAdd={(a, t) => { addSuggestion(lo, hi, a, t); setSuggestionMode(false); setSelectionEndLine(null); }}
                        />
                      );
                    })()}
                  </div>
                )}

                {/* Comments */}
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <p className="section-label" style={{ marginBottom: 10 }}>
                    Comments {selectedComments.length > 0 && <span style={{ fontWeight: 400, color: "var(--subtle)" }}>({selectedComments.length})</span>}
                  </p>
                  {selectedComments.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>No comments on this line yet.</p>
                  ) : (
                    <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedComments.map((c, ci) => (
                        <div key={ci} style={{ background: "var(--accent-dim)", border: "1px solid var(--accent-mid)", borderLeft: "3px solid var(--accent)", borderRadius: 6, padding: "10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{c.author}</span>
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{c.time}</span>
                          </div>
                          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "var(--text)" }}>{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isLocked && !suggestionMode && <AddCommentForm onAdd={(a, t) => addComment(selectedLine, a, t)} />}
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
                        value={selectedFilmingNotes[field] ?? ""}
                        readOnly={isLocked}
                        onChange={(e) => update({
                          filmingNotes: {
                            ...script.filmingNotes,
                            [selectedLine!]: { ...script.filmingNotes[selectedLine!], [field]: e.target.value },
                          },
                        })}
                        rows={2}
                        style={{ fontSize: 13, resize: "vertical", background: "var(--bg)" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* No line selected — meta panel */
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    Click any line to add comments and filming notes.
                  </p>
                  <div style={{ marginTop: 10, display: "flex", gap: 12, fontSize: 12, color: "var(--subtle)", flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} /> Comments
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: "var(--warning)", display: "inline-block" }} /> Filming notes
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 10, height: 6, borderRadius: 1, background: "var(--warning)", display: "inline-block", opacity: 0.4 }} /> Suggestions
                    </span>
                  </div>
                </div>

                <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <p className="section-label" style={{ marginBottom: 10 }}>Brief</p>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Subject notes</label>
                      <textarea
                        value={script.subjectNotes ?? ""}
                        readOnly={isLocked}
                        onChange={(e) => update({ subjectNotes: e.target.value })}
                        placeholder="Background on the topic, key facts, research to reference…"
                        rows={3}
                        style={{ fontSize: 12, resize: "vertical", background: "var(--bg)", lineHeight: 1.5 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Instructions</label>
                      <textarea
                        value={script.instructions ?? ""}
                        readOnly={isLocked}
                        onChange={(e) => update({ instructions: e.target.value })}
                        placeholder="Specific directives — e.g. must mention X, avoid Y, target 45s…"
                        rows={3}
                        style={{ fontSize: 12, resize: "vertical", background: "var(--bg)", lineHeight: 1.5 }}
                      />
                    </div>
                  </div>

                  <div>
                    <p className="section-label" style={{ marginBottom: 10 }}>Script info</p>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Creator</label>
                      <input type="text" value={script.creator} readOnly={isLocked} onChange={(e) => update({ creator: e.target.value })} style={{ fontSize: 13, background: "var(--bg)" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 5, textTransform: "uppercase" as const, letterSpacing: ".05em" }}>Persona / Format / Angle</label>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{[script.persona, script.format, script.angle].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Scroll-more fade — appears when the right panel has content below the fold */}
          {rightPanelHasMore && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 52,
              background: "linear-gradient(to bottom, transparent, var(--surface))",
              pointerEvents: "none",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              paddingBottom: 8,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                color: "var(--muted)", textTransform: "uppercase",
                animation: "fadeInDown .35s ease",
              }}>
                scroll ↓
              </span>
            </div>
          )}
          </div>
        )}
      </div>

      {lockModal && <LockModal onConfirm={handleLock} onClose={() => setLockModal(false)} />}
    </div>
  );
}
