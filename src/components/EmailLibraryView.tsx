"use client";
import { useEffect, useState } from "react";
import { EmailSection } from "@/lib/types";

type LibraryEmail = {
  id: string;
  frameworkLabel: string;
  score: number;
  scoreDiagnosis: string;
  competitorText: string;
  generated: {
    subjectLines: string[];
    preheader: string;
    sections: EmailSection[];
    cta: string;
    ps: string;
  };
  imageUrl?: string;
  savedAt: string;
};

type Props = {
  onOpen?: (email: LibraryEmail) => void;
};

function ScoreDot({ score }: { score: number }) {
  const color = score >= 8 ? "var(--success)" : score >= 5 ? "var(--warning)" : "var(--error)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28, borderRadius: 6,
      background: color, color: "#fff",
      fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
    }}>
      {score}
    </span>
  );
}

export default function EmailLibraryView({ onOpen }: Props) {
  const [emails, setEmails] = useState<LibraryEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email/library")
      .then(r => r.json())
      .then(d => setEmails(d.emails ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved email?")) return;
    setDeleting(id);
    await fetch(`/api/email/${id}`, { method: "DELETE" });
    setEmails(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)" }}>
        Loading library...
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>No saved emails yet</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--muted)" }}>Analyze and save a competitor email to start your swipe library.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {emails.map(email => {
        const open = expanded === email.id;
        const date = new Date(email.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        return (
          <div key={email.id} style={{
            borderRadius: 12, border: "1px solid var(--border)",
            background: "var(--surface)", overflow: "hidden",
          }}>
            {/* Card header */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
                cursor: "pointer",
              }}
              onClick={() => setExpanded(open ? null : email.id)}
            >
              <ScoreDot score={email.score} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500,
                  color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {email.frameworkLabel}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {email.scoreDiagnosis}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", flexShrink: 0 }}>{date}</div>
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}
              >
                <path d="M2 4l4 4 4-4" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Expanded content */}
            {open && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "20px" }}>
                {/* Subject lines */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Lunia Subject Lines</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {email.generated.subjectLines.map((s, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 6, background: "var(--surface-r)", border: "1px solid var(--border)", fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text)" }}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Side-by-side preview */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Competitor</div>
                    <div style={{
                      padding: "12px 14px", borderRadius: 8, background: "var(--surface-r)",
                      border: "1px solid var(--border)", fontFamily: "var(--font-ui)", fontSize: 12,
                      color: "var(--muted)", lineHeight: 1.6, maxHeight: 180, overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}>
                      {email.competitorText.slice(0, 600)}{email.competitorText.length > 600 ? "..." : ""}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Lunia Remix</div>
                    <div style={{
                      padding: "12px 14px", borderRadius: 8, background: "var(--accent-dim)",
                      border: "1px solid var(--accent-mid)", fontFamily: "var(--font-ui)", fontSize: 12,
                      color: "var(--text)", lineHeight: 1.6, maxHeight: 180, overflowY: "auto",
                    }}>
                      {email.generated.sections.map(s => s.body).join("\n\n").slice(0, 600)}
                    </div>
                  </div>
                </div>

                {/* Image thumbnail */}
                {email.imageUrl && (
                  <div style={{ marginBottom: 16 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={email.imageUrl} alt="Email hero" style={{ height: 80, borderRadius: 6, border: "1px solid var(--border)" }} />
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  {onOpen && (
                    <button
                      onClick={() => onOpen(email)}
                      style={{
                        padding: "7px 16px", borderRadius: 7, cursor: "pointer",
                        background: "var(--accent)", border: "none",
                        fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600,
                        color: "var(--bg)",
                      }}
                    >
                      Open
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(email.id)}
                    disabled={deleting === email.id}
                    style={{
                      padding: "7px 16px", borderRadius: 7, cursor: "pointer",
                      background: "transparent", border: "1px solid var(--border)",
                      fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--muted)",
                    }}
                  >
                    {deleting === email.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
