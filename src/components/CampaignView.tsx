"use client";
import { useState, useEffect, useRef } from "react";
import type { CampaignContent, EmailFlow, SavedCampaign, SavedCarousel } from "@/lib/types";
import BriefStep, { type CampaignBrief } from "@/components/campaign/BriefStep";
import CampaignEditor from "@/components/campaign/CampaignEditor";
import FlowDeck, { type DeckEmail } from "@/components/campaign/FlowDeck";
import KlaviyoFlowPicker from "@/components/email-review/KlaviyoFlowPicker";
import { getShape, applyPresetSettings } from "@/lib/campaign-shapes";
import { CampaignGenLoader } from "@/components/campaign/Loaders";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export default function CampaignView({
  initialCampaign,
  initialCarousel,
  onCampaignLoaded,
  onCarouselConsumed,
  onExit,
  onReload,
}: {
  initialCampaign?: SavedCampaign | null;
  initialCarousel?: SavedCarousel | null;
  onCampaignLoaded?: () => void;
  onCarouselConsumed?: () => void;
  /** Back arrow in the editor's top bar. */
  onExit?: () => void;
  onReload?: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  // What the loader is doing right now: writing, or laying out.
  const [loadingNote, setLoadingNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState<CampaignContent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  // Klaviyo-import state: the inline flow picker and the resulting email deck.
  const [showPicker, setShowPicker] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deck, setDeck] = useState<{ flowName: string; emails: DeckEmail[] } | null>(null);

  // Load a saved campaign from the library. Guard against re-loading the
  // SAME campaign more than once: if the library hands us the same id we
  // already have open, do nothing — otherwise this effect would clobber any
  // unsaved edits (e.g. a freshly generated hero image whose URL hasn't been
  // saved yet) with the stale server snapshot every time the parent
  // re-renders.
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCampaign) return;
    if (loadedIdRef.current === initialCampaign.id) {
      // Already loaded this campaign; ignore reruns.
      onCampaignLoaded?.();
      return;
    }
    loadedIdRef.current = initialCampaign.id;
    setTopic(initialCampaign.topic);
    setContent(initialCampaign.content);
    setSavedId(initialCampaign.id);
    setStep(2);
    onCampaignLoaded?.();
  }, [initialCampaign]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Restructure freshly generated copy into the chosen shape. Returns the
   *  original content unchanged if anything goes wrong. */
  async function layOutWithShape(
    content: CampaignContent,
    brief: CampaignBrief,
    topicForPrompt: string,
  ): Promise<CampaignContent> {
    try {
      const res = await fetch("/api/campaign/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blocks: content.blocks,
          subject: content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? "",
          topic: topicForPrompt,
          // The id, never guidance: guidance is resolved server-side.
          shapeId: brief.shapeId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.blocks) || data.blocks.length === 0) return content;
      const shape = getShape(brief.shapeId!) ?? brief.shape;
      return {
        ...applyPresetSettings(content, shape?.settings),
        blocks: data.blocks as CampaignContent["blocks"],
        theme: shape?.theme ?? content.theme,
        topBanner: data.topBanner ?? content.topBanner,
        promoBand: data.promoBand ?? content.promoBand,
        cta: data.ctaLabel ? { ...content.cta, label: data.ctaLabel } : content.cta,
      };
    } catch {
      return content;
    }
  }

  async function handleGenerate(brief: CampaignBrief, pinHeroUrl?: string | null) {
    setLoading(true);
    setLoadingNote(null);
    setError(null);
    try {
      const res = await fetch("/api/campaign/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...brief, test: brief.test === true }),
      });
      // A crashed function returns an HTML error page, not JSON. Parsing that
      // used to throw into the catch below and report "Network error", which
      // blames the user's connection for a server fault. Fail honestly instead.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.content) {
        setError(data?.error ?? `Generation failed on the server (${res.status}). Please try again.`);
        return;
      }
      let next: CampaignContent = data.content;
      if (pinHeroUrl) {
        const hero = next.images.find((i) => i.role === "hero");
        if (hero) hero.url = pinHeroUrl;
      }

      // Generation writes plain text blocks, so a shape chosen in the brief is
      // applied as a second pass here. Doing it client-side keeps the generate
      // route untouched and reuses the restructure route rather than teaching a
      // second prompt the whole block vocabulary.
      //
      // A failure FALLS BACK to the plain generated email, which is the
      // opposite of the rule in the editor. There, falling back would overwrite
      // copy you had written; here nothing exists to overwrite, and landing on
      // a plain email beats an error page after a campaign was already written.
      if (brief.shapeId && brief.shapeId !== "auto" && brief.test !== true) {
        setLoadingNote("Laying it out…");
        next = await layOutWithShape(next, brief, data.topic ?? brief.topic);
      }

      setTopic(data.topic ?? brief.topic);
      setContent(next);
      setSavedId(null);
      setStep(2);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setLoadingNote(null);
    }
  }

  // Seed the campaign from a carousel handed in by the library — auto-runs
  // generation using the carousel caption as the brief topic, then pins the
  // hero image to the carousel's hook image. Guarded by a ref so the same
  // carousel never re-triggers generation on subsequent re-renders.
  const seededCarouselIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialCarousel) return;
    if (initialCampaign) return; // explicit library campaign wins
    if (seededCarouselIdRef.current === initialCarousel.id) {
      onCarouselConsumed?.();
      return;
    }
    seededCarouselIdRef.current = initialCarousel.id;
    const caption = initialCarousel.content?.caption?.trim() ?? "";
    const topicSeed = (caption.length >= 4 ? caption : initialCarousel.topic).slice(0, 600);
    const hookImg =
      initialCarousel.hookImageUrl ??
      initialCarousel.slideImages?.find((u): u is string => !!u) ??
      null;
    const brief: CampaignBrief = {
      topic: topicSeed,
      occasion: "",
      offer: "",
      ctaUrl: "https://www.lunialife.com/products/lunia-sleep-vitamins",
      tone: "calm, editorial",
    };
    handleGenerate(brief, hookImg);
    onCarouselConsumed?.();
  }, [initialCarousel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Import a Klaviyo flow: convert every email verbatim into a branded
  // CampaignContent, then drop into the step-through deck.
  async function handleImportFlow(flow: EmailFlow) {
    setShowPicker(false);
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaign/from-klaviyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.emails) || data.emails.length === 0) {
        setError(data?.error ?? `Import failed on the server (${res.status}). Please try another flow.`);
        return;
      }
      const flowName: string = data.flowName ?? flow.flowName;
      const emails: DeckEmail[] = data.emails.map((e: { emailId: string; position: number; subject: string; content: CampaignContent; flagged?: boolean; usedFallback?: boolean }) => ({
        emailId: e.emailId,
        position: e.position,
        subject: e.subject,
        topic: `${flowName} · E${e.position}${e.subject ? ` · ${e.subject}` : ""}`.slice(0, 120),
        content: e.content,
        savedId: null,
        flagged: e.flagged,
        usedFallback: e.usedFallback,
      }));
      setDeck({ flowName, emails });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  function handleRestart() {
    setStep(1);
    setTopic("");
    setContent(null);
    setSavedId(null);
    setError(null);
    setShowPicker(false);
    setDeck(null);
    // Reset the loaded-id ref so the next library open re-seeds editor state.
    loadedIdRef.current = null;
    // Likewise reset the carousel seed ref so re-opening the same carousel
    // from the library after a manual New re-runs generation.
    seededCarouselIdRef.current = null;
  }

  // The editor is full-bleed inside the app shell; the brief and the deck keep
  // the page frame.
  const inEditor = !loading && !importing && !deck && step === 2 && !!content;
  return (
    <div className={inEditor ? "studio-frame" : undefined} style={inEditor ? undefined : { maxWidth: 1440, margin: "0 auto", padding: "48px 40px 80px" }}>
      {!inEditor && (
        <PageHeader
          title={step === 1 ? "New email" : "Email"}
          description={step === 1 ? "Write a Lunia Life email: subject, copy and images, then export the HTML or push it to Klaviyo." : undefined}
          actions={step === 2 ? <Button variant="secondary" onClick={handleRestart}>New</Button> : undefined}
        />
      )}

      {error && (
        <div style={{ background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.3)", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "var(--error)", marginBottom: 8 }}>{error}</div>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "var(--error)", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>
            Dismiss
          </button>
        </div>
      )}

      {(loading || importing) && <CampaignGenLoader note={loadingNote} />}

      {!loading && !importing && deck && (
        <FlowDeck flowName={deck.flowName} initialEmails={deck.emails} onExit={handleRestart} />
      )}

      {!loading && !importing && !deck && step === 1 && (
        <>
          {/* Klaviyo import entry — pull an existing flow's images + copy into
              this same template, one branded email per flow message. */}
          <div style={{ marginBottom: 18 }}>
            {showPicker ? (
              <KlaviyoFlowPicker flowsOnly onPicked={handleImportFlow} onCancel={() => setShowPicker(false)} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "var(--muted)" }}>
                  Already have a flow in Klaviyo?{" "}
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>Import it</span> to rebuild each email in this template — verbatim.
                </div>
                <button
                  onClick={() => setShowPicker(true)}
                  className="btn-ghost"
                  style={{ whiteSpace: "nowrap" }}
                >
                  ↓ Import from Klaviyo
                </button>
              </div>
            )}
          </div>
          {!showPicker && <BriefStep onGenerate={handleGenerate} />}
        </>
      )}

      {!loading && !importing && !deck && step === 2 && content && (
        <CampaignEditor
          topic={topic}
          content={content}
          savedId={savedId}
          onChange={setContent}
          onSaved={setSavedId}
          onExit={onExit}
          onRestart={handleRestart}
          onReload={onReload}
        />
      )}
    </div>
  );
}
