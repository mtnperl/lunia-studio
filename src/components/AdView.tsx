"use client";
/**
 * AdView — Framework #4 single-screen Meta ad builder.
 *
 * Replaces the 4-step flow with a live compositor layout:
 *   Left  panel (280px) — inputs: angle + pickers + hook + aspect
 *   Center             — AdCompositor (live preview, scales to fill)
 *   Right panel (360px) — copy editor + background regen + save/export
 *
 * Flow:
 *   1. User picks angle, attaches product/logo assets, optionally adds context
 *   2. "Generate brief" → POST /api/ad/brief → AdBrief (copy + composition + bgPrompt)
 *   3. Simultaneously POST /api/ad/background → backgroundImageUrl
 *   4. Compositor renders: background + product (if attached) + logo + typography
 *   5. User edits copy inline, regenerates background, exports PNG
 *   6. Save → POST /api/ad/save
 */

import { useCallback, useEffect, useRef, useState } from "react";
import AdCompositor from "@/components/ad/AdCompositor";
import AdAssetPicker from "@/components/ad/AdAssetPicker";
import AdRetroLoader from "@/components/ad/AdRetroLoader";
import { toPng } from "html-to-image";
import type { AdBrief } from "@/lib/ad-brief";
import { AD_ANGLE_LABELS } from "@/lib/types";
import type { AdAngle, VisualFormat, SavedAd } from "@/lib/types";
import type { BrandAsset } from "@/lib/types";

type Aspect = "1:1" | "4:5";

// ─── Constants ────────────────────────────────────────────────────────────────

