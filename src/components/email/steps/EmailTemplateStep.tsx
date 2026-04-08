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
  topic: string;
  activeSubjectIndex: number;
  imageState: Record<string, SectionImageState>;
  subjectEnhancing: boolean[];
  saving: boolean;
  savedId: string | null;
  onSectionChange: (updated: EmailSection) => void;
  onGenerateImage: (sectionId: string) => void;
  onSubjectSelect: (index: number) => void;
  onPreheaderChange: (val: string) => void;
  onCtaChange: (val: string) => void;
  onPsChange: (val: string) => void;
  onTopicChange: (val: string) => void;
  onEnhanceSubject: (index: number) => void;
  onSave: () => void;
  onBack: () => void;
};

function SpinnerChar() {
  // Simple inline CSS animation trick via a key-frame style block
  return <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>✦</span>;
}

export function EmailTemplateStep({
  sections,
  subjectLines,
  preheader,
  cta,
  ps,
  topic,
  activeSubjectIndex,
  imageState,
  subjectEnhancing,
  saving,
  savedId,
  onSectionChange,
  onGenerateImage,
  onSubjectSelect,
  onPreheaderChange,
  onCtaChange,
  onPsChange,
  onTopicChange,
  onEnhanceSubject,
  onSave,
  onBack,
}: Props) {
  const anyLoading = Object.values(imageState).some(s => s.loading);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 40px 100px" }}>

      {/* ── Email topic ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--muted)", marginBottom: 8,
        }}>
          Email Topic
        </div>
        <input
          type="text"
          value={topic}
          onChange={e => onTopicChange(e.target.value)}
          placeholder="e.g. Morning energy optimization with adaptogens"
          style={{
            width: "100%", padding: "10px 14px",
            borderRadius: 8, background: "var(--surface-r)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500,
            color: "var(--text)", boxSizing: "border-box", outline: "none",
            transition: "border-color 0.12s",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)", marginTop: 5 }}>
          Used by the AI enhancer to keep suggestions on-topic
        </div>
      </div>

      {/* ── Subject selector ── */}
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
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => onSubjectSelect(i)}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  background: activeSubjectIndex === i ? "var(--accent-dim)" : "var(--surface-r)",
                  border: activeSubjectIndex === i ? "1px solid var(--accent-mid)" : "1px solid var(--border)",
                  fontFamily: "var(--font-ui)", fontSize: 13,
                  color: activeSubjectIndex === i ? "var(--text)" : "var(--muted)",
                  textAlign: "left", transition: "all 0.12s",
                }}
              >
                {s}
              </button>
              {/* Enhance button */}
              <button
                onClick={() => onEnhanceSubject(i)}
                disabled={subjectEnhancing[i]}
                title="Enhance with AI"
                style={{
                  flexShrink: 0, width: 32, height: 36, borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-r)",
                  cursor: subjectEnhancing[i] ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                  opacity: subjectEnhancing[i] ? 0.5 : 1,
                }}
              >
                {subjectEnhancing[i]
                  ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--subtle)" }}>…</span>
                  : <SpinnerChar />}
              </button>
            </div>
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

      {/* ── Section cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        {sections.map(section => (
          <EmailSectionSlide
            key={section.id}
            section={section}
            topic={topic}
            onSectionChange={onSectionChange}
            onGenerateImage={() => onGenerateImage(section.id)}
            imageLoading={imageState[section.id]?.loading ?? false}
            imageError={imageState[section.id]?.error ?? null}
          />
        ))}
      </div>

      {/* ── CTA card ── */}
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

      {/* ── P.S. card ── */}
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

      {/* ── Sticky footer ── */}
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
            color: "#fff",
            transition: "all 0.15s",
          }}
        >
          {savedId ? "✓ Saved to Library" : saving ? "Saving..." : "Save to Library"}
        </button>
      </div>
    </div>
  );
}

