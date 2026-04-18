"use client";
// Compact picker for selecting a product / logo BrandAsset from the library.
// Loads assets lazily when the user opens the popover. If no assets exist of
// the requested kind, shows a "go to Brand assets →" CTA.

import { useCallback, useEffect, useState } from "react";
import type { BrandAsset, BrandAssetKind } from "@/lib/types";

type Props = {
  kind: BrandAssetKind;          // "product" | "logo"
  selectedId: string | undefined;
  onSelect: (asset: BrandAsset | null) => void;
  label: string;                  // "Product" | "Logo"
};

export default function AdAssetPicker({ kind, selectedId, onSelect, label }: Props) {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand-assets?kind=${kind}`);
      const data = (await res.json()) as { assets?: BrandAsset[] };
      setAssets(data.assets ?? []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  // Load once on mount so the selected-asset thumbnail resolves.
  useEffect(() => {
    load();
  }, [load]);

  const selected = assets.find((a) => a.id === selectedId) ?? null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 7,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text)",
          cursor: "pointer",
          fontFamily: "inherit",
          minWidth: 180,
        }}
      >
        {selected ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt=""
              style={{
                width: 24,
                height: 24,
                objectFit: "contain",
                background: "var(--bg)",
                borderRadius: 3,
                border: "1px solid var(--border)",
              }}
            />
            <span
              style={{
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "left",
              }}
            >
              {selected.name}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, color: "var(--muted)", textAlign: "left" }}>
            {label}: none
          </span>
        )}
        <span style={{ color: "var(--muted)", fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              width: 280,
              maxHeight: 320,
              overflowY: "auto",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              zIndex: 50,
              padding: 6,
            }}
          >
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "6px 10px",
                fontSize: 12,
                color: "var(--muted)",
                background: !selectedId ? "var(--surface)" : "transparent",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              (none)
            </button>
            {loading && (
              <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>
                Loading…
              </div>
            )}
            {!loading && assets.length === 0 && (
              <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--muted)" }}>
                No {kind} assets yet. Upload one in <strong>Brand assets</strong>.
              </div>
            )}
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  background: selectedId === a.id ? "var(--surface)" : "transparent",
                  border: "none",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.url}
                  alt=""
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: "contain",
                    background: "var(--bg)",
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {a.name}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
