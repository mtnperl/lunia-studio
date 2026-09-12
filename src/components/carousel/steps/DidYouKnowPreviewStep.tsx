"use client";
import { useEffect, useRef, useState } from "react";
import DidYouKnowSlide from "@/components/carousel/slides/DidYouKnowSlide";
import PaperControls from "@/components/carousel/shared/PaperControls";
import { rememberPen, rememberedPen } from "@/lib/pen-memory";
import { PEN_PRESETS } from "@/lib/brand-tokens";
import { PAPER_DEFAULTS, type PaperSettings } from "@/lib/brand-tokens";
import { compositeSlideWithImages } from "@/lib/slide-export";
import { deviceSharesFiles, saveFiles } from "@/lib/save-files";
import type { DidYouKnowContent, DidYouKnowTreatment } from "@/lib/types";
import { useCarouselApi } from "@/components/carousel/api-context";

const PREVIEW_SCALE = 0.48;

const TREATMENTS: { val: DidYouKnowTreatment; label: string; desc: string }[] = [
  { val: "navy-box", label: "Navy box", desc: "The number in a navy box, the question's last word boxed too" },
  { val: "yellow-box", label: "Yellow box", desc: "The number in Signal Yellow, the question plain" },
];

type Props = {
  topic: string;
  variants: DidYouKnowContent[];
  selected: number;
  onSelect: (i: number) => void;
  onSaved?: (id: string) => void;
  /** Opened from the library: Save updates this record instead of minting a new one. */
  initialSavedId?: string | null;
  initialTreatment?: DidYouKnowTreatment;
  initialPaper?: PaperSettings;
};

