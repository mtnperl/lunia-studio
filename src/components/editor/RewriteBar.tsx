"use client";
// Inline AI on a piece of text: a few preset instructions, a free one, and a
// Revert that lasts until the next edit. The caller owns the text and decides
// where the result lands (a slide field, a selection inside a block).
import { useState } from "react";
import { Button, Input } from "@/components/ui";

const PRESETS: { label: string; instruction: string }[] = [
  { label: "Shorter", instruction: "Make it shorter. Cut filler, keep the point." },
  { label: "Punchier", instruction: "Make it punchier: shorter sentences, stronger verbs, same meaning." },
  { label: "Simpler", instruction: "Use simpler words a tired reader gets on first pass." },
  { label: "Fix grammar", instruction: "Fix grammar, spelling and punctuation only. Change nothing else." },
];

export function RewriteBar({
  text,
  context,
  onResult,
  label = "Ask AI",
  disabled,
}: {
  /** The text to rewrite. */
  text: string;
  /** Where it sits, so the model keeps the surrounding tone. */
  context?: string;
  onResult: (next: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  async function run(ins: string, key: string) {
    if (!text.trim() || busy) return;
    setBusy(key); setError(null);
    try {
      const res = await fetch("/api/rewrite-selection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, instruction: ins, context }) });
      const data = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!res.ok || !data?.text) { setError(data?.error ?? `Rewrite failed (${res.status}).`); return; }
      setPrevious(text);
      onResult(data.text);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const off = disabled || !text.trim();
  return (
    <div className="rewrite" aria-label={label}>
      <div className="rewrite__row">
        <span className="rewrite__label">{label}</span>
        {PRESETS.map((p) => (
          <Button key={p.label} size="sm" variant="secondary" disabled={off || !!busy} busy={busy === p.label} onClick={() => run(p.instruction, p.label)}>{p.label}</Button>
        ))}
        {previous !== null && !busy && (
          <Button size="sm" variant="ghost" onClick={() => { onResult(previous); setPrevious(null); }} title="Put the earlier text back">Revert</Button>
        )}
      </div>
      <form className="rewrite__row" onSubmit={(e) => { e.preventDefault(); if (instruction.trim()) run(instruction, "custom"); }}>
        <Input size="sm" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Or say what to change" aria-label="Rewrite instruction" disabled={off} style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" type="submit" disabled={off || !instruction.trim() || !!busy} busy={busy === "custom"}>Apply</Button>
      </form>
      {error && <div className="rewrite__error" role="alert">{error}</div>}
    </div>
  );
}
