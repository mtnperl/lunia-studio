"use client";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import DidYouKnowSlide from "@/components/carousel/slides/DidYouKnowSlide";
import type { DidYouKnowContent } from "@/lib/types";

const PREVIEW_SCALE = 0.48;

type Props = {
  topic: string;
  variants: DidYouKnowContent[];
  selected: number;
  onSelect: (i: number) => void;
  onSaved?: (id: string) => void;
};

export default function DidYouKnowPreviewStep({ topic, variants, selected, onSelect, onSaved }: Props) {
  const exportSlide1Ref = useRef<HTMLDivElement>(null);
  const exportSlide2Ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  const variant = variants[selected];
  if (!variant) return null;

  async function downloadSlide(node: HTMLElement | null, filename: string) {
    if (!node) return;
    const dataUrl = await toPng(node, {
      width: 1080,
      height: 1350,
      pixelRatio: 1,
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      // Load fonts before snapshotting
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const safeTopic = (variant.topic || topic).replace(/[^a-z0-9]+/gi, "-").slice(0, 40).toLowerCase();
      await downloadSlide(exportSlide1Ref.current, `dyk-${safeTopic}-1.png`);
      await downloadSlide(exportSlide2Ref.current, `dyk-${safeTopic}-2.png`);
    } catch (err) {
      console.error(err);
      setError("Download failed. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/carousel/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: variant.topic || topic,
          format: "did_you_know",
          didYouKnowContent: variant,
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

      {/* Font size control */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
        padding: "10px 14px", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: 8,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
        <DidYouKnowSlide slide={variant.slide1} scale={PREVIEW_SCALE} fontScale={fontScale} />
        <DidYouKnowSlide slide={variant.slide2} scale={PREVIEW_SCALE} fontScale={fontScale} />
      </div>

      {/* Hidden full-size slides for accurate PNG export — bypasses the inner transform: scale() on the visible preview. */}
      <div style={{ position: "absolute", left: -9999, top: 0, pointerEvents: "none", opacity: 0 }}>
        <div ref={exportSlide1Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={variant.slide1} scale={1} fontScale={fontScale} />
        </div>
        <div ref={exportSlide2Ref} style={{ width: 1080, height: 1350 }}>
          <DidYouKnowSlide slide={variant.slide2} scale={1} fontScale={fontScale} />
        </div>
      </div>

      {/* Caption */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Caption</div>
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
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
            padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: downloading ? "wait" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {downloading ? "Downloading..." : "Download PNGs"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !!savedId}
          style={{
            background: savedId ? "rgba(95,158,117,0.15)" : "var(--surface)",
            color: savedId ? "var(--success)" : "var(--text)",
            border: `1.5px solid ${savedId ? "rgba(95,158,117,0.4)" : "var(--border)"}`,
            borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700,
            cursor: saving ? "wait" : savedId ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {savedId ? "✓ Saved" : saving ? "Saving..." : "Save to library"}
        </button>
        {error && <div style={{ fontSize: 13, color: "var(--error)" }}>{error}</div>}
      </div>
    </div>
  );
}