/** Same-origin assets (the paper grain) as data URLs for the canvas compositor. */
async function loadDataUrl(src: string): Promise<string> {
  if (src.startsWith("data:")) return src;
  const blob = await (await fetch(src)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export default function DidYouKnowPreviewStep({ topic, variants, selected, onSelect, onSaved, initialSavedId, initialTreatment, initialPaper }: Props) {
  const apiBase = useCarouselApi();
  const exportSlide1Ref = useRef<HTMLDivElement>(null);
  const exportSlide2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  // PNGs built ahead of the tap, for the same reason as the two-slide step:
  // iOS opens the share sheet only inside a fresh gesture.
  const filesRef = useRef<File[]>([]);
  const [ready, setReady] = useState(0);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [shareCapable, setShareCapable] = useState(false);
  useEffect(() => { setShareCapable(deviceSharesFiles()); }, []);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId ?? null);
  // The first save makes the shell open the saved document, which remounts
  // this step before the id has been read from it. Take the id when it lands.
  useEffect(() => { if (initialSavedId) setSavedId(initialSavedId); }, [initialSavedId]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopyLabel, setLinkCopyLabel] = useState("Copy link");
  const [fontScale, setFontScale] = useState(1);
  const [treatment, setTreatment] = useState<DidYouKnowTreatment>(initialTreatment ?? "navy-box");
  // The pen colour chosen last time is the starting pen for a new piece;
  // a saved piece keeps its own.
  const [paper, setPaper] = useState<PaperSettings>(() => initialPaper ?? { ...PAPER_DEFAULTS.highlighter, pen: rememberedPen("did_you_know") });
  const setPaperRemembered = (p: PaperSettings) => { rememberPen("did_you_know", p.pen); setPaper(p); };

  function handleCopyShareLink() {
    if (!savedId) return;
    navigator.clipboard.writeText(`${window.location.origin}/carousels/${savedId}`).then(() => {
      setLinkCopyLabel("Copied!");
      setTimeout(() => setLinkCopyLabel("Copy link"), 2000);
    }).catch(() => setError("Clipboard unavailable"));
  }

  const variant = variants[selected];

  const safeTopic = (variant?.topic || topic).replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();

  async function buildFiles(): Promise<File[]> {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const nodes = [exportSlide1Ref.current, exportSlide2Ref.current];
    const out: File[] = [];
    for (let i = 0; i < 2; i++) {
      const node = nodes[i];
      if (!node) throw new Error("Slide not mounted");
      // The paper grain is a multiply layer; the compositor hides it for the
      // capture and redraws it over the ground, so the PNG matches the preview.
      out.push(await compositeSlideWithImages(node, [], { filename: `dyk-${safeTopic}-${i + 1}.png`, exportH: 1350, loadDataUrl }));
    }
    return out;
  }

  useEffect(() => {
    let cancelled = false;
    filesRef.current = [];
    setReady(0);
    setPrepError(null);
    const t = setTimeout(async () => {
      try {
        await new Promise((r) => setTimeout(r, 150));
        if (cancelled) return;
        if (!variant) return;
        const files = await buildFiles();
        if (cancelled) return;
        filesRef.current = files;
        setReady(files.length);
      } catch (err) {
        if (cancelled) return;
        console.error("[dyk-preview] prepare failed", err);
        setPrepError(err instanceof Error ? err.message : "Export failed");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, variant, treatment, paper.grain, paper.vignette, fontScale]);

  if (!variant) return null;

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      const files = filesRef.current.length === 2 ? filesRef.current : await buildFiles();
      await saveFiles(files, `Lunia Did you know: ${variant.topic || topic}`);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error(err);
      setError(`Download failed: ${err instanceof Error ? err.message : "try again"}`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(savedId ? { id: savedId } : {}),
          topic: variant.topic || topic,
          format: "did_you_know",
          didYouKnowContent: variant,
          didYouKnowTreatment: treatment,
          paperGrain: paper.grain,
          paperVignette: paper.vignette,
          penColor: paper.pen,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setError(data.error || "Save failed");
        return;
      }
      setSavedId(data.id);
      onSaved?.(data.id);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function copyCaption() {
    navigator.clipboard.writeText(variant.caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => setError("Clipboard unavailable"));
  }

  const labelStyle = { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" } as const;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Pick a variant</h2>
      <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        {variants.length} fact angle{variants.length === 1 ? "" : "s"} for: <span style={{ color: "var(--text)", fontWeight: 600 }}>{topic}</span>
      </p>

      {/* Variant picker */}
      {variants.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {variants.map((v, i) => {
            const sel = selected === i;
            const hasViolations = v.violations && v.violations.length > 0;
            const preview = v.slide1.body1.map((t) => t.text).join("").slice(0, 80);
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                style={{
                  flex: "1 1 220px",
                  textAlign: "left",
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  fontFamily: "inherit",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: sel ? "var(--accent)" : "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Variant {i + 1}
                  </div>
                  {hasViolations && (
                    <span title={v.violations!.join("\n")} style={{
                      fontSize: 10, fontWeight: 700,
                      color: "#b85c5c",
                      background: "rgba(184,92,92,0.12)",
                      padding: "1px 6px", borderRadius: 3,
                    }}>
                      ⚠ {v.violations!.length}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                  {preview}…
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Treatment: which box the marked phrase takes */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={labelStyle}>Treatment</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TREATMENTS.map((opt) => {
            const sel = treatment === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => setTreatment(opt.val)}
                title={opt.desc}
                style={{
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "8px 12px", cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  boxShadow: sel ? "0 0 0 3px rgba(30,122,138,0.12)" : "none",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  color: sel ? "var(--accent)" : "var(--text)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Paper: grain and vignette */}
      <PaperControls value={paper} defaults={PAPER_DEFAULTS.highlighter} onChange={setPaperRemembered} penDefault={PEN_PRESETS[0].hex} />

      {/* Font size control */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
        padding: "10px 14px", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 8,
      }}>
        <span style={labelStyle}>
          Font size
        </span>
        <input
          type="range"
          min={0.85}
          max={1.3}
          step={0.05}
          value={fontScale}
          onChange={(e) => setFontScale(Number(e.target.value))}
          style={{ flex: 1, accentColor: "var(--accent)" }}
        />
        <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--text)", minWidth: 44, textAlign: "right" }}>
          {Math.round(fontScale * 100)}%
        </span>
        <button
          onClick={() => setFontScale(1)}
          style={{
            fontSize: 11, fontWeight: 600, color: "var(--accent)",
            background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
          }}
        >
          Reset
        </button>
      </div>

      {/* Slides preview */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <DidYouKnowSlide slide={variant.slide1} index={1} treatment={treatment} paper={paper} scale={PREVIEW_SCALE} fontScale={fontScale} />
        <DidYouKnowSlide slide={variant.slide2} index={2} treatment={treatment} paper={paper} scale={PREVIEW_SCALE} fontScale={fontScale} />
      </div>

      {/* Hidden full-size slides for accurate PNG export — bypasses the inner transform: scale() on the visible preview. */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={exportSlide1Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={variant.slide1} index={1} treatment={treatment} paper={paper} scale={1} fontScale={fontScale} />
        </div>
        <div ref={exportSlide2Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={variant.slide2} index={2} treatment={treatment} paper={paper} scale={1} fontScale={fontScale} />
        </div>
      </div>

      {/* Caption */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={labelStyle}>Caption</div>
          <button
            onClick={copyCaption}
            style={{
              fontSize: 12, fontWeight: 600, color: copied ? "var(--success)" : "var(--accent)",
              background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{variant.caption}</div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={handleDownload}
          disabled={downloading || (ready < 2 && !prepError)}
          title={ready < 2 ? "Preparing the PNGs" : shareCapable ? "Opens the share sheet with both slides. Save Image puts them in Photos together." : "Downloads both slides"}
          style={{
            background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
            padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: downloading || ready < 2 ? "wait" : "pointer",
            opacity: ready < 2 && !prepError ? 0.6 : 1,
            fontFamily: "inherit",
          }}
        >
          {downloading ? (shareCapable ? "Opening share sheet..." : "Downloading...") : ready < 2 && !prepError ? `Preparing PNGs ${ready}/2` : shareCapable ? "Save both to Photos" : "Download PNGs"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "var(--surface)",
            color: "var(--text)",
            border: "1.5px solid var(--border)",
            borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving..." : savedId ? "Save changes" : "Save to library"}
        </button>
        {savedId && (
          <button
            onClick={handleCopyShareLink}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1.5px solid var(--border)",
              borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {linkCopyLabel}
          </button>
        )}
        {savedId && !saving && (
          <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>
        )}
        {(error || prepError) && <div style={{ fontSize: 13, color: "var(--error)" }}>{error ?? `Could not prepare the PNGs: ${prepError}`}</div>}
      </div>
    </div>
  );
}
