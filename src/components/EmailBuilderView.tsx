"use client";
import { useState } from "react";
import { EmailSection, StylePreset } from "@/lib/types";
import { EmailInputStep } from "@/components/email/steps/EmailInputStep";
import { EmailTemplateStep } from "@/components/email/steps/EmailTemplateStep";

type Step = "input" | "template";

type SectionImageState = { loading: boolean; error: string | null };

type GeneratedData = {
  subjectLines: string[];
  preheader: string;
  sections: EmailSection[];
  cta: string;
  ps: string;
};

type Props = {
  onConvertToCarousel?: (data: { frameworkLabel: string; subjectLines: string[]; preheader: string; sections: EmailSection[] }) => void;
};

export default function EmailBuilderView({ onConvertToCarousel: _onConvertToCarousel }: Props) {
  const [step, setStep] = useState<Step>("input");

  // Source data (from input step)
  const [competitorText, setCompetitorText] = useState("");
  const [stylePreset, setStylePreset] = useState<StylePreset>("minimal-modern");
  const [frameworkLabel, setFrameworkLabel] = useState("");

  // Template state
  const [sections, setSections] = useState<EmailSection[]>([]);
  const [subjectLines, setSubjectLines] = useState<string[]>([]);
  const [preheader, setPreheader] = useState("");
  const [cta, setCta] = useState("");
  const [ps, setPs] = useState("");
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  // Image state — keyed by section.id (stable under future reorder)
  const [imageState, setImageState] = useState<Record<string, SectionImageState>>({});

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  function handleGenerated(
    result: { anatomy: unknown; frameworkLabel: string; generated: GeneratedData },
    text: string,
    preset: StylePreset,
  ) {
    setCompetitorText(text);
    setStylePreset(preset);
    setFrameworkLabel(result.frameworkLabel);

    const { sections: s, subjectLines: sl, preheader: ph, cta: c, ps: p } = result.generated;
    setSections(s);
    setSubjectLines(sl);
    setPreheader(ph);
    setCta(c);
    setPs(p);
    setActiveSubjectIndex(0);
    setSavedId(null);

    // Init image state for each section
    const initState: Record<string, SectionImageState> = {};
    s.forEach(sec => { initState[sec.id] = { loading: false, error: null }; });
    setImageState(initState);

    setStep("template");
  }

  function handleSectionChange(updated: EmailSection) {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
    setSavedId(null);
  }

  async function handleGenerateImage(sectionId: string) {
    const section = sections.find(s => s.id === sectionId);
    if (!section?.imagePrompt?.trim()) return;

    setImageState(prev => ({ ...prev, [sectionId]: { loading: true, error: null } }));
    try {
      const res = await fetch("/api/email/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: section.imagePrompt,
          imageStyle: section.imageStyle ?? "realistic",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImageState(prev => ({ ...prev, [sectionId]: { loading: false, error: data.error ?? "Image generation failed" } }));
        return;
      }
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, imageUrl: data.url } : s));
      setImageState(prev => ({ ...prev, [sectionId]: { loading: false, error: null } }));
      setSavedId(null);
    } catch {
      setImageState(prev => ({ ...prev, [sectionId]: { loading: false, error: "Image generation failed — try again." } }));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/email/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorText,
          stylePreset,
          frameworkLabel,
          activeSubjectIndex,
          generated: { sections, subjectLines, preheader, cta, ps },
        }),
      });
      setSavedId("saved-" + Date.now());
    } catch {
      // silent — user can retry
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    const anyLoading = Object.values(imageState).some(s => s.loading);
    if (anyLoading) return;
    const confirmed = window.confirm("Going back resets the template. Continue?");
    if (confirmed) setStep("input");
  }

  if (step === "input") {
    return <EmailInputStep onGenerated={handleGenerated} />;
  }

  return (
    <EmailTemplateStep
      sections={sections}
      subjectLines={subjectLines}
      preheader={preheader}
      cta={cta}
      ps={ps}
      activeSubjectIndex={activeSubjectIndex}
      imageState={imageState}
      saving={saving}
      savedId={savedId}
      onSectionChange={handleSectionChange}
      onGenerateImage={handleGenerateImage}
      onSubjectSelect={setActiveSubjectIndex}
      onPreheaderChange={setPreheader}
      onCtaChange={setCta}
      onPsChange={setPs}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}
