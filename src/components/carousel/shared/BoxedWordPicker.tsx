"use client";

// Which word of an essay headline takes the accent box. One chip per word,
// plus "None". Nothing chosen means the slide picks a word itself; the chip
// it would pick shows as selected with an "auto" mark so the choice is
// visible before it is made.

import { resolveEssayEmphasis } from "@/components/carousel/shared/EssayChrome";

type Props = {
  headline: string;
  /** The stored choice: a word, "" for none, undefined for auto. */
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  accent: string;
};

export default function BoxedWordPicker({ headline, value, onChange, accent }: Props) {
  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length < 2) return null;
  const resolved = resolveEssayEmphasis(headline, value);
  const auto = value === undefined;
  const chip = (selected: boolean) => ({
    padding: "3px 9px", fontSize: 12, fontWeight: 600, borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
    border: `1px solid ${selected ? "var(--text)" : "var(--border)"}`,
    background: selected ? accent : "var(--surface)",
    color: selected ? "#102635" : "var(--muted)",
  } as const);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 78 }}>Boxed word</span>
      {words.map((w, i) => {
        const selected = !!resolved && w.toLowerCase() === resolved.toLowerCase();
        return (
          <button key={`${w}-${i}`} type="button" onClick={() => onChange(w)} style={chip(selected)} title={selected && auto ? "Picked for you. Click another word to choose." : `Box "${w}"`}>
            {w}{selected && auto ? " ·auto" : ""}
          </button>
        );
      })}
      <button type="button" onClick={() => onChange("")} style={chip(value === "")} title="No boxed word on this headline">None</button>
    </div>
  );
}
