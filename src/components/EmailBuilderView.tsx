"use client";
import { useState } from "react";
import { EmailSection, EmailAnatomy, StylePreset } from "@/lib/types";
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
  onSaved?: () => void;
};

export default function EmailBuilderView({ onConvertToCarousel: _onConvertToCarousel, onSaved }: Props) {
  const [step, setStep] = useState<Step>("input");

  // Source data (from input step)
  const [competitorText, setCompetitorText] = useState("");

  // Analysis metadata (needed for save)
  const [topic, setTopic] = useState("");
  const [anatomy, setAnatomy] = useState<EmailAnatomy | null>(null);
  const [score, setScore] = useState<number>(0);
  const [scoreDiagnosis, setScoreDiagnosis] = useState("");
  const [frameworkLabel, setFrameworkLabel] = useState("");
  const [sendTimingChip, setSendTimingChip] = useState("");

  // Template state
  const [sections, setSections] = useState<EmailSection[]>([]);
  const [subjectLines, setSubjectLines] = useState<string[]>([]);
  const [preheader, setPreheader] = useState("");
  const [cta, setCta] = useState("");
  const [ps, setPs] = useState("");
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);

  // Image state — keyed by section.id
  const [imageState, setImageState] = useState<Record<string, SectionImageState>>({});

  // Subject line enhance state
  const [subjectEnhancing, setSubjectEnhancing] = useState<boolean[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  function handleGenerated(
    result: {
      topic: string;
      anatomy: EmailAnatomy;
      score: number;
      scoreDiagnosis: string;
      frameworkLabel: string;
      sendTimingChip: string;
      generated: GeneratedData;
    },
    text: string,
  ) {
    setCompetitorText(text);
    setTopic(result.topic ?? "");
    setAnatomy(result.anatomy);
    setScore(result.score);
    setScoreDiagnosis(result.scoreDiagnosis ?? "");
    setFrameworkLabel(result.frameworkLabel ?? "");
    setSendTimingChip(result.sendTimingChip ?? "");

    const { sections: s, subjectLines: sl, preheader: ph, cta: c, ps: p } = result.generated;
    setSections(s);
    setSubjectLines(sl);
    setPreheader(ph);
    setCta(c);
    setPs(p);
    setActiveSubjectIndex(0);
    setSavedId(null);

    // Init image state
    const initState: Record<string, SectionImageState> = {};
    s.forEach(sec => { initState[sec.id] = { loading: false, error: null }; });
    setImageState(initState);

    // Init subject enhance state
    setSubjectEnhancing(sl.map(() => false));

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

  async function handleEnhanceSubject(index: number) {
    const current = subjectLines[index];
    if (!current?.trim()) return;

    setSubjectEnhancing(prev => prev.map((v, i) => i === index ? true : v));
    try {
      const res = await fetch("/api/email/enhance-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: current, topic, type: "subject" }),
      });
      const data = await res.json();
      if (res.ok && data.enhanced) {
        setSubjectLines(prev => prev.map((s, i) => i === index ? data.enhanced : s));
        setSavedId(null);
      }
    } catch { /* silent */ }
    setSubjectEnhancing(prev => prev.map((v, i) => i === index ? false : v));
  }

  async function handleSave() {
    if (!anatomy || score == null) return;
    setSaving(true);
    try {
      const res = await fetch("/api/email/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitorText,
          stylePreset: "minimal-modern" as StylePreset,
          anatomy,
          score,
          scoreDiagnosis,
          frameworkLabel,
          sendTimingChip,
          generated: { sections, subjectLines, preheader, cta, ps },
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setSavedId(data.id ?? "saved-" + Date.now());
      onSaved?.();
    } catch {
      // silent
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
      topic={topic}
      activeSubjectIndex={activeSubjectIndex}
      imageState={imageState}
      subjectEnhancing={subjectEnhancing}
      saving={saving}
      savedId={savedId}
      onSectionChange={handleSectionChange}
      onGenerateImage={handleGenerateImage}
      onSubjectSelect={setActiveSubjectIndex}
      onPreheaderChange={setPreheader}
      onCtaChange={setCta}
      onPsChange={setPs}
      onTopicChange={setTopic}
      onEnhanceSubject={handleEnhanceSubject}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}
