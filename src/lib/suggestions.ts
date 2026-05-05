import type { Script, Suggestion } from "./types";

/**
 * Apply an accepted rewrite suggestion to a script.
 * Replaces the lines in [startLine, endLine] with the suggestion's text
 * (split on \n), drops in-range comments/filming notes, shifts later
 * comments/filming notes/suggestions by the line-count delta, and
 * invalidates suggestions whose ranges overlapped the accepted one.
 *
 * Returns null if the suggestion id isn't found on the script.
 */
export function applySuggestionAccept(script: Script, suggestionId: string): Script | null {
  const suggestion = (script.suggestions ?? []).find((s) => s.id === suggestionId);
  if (!suggestion) return null;

  const { startLine, endLine, text } = suggestion;
  const replacementLines = text.split("\n");
  const removed = endLine - startLine + 1;
  const delta = replacementLines.length - removed;

  const newLines = [...script.lines];
  newLines.splice(startLine, removed, ...replacementLines);

  const shift = (idx: number): number | null => {
    if (idx < startLine) return idx;
    if (idx > endLine) return idx + delta;
    return null;
  };

  const newComments: Script["comments"] = {};
  Object.entries(script.comments ?? {}).forEach(([k, v]) => {
    const ki = shift(Number(k));
    if (ki !== null) newComments[ki] = v;
  });

  const newFilmingNotes: Script["filmingNotes"] = {};
  Object.entries(script.filmingNotes ?? {}).forEach(([k, v]) => {
    const ki = shift(Number(k));
    if (ki !== null) newFilmingNotes[ki] = v;
  });

  const remainingSuggestions = (script.suggestions ?? [])
    .filter((s) => s.id !== suggestionId)
    .map((s) => {
      if (s.endLine < startLine) return s;
      if (s.startLine > endLine) return { ...s, startLine: s.startLine + delta, endLine: s.endLine + delta };
      return null;
    })
    .filter((s): s is Suggestion => s !== null);

  return {
    ...script,
    lines: newLines,
    comments: newComments,
    filmingNotes: newFilmingNotes,
    suggestions: remainingSuggestions,
  };
}
