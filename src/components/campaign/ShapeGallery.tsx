"use client";
// Pick a layout by looking at it.
//
// Replaces three controls that all did one job: "Make it visual", "AG1 style"
// and the Templates dropdown. Every shape, including the plain model-chosen
// one, is now an entry in the same gallery.
//
// Thumbnails render each shape's OWN starter copy, not the user's. A true
// preview of the user's copy in a shape costs one model call PER shape, so a
// ten-shape gallery would fire ten calls just to browse. The user's copy is
// previewed once, after picking, through the before/after diff.
import { useMemo, useState } from "react";
import { renderCampaignEmail } from "@/lib/campaign-email-html";
import { CAMPAIGN_SHAPES, type CampaignShape } from "@/lib/campaign-shapes";
import { layoutBlockToCampaignBlock } from "@/lib/campaign-layout-prompts";
import type { CampaignContent } from "@/lib/types";
import { Spinner } from "./Loaders";

/** A fixed, logo-less stub. Constant on purpose: it is what makes the
 *  module-level cache below sound. Rendering from live campaign content would
 *  vary by subject, logo and images, and the cache would go stale. */
function thumbnailContent(shape: CampaignShape): CampaignContent {
  return {
    subjectLines: [shape.name, "", ""],
    selectedSubject: 0,
    previewText: "",
    theme: shape.theme,
    logoUrl: null,
    showLogo: false,
    topBanner: shape.topBanner,
    promoBand: shape.promoBand,
    blocks: (shape.starter ?? []).map(layoutBlockToCampaignBlock),
    cta: { label: shape.ctaLabel ?? "Shop now", url: "#", showOnHero: false },
    images: [],
  };
}

const thumbCache = new Map<string, string>();
function thumbnailHtml(shape: CampaignShape): string {
  const hit = thumbCache.get(shape.id);
  if (hit !== undefined) return hit;
  const html = renderCampaignEmail(thumbnailContent(shape));
  thumbCache.set(shape.id, html);
  return html;
}

/** Block-order wireframe, for shapes with no starter copy: the model-chosen
 *  entry, and every saved shape (which captures structure, never copy). */
function Schematic({ shape }: { shape: CampaignShape }) {
  const rows = shape.starter?.map((b) => b.kind) ?? [];
  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 4, height: "100%", justifyContent: "center" }}>
      {rows.length === 0 ? (
        <span style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
          Reads your copy
          <br />
          and picks a layout
        </span>
      ) : (
        rows.slice(0, 6).map((kind, i) => (
          <div key={i} style={{
            height: kind === "headerimage" ? 14 : 7, borderRadius: 2,
            background: kind.startsWith("image") || kind === "grid" ? "var(--muted)" : "var(--border)",
            opacity: 0.7,
          }} />
        ))
      )}
    </div>
  );
}

export default function ShapeGallery({
  shapes = CAMPAIGN_SHAPES,
  busyShapeId,
  onPick,
  onClose,
  onDelete,
  onSaveCurrent,
  savingCurrent,
}: {
  shapes?: CampaignShape[];
  busyShapeId: string | null;
  onPick: (shape: CampaignShape) => void;
  onClose: () => void;
  /** Called for saved shapes only; built-ins have no Remove control. */
  onDelete?: (shape: CampaignShape) => void;
  onSaveCurrent?: () => void;
  savingCurrent?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  // Cached across renders AND across mounts, since the stub is constant.
  const rendered = useMemo(
    () => new Map(shapes.filter((s) => s.starter?.length).map((s) => [s.id, thumbnailHtml(s)])),
    [shapes],
  );

  return (
    <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Shapes — your copy, laid out
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSaveCurrent && (
            <button
              type="button"
              onClick={onSaveCurrent}
              disabled={savingCurrent}
              title="Bank this email's layout so you can lay other emails out the same way. Captures the structure, never the copy."
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 5,
                fontSize: 11, fontFamily: "inherit", cursor: savingCurrent ? "wait" : "pointer",
                border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
              }}
            >
              {savingCurrent && <Spinner size={9} color="var(--text)" />}
              {savingCurrent ? "Saving…" : "Save this layout"}
            </button>
          )}
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </span>
      </div>
      <div style={{ padding: 8, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))", gap: 8 }}>
        {shapes.map((shape) => {
          const html = rendered.get(shape.id);
          const busy = busyShapeId === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              onClick={() => onPick(shape)}
              disabled={!!busyShapeId}
              onMouseEnter={() => setHovered(shape.id)}
              onMouseLeave={() => setHovered(null)}
              title={shape.description}
              style={{
                display: "flex", flexDirection: "column", gap: 5, padding: 6, textAlign: "left",
                borderRadius: 7, cursor: busyShapeId ? "wait" : "pointer", fontFamily: "inherit",
                border: `1px solid ${hovered === shape.id ? "var(--accent)" : "var(--border)"}`,
                background: hovered === shape.id ? "var(--accent-dim)" : "var(--surface)",
                opacity: busyShapeId && !busy ? 0.5 : 1,
              }}
            >
              <div style={{ position: "relative", height: 96, borderRadius: 5, overflow: "hidden", border: "1px solid var(--border)", background: "#ffffff" }}>
                {html ? (
                  <iframe
                    srcDoc={html}
                    title={shape.name}
                    sandbox=""
                    scrolling="no"
                    tabIndex={-1}
                    style={{ width: 600, height: 640, border: 0, display: "block", transform: "scale(0.155)", transformOrigin: "top left", pointerEvents: "none" }}
                  />
                ) : (
                  <Schematic shape={shape} />
                )}
                {busy && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
                    <Spinner size={14} color="#ffffff" />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{shape.name}</span>
              {onDelete && shape.id.startsWith("saved:") && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onDelete(shape); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(shape); } }}
                  style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}
                >Remove</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
