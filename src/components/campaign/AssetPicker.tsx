"use client";
import { useEffect, useState } from "react";
import type { AssetMetadata } from "@/lib/types";

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
  const [assets, setAssets] = useState<AssetMetadata[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAssets(data);
        else setError("Could not load assets");
      })
      .catch(() => setError("Could not load assets"));
  }, []);

  return (
    <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Pick an uploaded asset
        </span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>
      <div style={{ padding: 8 }}>
        {error && <div style={{ fontSize: 12, color: "var(--error)" }}>{error}</div>}
        {!assets && !error && <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</div>}
        {assets && assets.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            No uploaded assets yet. Add bottle / logo images in the Assets manager first.
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
