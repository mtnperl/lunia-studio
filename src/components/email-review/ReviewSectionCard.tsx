"use client";
import CopyButton from "@/components/email-review/CopyButton";
import type { FlowReviewSection } from "@/lib/types";

const TITLE_BY_KEY: Record<FlowReviewSection["key"], string> = {
  headline: "Section 1 — Headline",
  timing: "Section 2 — Timing",
  subjects: "Section 3 — Subject lines, preview text, sender",
  rewrites: "Section 4 — Full body rewrites",
  design: "Section 5 — Design, images, copy",
  strategy: "Section 6 — Strategic question + Action checklist",
};

export default function ReviewSectionCard({ section }: { section: FlowReviewSection }) {
  return (
    <article
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "Arial, sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: "#102635",
            lineHeight: 1.3,
          }}
        >
          {TITLE_BY_KEY[section.key] ?? section.title}
        </h3>
        <CopyButton text={`## ${section.title}\n\n${section.bodyMarkdown}`} label="Copy section" />
      </header>

      {section.flags && section.flags.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {section.flags.map((f, i) => (
            <li
              key={i}
              style={{
                padding: "8px 12px",
                background: f.severity === "compliance" ? "rgba(176, 65, 62, 0.08)" : "rgba(255, 184, 28, 0.10)",
                border: `1px solid ${f.severity === "compliance" ? "rgba(176, 65, 62, 0.3)" : "rgba(255, 184, 28, 0.4)"}`,
                color: f.severity === "compliance" ? "#B0413E" : "#9a6b00",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {f.severity === "compliance" ? "[COMPLIANCE] " : "[WARN] "}
              {f.text}
            </li>
          ))}
        </ul>
      )}

      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "#1A1A1A",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {section.bodyMarkdown}
      </div>
    </article>
  );
}
