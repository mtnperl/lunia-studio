"use client";
import { useMemo, useRef, useState } from "react";
import type { CampaignContent, CampaignBlock, CampaignImageSlot } from "@/lib/types";
import { renderCampaignEmail } from "@/lib/campaign-email-html";
import ImageSlotControl from "./ImageSlotControl";
import { Spinner } from "./Loaders";

const newId = () => crypto.randomUUID();

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "var(--subtle)",
  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
};
const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--muted)",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 4,
};
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", fontSize: 13,
  fontFamily: "inherit", color: "var(--text)", padding: "7px 10px",
  borderRadius: 5, border: "1px solid var(--border)", background: "var(--bg)",
};
const miniBtn = (active = false): React.CSSProperties => ({
  padding: "3px 9px", fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.04em",
  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
  background: active ? "var(--accent-dim)" : "transparent",
  color: active ? "var(--accent)" : "var(--muted)",
  borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
});

export default function CampaignEditor({
  topic,
  content,
  savedId,
  onChange,
  onSaved,
}: {
  topic: string;
  content: CampaignContent;
  savedId: string | null;
  onChange: (next: CampaignContent) => void;
  onSaved: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy HTML");
  const [klaviyoBusy, setKlaviyoBusy] = useState(false);
  const [klaviyoResult, setKlaviyoResult] = useState<{ editorUrl: string } | null>(null);
  const [klaviyoError, setKlaviyoError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Per-slot lock on the most recently generated URL. When ImageSlotControl
  // finishes a generation it registers the new URL here via markGenerated().
  // updateImage() below uses the map to detect + reject any subsequent state
  // mutation that tries to silently change a generated slot's URL to a
  // different value while the slot is still in "generated" mode.
  //
  // This is the firewall against the "hero image reverts to default" bug:
  // even if some race or stale render emits an onChange with the previous
  // asset URL, the guard preserves the freshly generated URL.
  const generatedUrlLock = useRef<Map<string, string>>(new Map());
  function markGenerated(slotId: string, url: string) {
    generatedUrlLock.current.set(slotId, url);
  }

  const html = useMemo(() => renderCampaignEmail(content), [content]);

  // Lightweight hash of the HTML body so the iframe gets a fresh `key` on
  // every content change. Without this, some browsers don't re-fetch images
  // inside a srcDoc when the URL changes — the iframe element is preserved,
  // not remounted. Keying on a content-derived string forces React to unmount
  // and re-mount the iframe, which guarantees fresh image loads.
  const htmlKey = useMemo(() => {
    let h = 0;
    for (let i = 0; i < html.length; i++) {
      h = ((h << 5) - h + html.charCodeAt(i)) | 0;
    }
    return String(h);
  }, [html]);

  function fitIframe() {
    const f = iframeRef.current;
    if (!f?.contentDocument?.body) return;
    f.style.height = `${f.contentDocument.body.scrollHeight}px`;
  }

  // ── field updates ──────────────────────────────────────────────────────────
  function updateBlock(id: string, patch: Partial<CampaignBlock>) {
    onChange({ ...content, blocks: content.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  }
  function removeBlock(id: string) {
    onChange({ ...content, blocks: content.blocks.filter((b) => b.id !== id) });
  }
  function addBlock() {
    onChange({ ...content, blocks: [...content.blocks, { id: newId(), body: "", align: "left" }] });
  }
  function updateImage(next: CampaignImageSlot) {
    const prev = content.images.find((i) => i.id === next.id);
    let final = next;

    // If the user explicitly switched the source from generated → asset,
    // they're abandoning the generated image — clear the lock.
    if (prev?.source === "generated" && next.source === "asset") {
      generatedUrlLock.current.delete(next.id);
    }

    // While the slot is in "generated" mode, the URL can ONLY change in two
    // legitimate ways:
    //   (a) Generate produced a brand new URL → ImageSlotControl calls
    //       markGenerated() BEFORE its onChange. The lock has the new URL
    //       and matches next.url. No-op.
    //   (b) User cleared the URL by switching to Generated mode (url=null).
    //       That's an explicit reset.
    // Anything else — different URL, no markGenerated, source still
    // "generated" — is the revert bug. Preserve the locked URL.
    if (next.source === "generated") {
      const locked = generatedUrlLock.current.get(next.id);
      if (locked && next.url !== null && next.url !== locked) {
        // eslint-disable-next-line no-console
        console.warn("[CampaignEditor] suspicious URL change on generated slot — preserving locked URL", {
          slotId: next.id,
          attemptedUrl: next.url,
          preservedUrl: locked,
        });
        final = { ...next, url: locked, assetId: undefined };
      }
    }

    onChange({ ...content, images: content.images.map((i) => (i.id === next.id ? final : i)) });
  }
  function removeImage(id: string) {
    onChange({ ...content, images: content.images.filter((i) => i.id !== id) });
  }
  function addImage() {
    if (content.images.length >= 5) return;
    onChange({
      ...content,
      images: [...content.images, { id: newId(), role: "secondary", source: "generated", aspect: "1:1", prompt: "", url: null }],
    });
  }

  function exportHtml() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "email"}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copyHtml() {
    try {
      await navigator.clipboard.writeText(html);
      setCopyLabel("Copied ✓");
      setTimeout(() => setCopyLabel("Copy HTML"), 2000);
    } catch {
      setCopyLabel("Copy failed");
      setTimeout(() => setCopyLabel("Copy HTML"), 2000);
    }
  }

  async function pushToKlaviyo() {
    if (klaviyoBusy) return;
    setKlaviyoBusy(true);
    setKlaviyoError(null);
    setKlaviyoResult(null);
    try {
      const subject = content.subjectLines[content.selectedSubject] ?? content.subjectLines[0] ?? topic;
      const res = await fetch("/api/campaign/klaviyo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, topic, subject }),
      });
      const data = await res.json();
      if (!res.ok || !data.editorUrl) {
        setKlaviyoError(data.error ?? "Push failed");
        return;
      }
      setKlaviyoResult({ editorUrl: data.editorUrl });
    } catch (err) {
      setKlaviyoError(err instanceof Error ? err.message : "Network error");
    } finally {
      setKlaviyoBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/campaign/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: savedId ?? undefined, topic, content }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setSaveError(data.error ?? "Save failed");
        return;
      }
      onSaved(data.id);
    } catch {
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  const secondaryImages = content.images.filter((i) => i.role === "secondary");

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* ── Live preview ───────────────────────────────────────────────────── */}
      <div style={{ flex: "1 1 520px", minWidth: 320 }}>
        <div style={sectionLabel}>Live preview</div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", background: "#f0f1f5" }}>
          <iframe
            key={htmlKey}
            ref={iframeRef}
            srcDoc={html}
            onLoad={fitIframe}
            title="Campaign preview"
            style={{ width: "100%", border: "none", display: "block", minHeight: 600 }}
          />
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={{ flex: "1 1 340px", minWidth: 300, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Subject */}
        <div>
          <div style={sectionLabel}>Subject line</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {content.subjectLines.map((s, i) => {
              const active = content.selectedSubject === i;
              return (
                <button key={i} onClick={() => onChange({ ...content, selectedSubject: i })} style={{
                  textAlign: "left", padding: "8px 10px", borderRadius: 6,
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  background: active ? "var(--accent-dim)" : "var(--bg)",
                  color: "var(--text)", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                }}>{s}</button>
              );
            })}
          </div>
        </div>

        {/* Preview text */}
        <div>
          <label style={fieldLabel}>Preview text</label>
          <input type="text" value={content.previewText}
            onChange={(e) => onChange({ ...content, previewText: e.target.value })} style={input} />
        </div>

        {/* Promo band */}
        <div>
          <label style={fieldLabel}>Promo band (optional)</label>
          <input type="text" value={content.promoBand ?? ""}
            placeholder="e.g. MEMORIAL DAY WEEKEND SALE"
            onChange={(e) => onChange({ ...content, promoBand: e.target.value || undefined })} style={input} />
        </div>

        {/* Blocks */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={sectionLabel}>Text blocks</span>
            <button style={miniBtn(false)} onClick={addBlock}>+ Block</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.blocks.map((b, i) => (
              <div key={b.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--surface)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Block {i + 1}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={miniBtn(b.align === "left")} onClick={() => updateBlock(b.id, { align: "left" })}>Left</button>
                    <button style={miniBtn(b.align === "center")} onClick={() => updateBlock(b.id, { align: "center" })}>Center</button>
                    <button style={miniBtn(!!b.italic)} onClick={() => updateBlock(b.id, { italic: !b.italic })}>Italic</button>
                    <button style={miniBtn(false)} onClick={() => removeBlock(b.id)}>✕</button>
                  </div>
                </div>
                <textarea
                  value={b.body}
                  onChange={(e) => updateBlock(b.id, { body: e.target.value })}
                  rows={4}
                  style={{ ...input, resize: "vertical", lineHeight: 1.5, fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Images */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={sectionLabel}>Images</span>
            {content.images.length < 5 && <button style={miniBtn(false)} onClick={addImage}>+ Image</button>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.images.map((img) => {
              const label = img.role === "hero"
                ? "Hero image"
                : `Image ${secondaryImages.indexOf(img) + 2}`;
              return (
                <div key={img.id} style={{ position: "relative" }}>
                  <ImageSlotControl slot={img} label={label} topic={topic} onChange={updateImage} onGenerated={(url) => markGenerated(img.id, url)} />
                  {img.role === "secondary" && secondaryImages.length > 2 && (
                    <button
                      onClick={() => removeImage(img.id)}
                      title="Remove image"
                      style={{
                        position: "absolute", top: 8, right: 8, width: 20, height: 20,
                        border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)",
                        color: "var(--muted)", cursor: "pointer", fontSize: 11, lineHeight: 1,
                      }}
                    >✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div>
          <div style={sectionLabel}>Call to action</div>
          <label style={fieldLabel}>Button label</label>
          <input type="text" value={content.cta.label}
            onChange={(e) => onChange({ ...content, cta: { ...content.cta, label: e.target.value } })}
            style={{ ...input, marginBottom: 8 }} />
          <label style={fieldLabel}>Button link</label>
          <input type="text" value={content.cta.url}
            onChange={(e) => onChange({ ...content, cta: { ...content.cta, url: e.target.value } })}
            style={input} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--border)", marginTop: 2 }}>
          <button
            className="btn"
            onClick={save}
            disabled={saving}
            style={{ minWidth: 120, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {saving && <Spinner size={13} color="var(--bg)" />}
            {saving ? "Saving…" : savedId ? "Saved ✓ Update" : "Save campaign"}
          </button>
          <button className="btn-ghost" onClick={exportHtml}>↓ Export HTML</button>
          <button className="btn-ghost" onClick={copyHtml}>📋 {copyLabel}</button>
          <button
            className="btn-ghost"
            onClick={pushToKlaviyo}
            disabled={klaviyoBusy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {klaviyoBusy && <Spinner size={13} />}
            {klaviyoBusy ? "Pushing…" : "🚀 Push to Klaviyo"}
          </button>
          {klaviyoResult && (
            <a
              href={klaviyoResult.editorUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Opens this template directly in the Klaviyo editor."
              style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textDecoration: "underline" }}
            >
              Open in Klaviyo →
            </a>
          )}
          {klaviyoError && <span style={{ fontSize: 12, color: "var(--error)" }}>{klaviyoError}</span>}
          {saveError && <span style={{ fontSize: 12, color: "var(--error)" }}>{saveError}</span>}
        </div>
      </div>
    </div>
  );
}