const ANGLES: { key: AdAngle; label: string; hint: string }[] = [
  { key: "credibility",     label: "Credibility",    hint: "700 studies, science-backed" },
  { key: "price-anchor",    label: "Price anchor",   hint: "Under $1 a night" },
  { key: "skeptic-convert", label: "Skeptic",        hint: "I didn't think it'd work" },
  { key: "outcome-first",   label: "Outcome",        hint: "Clear mornings, better sleep" },
  { key: "formula",         label: "Formula",        hint: "3 ingredients, full doses" },
  { key: "comparison",      label: "Comparison",     hint: "Melatonin vs. natural pathways" },
  { key: "social-proof",    label: "Social proof",   hint: "78,000+ customers" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BuildState = "idle" | "brief" | "image" | "done" | "error";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  initialAd?: SavedAd | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdView({ initialAd }: Props) {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  const [angle, setAngle] = useState<AdAngle>("credibility");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [customHook, setCustomHook] = useState("");
  const [productAsset, setProductAsset] = useState<BrandAsset | null>(null);
  const [logoAsset, setLogoAsset] = useState<BrandAsset | null>(null);

  // ── Brief & image state ────────────────────────────────────────────────────
  const [buildState, setBuildState] = useState<BuildState>("idle");
  const [brief, setBrief] = useState<AdBrief | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [complianceWarnings, setComplianceWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ── Editable copy (detached from brief so user can tweak without regenerating) ──
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [overlayText, setOverlayText] = useState("");

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Export ─────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const compositorRef = useRef<HTMLDivElement>(null);

  // ── Compositor display size ────────────────────────────────────────────────
  const centerRef = useRef<HTMLDivElement>(null);
  const [displayWidth, setDisplayWidth] = useState(540);

  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setDisplayWidth(Math.min(Math.floor(w) - 48, 700));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Sync editable copy when brief changes ─────────────────────────────────
  useEffect(() => {
    if (brief) {
      setHeadline(brief.copy.headline);
      setPrimaryText(brief.copy.primaryText);
      setOverlayText(brief.copy.overlayText);
    }
  }, [brief]);

  // ── Load initialAd ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialAd) return;
    // TODO: support loading V2 saved ads (brief-based) when the save format is updated
  }, [initialAd]);

  // ─── Generate brief + background ──────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setBuildState("brief");
    setError(null);
    setSavedId(null);
    setBackgroundUrl(null);
    setComplianceWarnings([]);

    // Step 1: Generate the brief
    let newBrief: AdBrief;
    try {
      const res = await fetch("/api/ad/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle,
          customHook: customHook.trim() || undefined,
          productAssetId: productAsset?.id,
        }),
      });
      const data = (await res.json()) as {
        brief?: AdBrief;
        complianceViolations?: string[];
        error?: string;
      };
      if (!res.ok || !data.brief) {
        throw new Error(data.error ?? "Brief generation failed");
      }
      newBrief = data.brief;
      setBrief(newBrief);
      if (data.complianceViolations?.length) {
        setComplianceWarnings(data.complianceViolations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Brief generation failed");
      setBuildState("error");
      return;
    }

    // Step 2: Generate the background image using the brief's backgroundPrompt
    setBuildState("image");
    try {
      const res = await fetch("/api/ad/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundPrompt: newBrief.backgroundPrompt,
          aspect,
        }),
      });
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error ?? "Background generation failed");
      }
      setBackgroundUrl(data.imageUrl);
      setBuildState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background generation failed");
      setBuildState("error");
    }
  }, [angle, aspect, customHook, productAsset]);

  // ─── Regenerate background only ───────────────────────────────────────────

  const handleRegenBackground = useCallback(async () => {
    if (!brief) return;
    setBuildState("image");
    setError(null);
    try {
      const res = await fetch("/api/ad/background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backgroundPrompt: brief.backgroundPrompt, aspect }),
      });
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || !data.imageUrl) throw new Error(data.error ?? "Regen failed");
      setBackgroundUrl(data.imageUrl);
      setBuildState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regen failed");
      setBuildState("error");
    }
  }, [brief, aspect]);

  // ─── Export PNG ───────────────────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!compositorRef.current || !brief) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const png = await toPng(compositorRef.current, {
        width: aspect === "1:1" ? 1080 : 1080,
        height: aspect === "1:1" ? 1080 : 1350,
        pixelRatio: 1,
      });
      const a = document.createElement("a");
      a.href = png;
      a.download = `lunia-ad-${angle}-${Date.now()}.png`;
      a.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [brief, aspect, angle]);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!brief || !backgroundUrl) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ad/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          angle: brief.angle,
          visualFormat: brief.visualFormat,
          concept: {
            angle: brief.angle,
            label: brief.label,
            headline,
            primaryText,
            overlayText,
            visualDirection: brief.backgroundPrompt,
            whyItWorks: brief.copy.whyItWorks,
          },
          imagePrompt: brief.backgroundPrompt,
          imageUrl: backgroundUrl,
          imageHistory: [{ url: backgroundUrl, prompt: brief.backgroundPrompt, createdAt: new Date().toISOString() }],
          aspectRatio: aspect,
          productAssetId: productAsset?.id,
          logoAssetId: logoAsset?.id,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(data.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [brief, backgroundUrl, headline, primaryText, overlayText, aspect, productAsset, logoAsset, angle]);

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isGenerating = buildState === "brief" || buildState === "image";
  const hasBrief = brief !== null && buildState === "done";
  const briefWithEdits: AdBrief | null = brief
    ? { ...brief, copy: { ...brief.copy, headline, primaryText, overlayText } }
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        gap: 0,
      }}
    >
      {/* ── Left panel: inputs ─────────────────────────────────────────────── */}
      <div
        style={{
          width: 272,
          flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--subtle)",
              margin: "0 0 16px",
            }}
          >
            Ad setup
          </h2>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Angle selector */}
          <div>
            <label style={labelStyle}>Angle</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {ANGLES.map((a) => (
                <button
                  key={a.key}
                  onClick={() => setAngle(a.key)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    flexDirection: "column",
                    gap: 2,
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: angle === a.key ? "1px solid var(--text)" : "1px solid var(--border)",
                    background: angle === a.key ? "var(--accent-dim)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "all 120ms",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: angle === a.key ? 700 : 500,
                      color: angle === a.key ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    {a.label}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--subtle)", lineHeight: 1.4 }}>
                    {a.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect ratio */}
          <div>
            <label style={labelStyle}>Aspect ratio</label>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {(["1:1", "4:5"] as Aspect[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    fontSize: 12,
                    fontWeight: aspect === a ? 700 : 500,
                    color: aspect === a ? "var(--text)" : "var(--muted)",
                    border: aspect === a ? "1px solid var(--text)" : "1px solid var(--border)",
                    borderRadius: 6,
                    background: aspect === a ? "var(--accent-dim)" : "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Product asset picker */}
          <div>
            <label style={labelStyle}>Product asset</label>
            <div style={{ marginTop: 8 }}>
              <AdAssetPicker
                kind="product"
                value={productAsset?.id ?? null}
                onChange={(id, asset) => setProductAsset(asset)}
                placeholder="Select product"
              />
            </div>
            <p style={{ fontSize: 10, color: "var(--subtle)", marginTop: 5, lineHeight: 1.5 }}>
              Composited over background by the canvas engine.
            </p>
          </div>

          {/* Logo asset picker */}
          <div>
            <label style={labelStyle}>Logo</label>
            <div style={{ marginTop: 8 }}>
              <AdAssetPicker
                kind="logo"
                value={logoAsset?.id ?? null}
                onChange={(id, asset) => setLogoAsset(asset)}
                placeholder="Select logo"
              />
            </div>
            <p style={{ fontSize: 10, color: "var(--subtle)", marginTop: 5, lineHeight: 1.5 }}>
              Watermarked bottom-right at export.
            </p>
          </div>

          {/* Custom hook / context */}
          <div>
            <label style={labelStyle}>Brand team context</label>
            <textarea
              value={customHook}
              onChange={(e) => setCustomHook(e.target.value)}
              placeholder="Optional — e.g. 'emphasise the $0.87 per night price point' or 'we're targeting sleep-anxious 35-50F'"
              maxLength={500}
              rows={3}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "8px 10px",
                fontSize: 12,
                lineHeight: 1.5,
                fontFamily: "inherit",
                color: "var(--text)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              padding: "11px 16px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              background: isGenerating ? "var(--surface)" : "var(--text)",
              color: isGenerating ? "var(--muted)" : "var(--bg)",
              border: "none",
              borderRadius: 8,
              cursor: isGenerating ? "not-allowed" : "pointer",
              transition: "all 150ms",
            }}
          >
            {isGenerating
              ? buildState === "brief"
                ? "Writing brief..."
                : "Painting background..."
              : brief
                ? "Regenerate"
                : "Generate ad"}
          </button>
        </div>
      </div>

      {/* ── Center: compositor ─────────────────────────────────────────────── */}
      <div
        ref={centerRef}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface)",
          padding: 24,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {isGenerating && (
          <AdRetroLoader
            mode={buildState === "brief" ? "concepts" : "image"}
            detail={
              buildState === "brief"
                ? `${AD_ANGLE_LABELS[angle]} angle · ${aspect}`
                : "Recraft V4 · negative-space background"
            }
          />
        )}

        {!isGenerating && !brief && (
          <div
            style={{
              textAlign: "center",
              color: "var(--subtle)",
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.35 }}>◻</div>
            Pick an angle and generate your ad.
            <br />
            The compositor will live-render here.
          </div>
        )}

        {!isGenerating && briefWithEdits && (
          <AdCompositor
            ref={compositorRef}
            brief={briefWithEdits}
            backgroundImageUrl={backgroundUrl}
            productAssetUrl={productAsset?.url ?? null}
            logoAssetUrl={logoAsset?.url ?? null}
            aspect={aspect}
            displayWidth={displayWidth}
          />
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              right: 24,
              background: "rgba(196,0,0,0.08)",
              border: "1px solid rgba(196,0,0,0.25)",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 12,
              color: "var(--error)",
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: 12,
                background: "none",
                border: "none",
                color: "var(--error)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "inherit",
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ── Right panel: copy + actions ───────────────────────────────────── */}
      <div
        style={{
          width: 360,
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ ...labelStyle, margin: 0 }}>Copy & actions</h2>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Compliance warnings */}
          {complianceWarnings.length > 0 && (
            <div
              style={{
                background: "rgba(184,96,64,0.08)",
                border: "1px solid rgba(184,96,64,0.3)",
                borderRadius: 6,
                padding: "10px 12px",
                fontSize: 11,
                color: "var(--warning)",
              }}
            >
              <strong>Compliance flags:</strong>{" "}
              {complianceWarnings.join(", ")}
            </div>
          )}

          {/* Brief metadata */}
          {brief && (
            <div
              style={{
                fontSize: 11,
                color: "var(--subtle)",
                lineHeight: 1.6,
                padding: "10px 12px",
                background: "var(--surface)",
                borderRadius: 6,
                border: "1px solid var(--border)",
              }}
            >
              <strong style={{ color: "var(--muted)" }}>{brief.label}</strong>
              <br />
              Composition: {brief.composition.productAnchor} product · {brief.composition.textAnchor} text
              <br />
              Background: {brief.composition.backgroundTone}
            </div>
          )}

          {/* Overlay text */}
          <div>
            <label style={labelStyle}>
              Overlay text
              <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--subtle)" }}>
                → burned into image
              </span>
            </label>
            <input
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              placeholder="3–7 words"
              maxLength={80}
              style={inputStyle}
            />
          </div>

          {/* Headline */}
          <div>
            <label style={labelStyle}>
              Headline
              <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--subtle)" }}>
                → Meta ad headline field
              </span>
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="≤ 5 words"
              maxLength={60}
              style={inputStyle}
            />
          </div>

          {/* Primary text */}
          <div>
            <label style={labelStyle}>
              Primary text
              <span style={{ fontWeight: 400, marginLeft: 6, color: "var(--subtle)" }}>
                → Meta feed caption
              </span>
            </label>
            <textarea
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              placeholder="2–4 sentences. Opens with hook, closes with soft CTA."
              maxLength={600}
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Why it works */}
          {brief && brief.copy.whyItWorks.length > 0 && (
            <div>
              <label style={labelStyle}>Why it works</label>
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "var(--muted)",
                }}
              >
                {brief.copy.whyItWorks.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Background prompt (read-only, foldable) */}
          {brief && (
            <div>
              <label style={labelStyle}>Background prompt</label>
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "var(--muted)",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono)",
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {brief.backgroundPrompt}
              </div>
            </div>
          )}

          {/* Copy to clipboard */}
          {brief && (
            <button
              onClick={() => {
                const text = `HEADLINE: ${headline}\n\nPRIMARY TEXT:\n${primaryText}\n\nOVERLAY: ${overlayText}`;
                navigator.clipboard.writeText(text);
              }}
              style={secondaryButtonStyle}
            >
              Copy all copy to clipboard
            </button>
          )}
        </div>

        {/* Action bar — sticks to bottom */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Regenerate background */}
          {brief !== null && (
            <button
              onClick={handleRegenBackground}
              disabled={isGenerating}
              style={{
                ...secondaryButtonStyle,
                opacity: isGenerating ? 0.4 : 1,
                cursor: isGenerating ? "not-allowed" : "pointer",
              }}
            >
              {isGenerating ? "Generating..." : "New background"}
            </button>
          )}

          {/* Export PNG */}
          {brief !== null && (
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                ...secondaryButtonStyle,
                opacity: exporting ? 0.4 : 1,
              }}
            >
              {exporting ? "Exporting..." : `Export PNG (${aspect})`}
            </button>
          )}

          {/* Save */}
          {brief !== null && backgroundUrl !== null && (
            <button
              onClick={handleSave}
              disabled={saving || !!savedId}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
                background: savedId ? "var(--surface)" : "var(--text)",
                color: savedId ? "var(--success)" : "var(--bg)",
                border: savedId ? "1px solid var(--success)" : "none",
                borderRadius: 8,
                cursor: saving || savedId ? "not-allowed" : "pointer",
                opacity: saving ? 0.5 : 1,
              }}
            >
              {savedId ? "Saved" : saving ? "Saving..." : "Save to library"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared micro-styles ──────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--subtle)",
  fontFamily: "var(--font-ui)",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "8px 10px",
  fontSize: 13,
  lineHeight: 1.5,
  fontFamily: "inherit",
  color: "var(--text)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  boxSizing: "border-box",
  outline: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 16px",
  fontSize: 12,
  fontWeight: 600,
  fontFamily: "inherit",
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  cursor: "pointer",
  textAlign: "center" as const,
};
