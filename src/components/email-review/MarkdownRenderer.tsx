"use client";
// Minimal markdown renderer for email-review section bodies. Subset:
//   ## H2, ### H3, #### H4
//   - / * bullets, 1. numbered lists
//   **bold**, *italic*, `inline code`
//   ```fenced code blocks```
//   | tables | with | pipes |
//   --- horizontal rules
//   > blockquotes
//   [link text](url)
//
// Anything outside this subset falls through as paragraph text. We avoid
// react-markdown / remark to keep the bundle thin (this is ~80 LOC).

import { Fragment } from "react";

type Props = {
  children: string;
  /** Renders headings + body slightly larger; useful inside compact cards. */
  size?: "sm" | "md";
};

export default function MarkdownRenderer({ children, size = "md" }: Props) {
  const lines = (children ?? "").split(/\r?\n/);
  const out: React.ReactNode[] = [];

  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      out.push(
        <pre key={key++} style={{
          margin: "10px 0",
          padding: "14px 16px",
          background: "#F5F2EC",
          border: "1px solid #d6cfbe",
          borderLeft: "3px solid #102635",
          borderRadius: 6,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: size === "sm" ? 11.5 : 12.5,
          lineHeight: 1.55,
          color: "#1A1A1A",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "auto",
        }}>
          {lang && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5b5340", marginBottom: 6 }}>{lang}</div>}
          {buf.join("\n")}
        </pre>,
      );
      continue;
    }

    // Horizontal rule
    if (/^\s*-{3,}\s*$/.test(line)) {
      out.push(<hr key={key++} style={{ margin: "20px 0", border: "none", borderTop: "1px solid #d6cfbe" }} />);
      i += 1;
      continue;
    }

    // Headings
    const h4 = line.match(/^#{4}\s+(.+)$/);
    if (h4) {
      out.push(<h4 key={key++} style={{ fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 13 : 14, fontWeight: 700, color: "#2C3F51", margin: "16px 0 6px", lineHeight: 1.3 }}>{inline(h4[1])}</h4>);
      i += 1;
      continue;
    }
    const h3 = line.match(/^#{3}\s+(.+)$/);
    if (h3) {
      out.push(<h3 key={key++} style={{ fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 14 : 15, fontWeight: 700, color: "#2C3F51", margin: "20px 0 8px", lineHeight: 1.3, letterSpacing: "0.02em" }}>{inline(h3[1])}</h3>);
      i += 1;
      continue;
    }
    const h2 = line.match(/^#{2}\s+(.+)$/);
    if (h2) {
      out.push(<h2 key={key++} style={{ fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 16 : 18, fontWeight: 700, color: "#102635", margin: "24px 0 10px", lineHeight: 1.25, letterSpacing: "-0.01em" }}>{inline(h2[1])}</h2>);
      i += 1;
      continue;
    }
    const h1 = line.match(/^#{1}\s+(.+)$/);
    if (h1) {
      out.push(<h2 key={key++} style={{ fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 16 : 18, fontWeight: 700, color: "#102635", margin: "24px 0 10px", lineHeight: 1.25, letterSpacing: "-0.01em" }}>{inline(h1[1])}</h2>);
      i += 1;
      continue;
    }

    // Tables (require | separators on first line and a separator row)
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[-:\s|]+\|?\s*$/.test(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      const rowsRaw: string[] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].includes("|")) {
        rowsRaw.push(lines[j]);
        j += 1;
      }
      const rows = rowsRaw.map(parseTableRow);
      out.push(
        <div key={key++} style={{ margin: "12px 0", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 12 : 13 }}>
            <thead>
              <tr>
                {headerCells.map((c, ci) => (
                  <th key={ci} style={{ background: "#102635", color: "#fff", textAlign: "left", padding: "8px 12px", fontSize: size === "sm" ? 11 : 12, fontWeight: 700, letterSpacing: "0.04em", border: "1px solid #102635" }}>
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "#fff" : "#FBF9F4" }}>
                  {r.map((c, ci) => (
                    <td key={ci} style={{ padding: "8px 12px", border: "1px solid #e8e2d2", color: ci === 0 ? "#102635" : "#1A1A1A", fontWeight: ci === 0 ? 600 : 400, lineHeight: 1.5, verticalAlign: "top" }}>
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = j;
      continue;
    }

    // Blockquote
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      const buf: string[] = [bq[1]];
      i += 1;
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(
        <blockquote key={key++} style={{ margin: "12px 0", padding: "10px 14px", borderLeft: "3px solid #2C3F51", background: "rgba(44,63,81,0.05)", color: "#2C3F51", fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 13 : 14, lineHeight: 1.55 }}>
          {buf.map((l, li) => <div key={li}>{inline(l)}</div>)}
        </blockquote>,
      );
      continue;
    }

    // Bullet list — render with explicit "•" markers so Tailwind preflight's
    // "list-style: none" reset can't eat the bullets.
    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      out.push(
        <div key={key++} style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 4, fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 13 : 14, lineHeight: 1.6, color: "#1A1A1A" }}>
          {buf.map((b, bi) => (
            <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ flexShrink: 0, width: 16, color: "#102635", fontWeight: 700, lineHeight: 1.6, textAlign: "center" }}>•</span>
              <span style={{ flex: 1 }}>{inline(b)}</span>
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // Numbered list — same treatment, explicit "1." text marker.
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      out.push(
        <div key={key++} style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 4, fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 13 : 14, lineHeight: 1.6, color: "#1A1A1A" }}>
          {buf.map((b, bi) => (
            <div key={bi} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ flexShrink: 0, minWidth: 22, color: "#102635", fontWeight: 700, lineHeight: 1.6 }}>{bi + 1}.</span>
              <span style={{ flex: 1 }}>{inline(b)}</span>
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Paragraph: collapse adjacent non-special lines
    const buf: string[] = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    out.push(
      <p key={key++} style={{ margin: "8px 0", fontFamily: "Arial, sans-serif", fontSize: size === "sm" ? 13 : 14, lineHeight: 1.65, color: "#1A1A1A", wordBreak: "break-word" }}>
        {buf.map((l, li) => <Fragment key={li}>{inline(l)}{li < buf.length - 1 && <br />}</Fragment>)}
      </p>,
    );
  }

  return <div className="lunia-markdown">{out}</div>;
}

function isBlockStart(line: string): boolean {
  return /^#{1,4}\s+/.test(line)
    || /^\s*[-*]\s+/.test(line)
    || /^\s*\d+\.\s+/.test(line)
    || /^\s*>\s?/.test(line)
    || /^```/.test(line.trim())
    || /^\s*-{3,}\s*$/.test(line)
    || (line.includes("|") && /\|/.test(line));
}

function parseTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

// Inline formatting: **bold**, *italic*, `code`, [link](url)
function inline(text: string): React.ReactNode {
  // Escape HTML-sensitive chars then run a tiny tokenizer
  const tokens: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  // Order matters: code (no further parsing inside), then bold, then italic, then links
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)]+\))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) tokens.push(text.slice(cursor, m.index));
    const tok = m[0];
    if (tok.startsWith("`")) {
      tokens.push(<code key={key++} style={{ fontFamily: "ui-monospace, Menlo, monospace", background: "rgba(16,38,53,0.08)", padding: "1px 6px", borderRadius: 3, fontSize: "0.92em", color: "#102635" }}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith("**") || tok.startsWith("__")) {
      tokens.push(<strong key={key++} style={{ color: "#102635", fontWeight: 700 }}>{inline(tok.slice(2, -2))}</strong>);
    } else if (tok.startsWith("[")) {
      const [, label, href] = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/) ?? [];
      tokens.push(<a key={key++} href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#102635", textDecoration: "underline" }}>{label}</a>);
    } else {
      tokens.push(<em key={key++}>{inline(tok.slice(1, -1))}</em>);
    }
    cursor = m.index + tok.length;
  }
  if (cursor < text.length) tokens.push(text.slice(cursor));
  return <>{tokens}</>;
}
