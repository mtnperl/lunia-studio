"use client";
import { useMemo } from "react";
import { lintLuniaCopy, type LintFinding } from "@/lib/lunia-linter";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  ariaLabel?: string;
};

const FINDING_BG: Record<LintFinding["type"], string> = {
  em_dash: "rgba(176, 65, 62, 0.18)",
  exclamation_excess: "rgba(255, 184, 28, 0.22)",
  banned_phrase: "rgba(176, 65, 62, 0.18)",
  banned_badge: "rgba(176, 65, 62, 0.28)",
};

const FINDING_LABEL: Record<LintFinding["type"], string> = {
  em_dash: "em dash",
  exclamation_excess: "extra !",
  banned_phrase: "banned phrasing",
  banned_badge: "banned badge",
};

// A simple linter: textarea + a parallel highlight overlay underneath. Not a
// full contentEditable rich editor (which would be overkill for v1) — instead
// we render the same text underneath the transparent textarea with the
// problematic ranges painted. Common pattern; works in every modern browser.
export default function LuniaLinter({ value, onChange, placeholder, rows = 12, ariaLabel }: Props) {
  const findings = useMemo(() => lintLuniaCopy(value).findings, [value]);

  // Build the highlight overlay from segments
  const segments: Array<{ text: string; finding?: LintFinding }> = useMemo(() => {
    if (!findings.length) return [{ text: value }];
    const out: typeof segments = [];
    let cursor = 0;
    for (const f of findings) {
      if (f.range[0] > cursor) {
        out.push({ text: value.slice(cursor, f.range[0]) });
      }
      out.push({ text: value.slice(f.range[0], f.range[1]), finding: f });
      cursor = f.range[1];
    }
    if (cursor < value.length) out.push({ text: value.slice(cursor) });
    return out;
  }, [findings, value]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 13,
    lineHeight: 1.55,
  };

  // Both the textarea and the overlay must use the same font / padding /
  // line-height so the highlighted ranges line up exactly.
  const sharedTextStyle: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    padding: "12px 14px",
    margin: 0,
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxSizing: "border-box",
    width: "100%",
    minHeight: rows * 22,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  return (
    <div style={containerStyle}>
      {/* Highlight layer (underneath) */}
      <div
        aria-hidden
        style={{
          ...sharedTextStyle,
          position: "absolute",
          inset: 0,
          color: "transparent",
          pointerEvents: "none",
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        {segments.map((seg, i) =>
          seg.finding ? (
            <span
              key={i}
              style={{
                background: FINDING_BG[seg.finding.type],
                borderBottom: `1.5px wavy ${seg.finding.type === "exclamation_excess" ? "#fdab3d" : "#b0413e"}`,
                borderRadius: 2,
              }}
              title={seg.finding.message}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={rows}
        style={{
          ...sharedTextStyle,
          position: "relative",
          background: "transparent",
          color: "var(--text)",
          resize: "vertical",
          caretColor: "var(--text)",
        }}
        spellCheck
      />
      {findings.length > 0 && (
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
          }}
        >
          {findings.slice(0, 8).map((f, i) => (
            <span
              key={i}
              style={{
                padding: "2px 7px",
                borderRadius: 4,
                background: FINDING_BG[f.type],
                color: "#7a1f1c",
                border: "1px solid rgba(176, 65, 62, 0.35)",
              }}
              title={f.message}
            >
              {FINDING_LABEL[f.type]}
            </span>
          ))}
          {findings.length > 8 && (
            <span style={{ color: "var(--subtle)", padding: "2px 4px" }}>
              + {findings.length - 8} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
