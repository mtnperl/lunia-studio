import { getBriefByPublicId } from "@/lib/kv";
import { notFound } from "next/navigation";
import { ANGLE_LIBRARY } from "@/lib/angleLibrary";
import type { UGCBrief } from "@/lib/types";

type Props = { params: Promise<{ publicId: string }> };

function angleLabel(key: string) {
  return ANGLE_LIBRARY.find((a) => a.key === key)?.label ?? key;
}

export default async function BriefSharePage({ params }: Props) {
  const { publicId } = await params;
  const brief = await getBriefByPublicId(publicId);

  if (!brief) notFound();

  if (brief.revokedAt) {
    return <RevokedPage />;
  }

  return <BriefView brief={brief} />;
}

function RevokedPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#FFFFFF",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6E6E73", marginBottom: 12 }}>
          Link revoked
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1D1D1F", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          This brief is no longer available
        </h1>
        <p style={{ fontSize: 14, color: "#6E6E73", lineHeight: 1.6, margin: 0 }}>
          The link to this brief has been revoked. Contact the sender for an updated version.
        </p>
      </div>
    </div>
  );
}

function ScriptSection({ label, text }: { label: string; text: string }) {
  if (!text?.trim()) return null;
  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#98989D",
        margin: "0 0 10px",
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 15,
        lineHeight: 1.75,
        color: "#1D1D1F",
        margin: 0,
        whiteSpace: "pre-wrap",
      }}>
        {text}
      </p>
    </div>
  );
}

function BriefView({ brief }: { brief: UGCBrief }) {
  const { title, angle, conceptLabel, creatorName, script, status } = brief;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFFFF",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>
      {/* Header strip */}
      <div style={{
        borderBottom: "1px solid #D2D2D7",
        padding: "16px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1D1D1F", letterSpacing: "-0.01em" }}>
          Lunia Life
        </span>
        <span style={{ fontSize: 12, color: "#98989D" }}>UGC Brief</span>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "56px 40px 100px" }}>
        {/* Meta */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6E6E73",
              border: "1px solid #D2D2D7",
              borderRadius: 4,
              padding: "2px 8px",
            }}>
              {angleLabel(angle)}
            </span>
            {status === "approved" && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#1C7A3A",
                border: "1px solid #D2D2D7",
                borderRadius: 4,
                padding: "2px 8px",
              }}>
                Approved
              </span>
            )}
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "#1D1D1F",
            margin: "0 0 8px",
            lineHeight: 1.25,
          }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: "#6E6E73", margin: 0 }}>
            {conceptLabel}
            {creatorName && <> &mdash; for {creatorName}</>}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#D2D2D7", marginBottom: 40 }} />

        {/* Script */}
        <ScriptSection label="Video hook" text={script.videoHook} />
        <ScriptSection label="Text hook / caption" text={script.textHook} />
        <ScriptSection label="Narrative" text={script.narrative} />
        <ScriptSection label="CTA" text={script.cta} />

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #D2D2D7" }}>
          <p style={{ fontSize: 12, color: "#98989D", margin: 0, lineHeight: 1.6 }}>
            This script is a creative starting point. Personalise the story to your experience.
            Any questions? Reach out to the Lunia team.
          </p>
        </div>
      </div>
    </div>
  );
}
