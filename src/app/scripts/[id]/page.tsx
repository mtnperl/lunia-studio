import { getScriptById } from "@/lib/kv";
import { notFound } from "next/navigation";
import type { Suggestion } from "@/lib/types";
import ApproveSuggestionButton from "./ApproveSuggestionButton";

export const dynamic = "force-dynamic";

export default async function ScriptSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const script = await getScriptById(id);
  if (!script) notFound();

  const scriptLines = script.lines;
  const duration = (() => {
    const words = scriptLines
      .filter((l) => !/^\[(HOOK|BODY|CTA)\]$/.test(l))
      .join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return null;
    const secs = Math.round((words / 130) * 60);
    return secs < 60 ? `~${secs}s` : `~${Math.round(secs / 6) * 6}s`;
  })();

  const isLocked = script.status === "locked";
  const suggestions: Suggestion[] = isLocked ? [] : (script.suggestions ?? []);
  const suggestionByLine = new Map<number, Suggestion>();
  const suggestionEndsAt = new Map<number, Suggestion>();
  suggestions.forEach((s) => {
    for (let k = s.startLine; k <= s.endLine; k++) suggestionByLine.set(k, s);
    suggestionEndsAt.set(s.endLine, s);
  });
  const totalComments = isLocked ? 0 : Object.values(script.comments ?? {}).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);

  const statusLabel = script.status === "locked" ? "Locked · Read-only" : script.status === "review" ? "In Review · Collaborative" : "Draft · Collaborative";
  const statusColor = script.status === "locked" ? "#9ca3af" : "#b86040";

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#fafafa", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ width: 28, height: 28, background: "#000", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>L</span>
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>Lunia Script Studio</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, marginLeft: "auto", letterSpacing: ".02em" }}>{statusLabel}</span>
        <a
          href={`/?openScript=${script.id}`}
          style={{
            fontSize: 13, fontWeight: 600, padding: "7px 16px",
            background: "#111", color: "#fff", borderRadius: 6,
            textDecoration: "none", letterSpacing: ".01em",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          Open in editor
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>→</span>
        </a>
      </div>

      {/* Collaborator banner — only when not locked AND there's anything to review */}
      {!isLocked && (suggestions.length > 0 || totalComments > 0) && (
        <div style={{ background: "#fff7ed", borderBottom: "1px solid #fed7aa", padding: "10px 20px", textAlign: "center" }}>
          <span style={{ fontSize: 13, color: "#9a3412" }}>
            {suggestions.length > 0 && (
              <>
                <strong>{suggestions.length}</strong> rewrite suggestion{suggestions.length !== 1 ? "s" : ""}
              </>
            )}
            {suggestions.length > 0 && totalComments > 0 && " · "}
            {totalComments > 0 && (
              <>
                <strong>{totalComments}</strong> comment{totalComments !== 1 ? "s" : ""}
              </>
            )}
            <span style={{ color: "#c2410c", marginLeft: 8 }}>
              — pending review by {script.creator || "the creator"}
            </span>
          </span>
        </div>
      )}

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* Meta */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 6px", lineHeight: 1.3 }}>
            {script.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {[script.persona, script.format, script.angle].filter(Boolean).map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: "2px 8px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, color: "#6b7280" }}>
                {tag}
              </span>
            ))}
            {duration && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, color: "#3b82f6" }}>
                {duration}
              </span>
            )}
            {script.creator && (
              <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>for {script.creator}</span>
            )}
          </div>
        </div>

        {/* Hook */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 8px" }}>HOOK</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#111", lineHeight: 1.5, margin: 0 }}>{script.hook}</p>
        </div>

        {/* Script with inline filming notes, comments, and suggestions */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 12px" }}>SCRIPT</p>
          {scriptLines.map((line, i) => {
            const isSection = /^\[(HOOK|BODY|CTA)\]$/.test(line);
            const notes = script.filmingNotes[i];
            const hasNotes = notes && Object.values(notes).some(Boolean);
            const lineComments = isLocked ? [] : (script.comments?.[i] ?? []);
            const coveringSuggestion = suggestionByLine.get(i);
            const endingSuggestion = suggestionEndsAt.get(i);

            if (isSection) {
              return (
                <div key={i} style={{ margin: "14px 0 6px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#9ca3af", background: "#f9fafb", padding: "2px 8px", borderRadius: 4 }}>
                    {line.replace(/[\[\]]/g, "")}
                  </span>
                </div>
              );
            }

            return (
              <div key={i} style={{ marginBottom: (hasNotes || lineComments.length > 0 || endingSuggestion) ? 10 : 0 }}>
                <p style={{
                  fontSize: 14,
                  color: coveringSuggestion ? "#9ca3af" : "#374151",
                  lineHeight: 1.7,
                  margin: "3px 0",
                  textDecoration: coveringSuggestion ? "line-through" : "none",
                }}>
                  {line}
                </p>

                {/* Filming notes */}
                {hasNotes && (
                  <div style={{ marginLeft: 8, marginTop: 3, padding: "6px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, display: "flex", flexWrap: "wrap" as const, gap: "4px 14px" }}>
                    {([
                      { key: "setting", label: "Setting" },
                      { key: "energy", label: "Energy" },
                      { key: "broll", label: "B-Roll" },
                      { key: "director", label: "Director" },
                    ] as const).filter(({ key }) => notes[key]).map(({ key, label }) => (
                      <span key={key} style={{ fontSize: 12, color: "#92400e" }}>
                        <span style={{ fontWeight: 600 }}>{label}:</span> {notes[key]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comments — visible only when not locked */}
                {lineComments.length > 0 && (
                  <div style={{ marginLeft: 8, marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    {lineComments.map((c, ci) => (
                      <div key={ci} style={{ background: "#f0f9ff", borderLeft: "3px solid #0ea5e9", borderRadius: 4, padding: "8px 12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#0c4a6e" }}>{c.author}</span>
                          <span style={{ fontSize: 11, color: "#64748b" }}>{c.time}</span>
                        </div>
                        <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: "#0c4a6e" }}>{c.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestion callout — appears below the LAST line of each pending suggestion range */}
                {endingSuggestion && (
                  <div style={{
                    marginLeft: 8, marginTop: 8, marginBottom: 4,
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderLeft: "4px solid #b86040",
                    borderRadius: 6,
                    padding: "10px 14px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#b86040" }}>
                        Suggested rewrite · {endingSuggestion.author}
                      </span>
                      <span style={{ fontSize: 11, color: "#9a3412", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                        replaces lines {endingSuggestion.startLine + 1}–{endingSuggestion.endLine + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: "#1f2937", whiteSpace: "pre-wrap" }}>
                      {endingSuggestion.text}
                    </div>
                    <ApproveSuggestionButton scriptId={script.id} suggestionId={endingSuggestion.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <p style={{ fontSize: 12, color: "#d1d5db", textAlign: "center", marginTop: 32 }}>
          Created with Lunia Script Studio · Lunia Life
        </p>
      </div>
    </div>
  );
}
