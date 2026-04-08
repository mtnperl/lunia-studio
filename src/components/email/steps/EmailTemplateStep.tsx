"use client";
import { EmailSection } from "@/lib/types";
import { EmailSectionSlide } from "@/components/email/EmailSectionSlide";

type SectionImageState = { loading: boolean; error: string | null };

type Props = {
  sections: EmailSection[];
  subjectLines: string[];
  preheader: string;
  cta: string;
  ps: string;
  activeSubjectIndex: number;
  imageState: Record<string, SectionImageState>;
  saving: boolean;
  savedId: string | null;
  onSectionChange: (updated: EmailSection) => void;
  onGenerateImage: (sectionId: string) => void;
  onSubjectSelect: (index: number) => void;
  onPreheaderChange: (val: string) => void;
  onCtaChange: (val: string) => void;
  onPsChange: (val: string) => void;
  onSave: () => void;
  onBack: () => void;
};

export function EmailTemplateStep({
  sections,
  subjectLines,
  preheader,
  cta,
  ps,
  activeSubjectIndex,
  imageState,
  saving,
  savedId,
  onSectionChange,
  onGenerateImage,
  onSubjectSelect,
  onPreheaderChange,
  onCtaChange,
  onPsChange,
  onSave,
  onBack,
}: Props) {
  const anyLoading = Object.values(imageState).some(s => s.loading);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 100px" }}>
      {/* Subject selector */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--muted)", marginBottom: 10,
        }}>
          Subject Line
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {subjectLines.map((s, i) => (
            <button
              key={i}
              onClick={() => onSubjectSelect(i)}
              style={{
                padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                background: activeSubjectIndex === i ? "var(--accent-dim)" : "var(--surface-r)",
                border: activeSubjectIndex === i ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                fontFamily: "var(--font-ui)", fontSize: 13,
                color: activeSubjectIndex === i ? "var(--text)" : "var(--muted)",
                textAlign: "left", transition: "all 0.12s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Preheader */}
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--subtle)", marginBottom: 6,
          }}>
            Preheader
          </div>
          <textarea
            value={preheader}
            onChange={e => onPreheaderChange(e.target.value)}
            rows={2}
            style={{
              width: "100%", resize: "vertical",
              padding: "8px 12px", borderRadius: 8,
              background: "var(--surface-r)", border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--muted)",
              lineHeight: 1.6, boxSizing: "border-box", outline: "none",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      </div>

      {/* Section cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        {sections.map(section => (
          <EmailSectionSlide
            key={section.id}
            section={section}
            onSectionChange={onSectionChange}
            onGenerateImage={() => onGenerateImage(section.id)}
            imageLoading={imageState[section.id]?.loading ?? false}
            imageError={imageState[section.id]?.error ?? null}
          />
        ))}
      </div>

      {/* CTA card */}
      {cta && (
        <div style={{
          padding: "16px 18px", borderRadius: 10, marginBottom: 10,
          background: "var(--accent-dim)", border: "1px solid var(--accent-mid)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)",
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
          }}>
            CTA
          </div>
          <textarea
            value={cta}
            onChange={e => onCtaChange(e.target.value)}
            rows={2}
            style={{
              width: "100%", resize: "vertical",
              background: "transparent", border: "none", outline: "none", padding: 0,
              fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
              color: "var(--text)", lineHeight: 1.5, boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* P.S. card */}
      {ps && (
        <div style={{
          padding: "16px 18px", borderRadius: 10, marginBottom: 24,
          background: "var(--surface-r)", border: "1px solid var(--border)",
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)",
            letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
          }}>
            P.S.
          </div>
          <textarea
            value={ps}
            onChange={e => onPsChange(e.target.value)}
            rows={2}
            style={{
              width: "100%", resize: "vertical",
              background: "transparent", border: "none", outline: "none", padding: 0,
              fontFamily: "var(--font-ui)", fontSize: 13, fontStyle: "italic",
              color: "var(--muted)", lineHeight: 1.6, boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Footer actions */}
      <div style={{
        position: "sticky", bottom: 0,
        background: "var(--bg)", borderTop: "1px solid var(--border)",
        padding: "16px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          onClick={onBack}
          disabled={anyLoading}
          style={{
            padding: "8px 18px", borderRadius: 8,
            cursor: anyLoading ? "not-allowed" : "pointer",
            background: "var(--surface-r)", border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)", fontSize: 13, color: anyLoading ? "var(--subtle)" : "var(--muted)",
          }}
        >
          ← Back
        </button>
        <button
          onClick={onSave}
          disabled={saving || !!savedId}
          style={{
            padding: "8px 24px", borderRadius: 8,
            cursor: saving || savedId ? "default" : "pointer",
            background: savedId ? "var(--success)" : "var(--accent)",
            border: "none",
            fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600,
            color: savedId ? "#fff" : "var(--bg)",
            transition: "all 0.15s",
          }}
        >
          {savedId ? "Saved" : saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
