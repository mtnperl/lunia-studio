"use client";

type Props = {
  title: string;
  description: string;
  phase: string;
};

export default function ComingSoon({ title, description, phase }: Props) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "48px 32px",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--subtle)",
          marginBottom: 12,
        }}>
          {phase}
        </div>
        <h2 style={{
          fontFamily: "var(--font-ui)",
          fontSize: 24,
          fontWeight: 600,
          margin: "0 0 12px",
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}>
          {title}
        </h2>
        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--muted)",
          margin: 0,
          maxWidth: 540,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.6,
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}
