"use client";

// The preview and save step for the Chartbook and Primer formats. One
// component for both: pick a variant, tune the paper, download the two
// PNGs, save. The slides are frozen renderers of the variant's fields; the
// fields themselves are editable in place (TwoSlideEditor), so the words
// and numbers can change while the composition cannot.

import { useEffect, useRef, useState, type ReactNode } from "react";
import PaperControls from "@/components/carousel/shared/PaperControls";
import TwoSlideEditor from "@/components/carousel/steps/TwoSlideEditor";
import { ChartbookCoverSlide, ChartbookFigureSlide } from "@/components/carousel/slides/ChartbookSlides";
import { PrimerBodySlide, PrimerCoverSlide } from "@/components/carousel/slides/PrimerSlides";
import { PAPER_DEFAULTS, type PaperSettings } from "@/lib/brand-tokens";
import { compositeSlideWithImages } from "@/lib/slide-export";
import { deviceSharesFiles, saveFiles } from "@/lib/save-files";
import type { ChartbookContent, PrimerContent } from "@/lib/types";
import { useCarouselApi } from "@/components/carousel/api-context";

const PREVIEW_SCALE = 0.48;

export type TwoSlideFormat = "chartbook" | "primer";
export type TwoSlideVariant = ChartbookContent | PrimerContent;

type Props = {
  format: TwoSlideFormat;
  topic: string;
  variants: TwoSlideVariant[];
  selected: number;
  onSelect: (i: number) => void;
  /** An edit to variant `i`. The renderers redraw from the new fields and
   *  the PNGs rebuild; the parent owns the array so the draft persists. */
  onChange?: (i: number, next: TwoSlideVariant) => void;
  onSaved?: (id: string) => void;
  initialSavedId?: string | null;
  initialPaper?: PaperSettings;
};

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

/** A one-line description of a variant for the picker. */
export function twoSlideSummary(format: TwoSlideFormat, v: TwoSlideVariant): string {
  if (format === "chartbook") {
    const c = v as ChartbookContent;
    return `${c.figure.layout.replace("-", " ")}: ${c.figure.title}`;
  }
  const p = v as PrimerContent;
  return `${p.slide.layout}: ${p.slide.title}`;
}

/** The two slides of a variant, at a scale. Shared by the preview, the
 *  hidden export nodes and the share page. */
export function renderTwoSlides(format: TwoSlideFormat, v: TwoSlideVariant, paper: PaperSettings, scale: number, fontScale = 1): [ReactNode, ReactNode] {
  if (format === "chartbook") {
    const c = v as ChartbookContent;
    return [
      <ChartbookCoverSlide key="c1" content={c} paper={paper} scale={scale} fontScale={fontScale} />,
      <ChartbookFigureSlide key="c2" content={c} paper={paper} scale={scale} fontScale={fontScale} />,
    ];
  }
  const p = v as PrimerContent;
  return [
    <PrimerCoverSlide key="p1" content={p} paper={paper} scale={scale} fontScale={fontScale} />,
    <PrimerBodySlide key="p2" content={p} paper={paper} scale={scale} fontScale={fontScale} />,
  ];
}

