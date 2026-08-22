"use client";
import type { AssetMetadata } from "@/lib/types";
import { useAssets } from "./useAssets";
import { Spinner } from "./Loaders";

/** Inline grid of uploaded assets. Used to pick / swap the image for an
 *  asset-sourced slot (bottle, logo, product shots). */
export default function AssetPicker({
  selectedId,
  onPick,
  onClose,
}: {
  selectedId?: string;
  onPick: (asset: AssetMetadata) => void;
  onClose: () => void;
}) {
  // Shared with block sample data, so opening the picker after a sample has
  // already loaded the library costs nothing.
  const assets = useAssets();
  const error = assets !== null && assets.length === 0 ? "No assets found" : null;

  return (
    <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Pick an image — uploaded assets + carousel-generated
        </span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 8 }}>
        {error && <div style={{ fontSize: 12, color: "var(--error)" }}>{error}</div>}
        {!assets && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 12, color: "var(--muted)" }}>
            <Spinner size={13} />
            Loading assets…
          </div>
        )}
        {assets && assets.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            No images yet. Upload bottle / logo images in the Assets manager, or save a carousel to register its generated images here automatically.
          </div>
        )}
        {assets && assets.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {assets.map((a) => {
              const active = a.id === selectedId;
              return (
                <button
                  key={a.id}
                  onClick={() => onPick(a)}
                  title={`${a.name} · ${a.assetType}`}
                  style={{
                    padding: 3, borderRadius: 6, cursor: "pointer",
                    border: `2px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    background: active ? "var(--accent-dim)" : "transparent",
                  }}
                >
                  <img src={a.url} alt={a.name}
                    style={{ display: "block", width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 4 }} />
                  <span style={{ display: "block", fontSize: 8, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.assetType}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
