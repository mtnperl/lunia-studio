"use client";
import { useEffect, useRef, useState } from "react";

export default function UGCOutreachPanel({ onBack }: { onBack: () => void }) {
  const [text, setText] = useState<string>("");
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void fetch("/api/ugc/outreach").then(async (r) => {
      if (r.ok) {
        const b = await r.json();
        setText(b.text ?? "");
      }
    });
  }, []);

  function change(v: string) {
    setText(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await fetch("/api/ugc/outreach", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: v }),
      });
      setSaved(true);
    }, 400);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 40px 80px", fontFamily: "var(--font-ui)" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        ← Tracker
      </button>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text)" }}>Outreach message</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.06em" }}>
            {saved ? "SAVED" : "SAVING…"}
          </span>
          <button
            onClick={copy}
            style={{
              padding: "7px 12px",
              background: copied ? "var(--accent)" : "transparent",
              color: copied ? "var(--bg)" : "var(--text)",
              border: `1px solid ${copied ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 6,
              fontSize: 12, cursor: "pointer",
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
        The boilerplate DM sent to prospective creators. One global template.
      </p>
      <textarea
        value={text}
        onChange={(e) => change(e.target.value)}
        rows={18}
        placeholder="Hi {name}, we&rsquo;d love to send you a free bottle of Lunia…"
        style={{
          marginTop: 12, width: "100%", boxSizing: "border-box",
          padding: 14,
          background: "var(--surface)", color: "var(--text)",
          border: "1px solid var(--border)", borderRadius: 8,
          fontFamily: "var(--font-ui)", fontSize: 14, lineHeight: 1.5,
          resize: "vertical",
        }}
      />
    </div>
  );
}