export default function TwoSlidePreviewStep({ format, topic, variants, selected, onSelect, onChange, onSaved, initialSavedId, initialPaper }: Props) {
  const [editing, setEditing] = useState(false);
  const apiBase = useCarouselApi();
  const exportSlide1Ref = useRef<HTMLDivElement>(null);
  const exportSlide2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  // The two PNGs are built ahead of the tap. iOS only opens the share sheet
  // inside a fresh user gesture, and building a slide takes longer than a
  // gesture lasts, so the files must already exist when the button is hit.
  const filesRef = useRef<File[]>([]);
  const [ready, setReady] = useState(0);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [shareCapable, setShareCapable] = useState(false);
  useEffect(() => { setShareCapable(deviceSharesFiles()); }, []);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopyLabel, setLinkCopyLabel] = useState("Copy link");
  const [fontScale, setFontScale] = useState(1);
  const [paper, setPaper] = useState<PaperSettings>(initialPaper ?? PAPER_DEFAULTS[format]);

  const variant = variants[selected];
  const label = format === "chartbook" ? "Chartbook" : "Primer";

  function handleCopyShareLink() {
    if (!savedId) return;
    navigator.clipboard.writeText(`${window.location.origin}/carousels/${savedId}`).then(() => {
      setLinkCopyLabel("Copied!");
      setTimeout(() => setLinkCopyLabel("Copy link"), 2000);
    }).catch(() => setError("Clipboard unavailable"));
  }

  const safeTopic = (variant?.topic || topic).replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();

  async function buildFiles(): Promise<File[]> {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const nodes = [exportSlide1Ref.current, exportSlide2Ref.current];
    const out: File[] = [];
    for (let i = 0; i < 2; i++) {
      const node = nodes[i];
      if (!node) throw new Error("Slide not mounted");
      out.push(await compositeSlideWithImages(node, [], { filename: `${format}-${safeTopic}-${i + 1}.png`, exportH: 1350, loadDataUrl }));
    }
    return out;
  }

  // Rebuild the PNGs whenever what they show changes. Debounced so a slider
  // drag does not render on every tick.
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
        console.error(`[${format}-preview] prepare failed`, err);
        setPrepError(err instanceof Error ? err.message : "Export failed");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, selected, variant, paper.grain, paper.vignette, fontScale]);

  if (!variant) return null;

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      // Cached files first: that keeps the share sheet inside the tap on iOS.
      const files = filesRef.current.length === 2 ? filesRef.current : await buildFiles();
      await saveFiles(files, `Lunia ${label}: ${variant.topic || topic}`);
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
          format,
          ...(format === "chartbook" ? { chartbookContent: variant } : { primerContent: variant }),
          paperGrain: paper.grain,
          paperVignette: paper.vignette,
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
  const [preview1, preview2] = renderTwoSlides(format, variant, paper, PREVIEW_SCALE, fontScale);
  const [export1, export2] = renderTwoSlides(format, variant, paper, 1, fontScale);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>Pick a variant</h2>
      <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: 14 }}>
        {variants.length} {label} piece{variants.length === 1 ? "" : "s"} for: <span style={{ color: "var(--text)", fontWeight: 600 }}>{topic}</span>
      </p>

      {variants.length > 1 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {variants.map((v, i) => {
            const sel = selected === i;
            const hasViolations = v.violations && v.violations.length > 0;
            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                style={{
                  flex: "1 1 220px", textAlign: "left",
                  border: `1.5px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                  background: sel ? "rgba(30,122,138,0.06)" : "var(--bg)",
                  fontFamily: "inherit", position: "relative",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: sel ? "var(--accent)" : "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Variant {i + 1}
                  </div>
                  {hasViolations && (
                    <span title={v.violations!.join("\n")} style={{ fontSize: 10, fontWeight: 700, color: "#b85c5c", background: "rgba(184,92,92,0.12)", padding: "1px 6px", borderRadius: 3 }}>
                      ⚠ {v.violations!.length}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{twoSlideSummary(format, v)}</div>
              </button>
            );
          })}
        </div>
      )}

      <PaperControls value={paper} defaults={PAPER_DEFAULTS[format]} onChange={setPaper} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <span style={labelStyle}>Font size</span>
        <input type="range" min={0.85} max={1.2} step={0.05} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--accent)" }} />
        <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--text)", minWidth: 44, textAlign: "right" }}>{Math.round(fontScale * 100)}%</span>
        <button onClick={() => setFontScale(1)} style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>Reset</button>
      </div>

      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        {preview1}
        {preview2}
      </div>

      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={exportSlide1Ref} style={{ width: 1080, height: 1350 }}>{export1}</div>
        <div ref={exportSlide2Ref} style={{ width: 1080, height: 1350 }}>{export2}</div>
      </div>

      {onChange && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setEditing((v) => !v)}
            style={{ background: editing ? "var(--text)" : "var(--surface)", color: editing ? "var(--bg)" : "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {editing ? "Done editing" : "Edit the text"}
          </button>
          {editing && (
            <div style={{ marginTop: 12 }}>
              <TwoSlideEditor format={format} variant={variant} onChange={(next) => onChange(selected, next)} />
            </div>
          )}
        </div>
      )}

      {!editing && <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={labelStyle}>Caption</div>
          <button onClick={copyCaption} style={{ fontSize: 12, fontWeight: 600, color: copied ? "var(--success)" : "var(--accent)", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{variant.caption}</div>
      </div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={handleDownload} disabled={downloading || (ready < 2 && !prepError)} title={ready < 2 ? "Preparing the PNGs" : shareCapable ? "Opens the share sheet with both slides. Save Image puts them in Photos together." : "Downloads both slides"} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: downloading || ready < 2 ? "wait" : "pointer", opacity: ready < 2 && !prepError ? 0.6 : 1, fontFamily: "inherit" }}>
          {downloading ? (shareCapable ? "Opening share sheet..." : "Downloading...") : ready < 2 && !prepError ? `Preparing PNGs ${ready}/2` : shareCapable ? "Save both to Photos" : "Download PNGs"}
        </button>
        <button onClick={handleSave} disabled={saving} style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "inherit" }}>
          {saving ? "Saving..." : savedId ? "Save changes" : "Save to library"}
        </button>
        {savedId && (
          <button onClick={handleCopyShareLink} style={{ background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {linkCopyLabel}
          </button>
        )}
        {savedId && !saving && <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>✓ Saved</span>}
        {(error || prepError) && <div style={{ fontSize: 13, color: "var(--error)" }}>{error ?? `Could not prepare the PNGs: ${prepError}`}</div>}
      </div>
    </div>
  );
}
