"use client";
// BrandAssetsView — manage the library of product shots, logos, and reference
// images the ad builder draws from. Uploads go through /api/brand-assets and
// are stored in Vercel Blob + KV.
//
// Intentionally separate from the carousel-era `AssetsView` (which manages
// the carousel asset library).

import { useCallback, useEffect, useState } from "react";
import AssetUploader from "@/components/assets/AssetUploader";
import AssetGrid from "@/components/assets/AssetGrid";
import type { BrandAsset, BrandAssetKind } from "@/lib/types";

const TABS: { key: BrandAssetKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "product", label: "Product" },
  { key: "logo", label: "Logo" },
  { key: "reference", label: "Reference" },
];

export default function BrandAssetsView() {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [filter, setFilter] = useState<BrandAssetKind | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retagging, setRetagging] = useState(false);
  const [retagStatus, setRetagStatus] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-assets");
      const data = (await res.json()) as { assets?: BrandAsset[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to load assets");
        return;
      }
      setAssets(data.assets ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function handleRetagAll(opts: { onlyUntagged: boolean }) {
    const confirmMsg = opts.onlyUntagged
      ? "Auto-tag every asset that has zero tags? (Claude Haiku vision)"
      : "Re-tag ALL assets? This merges new tags into existing tags.";
    if (!confirm(confirmMsg)) return;

    setRetagging(true);
    setRetagStatus("Tagging library — this can take a minute…");
    setError(null);
    try {
      const qs = opts.onlyUntagged ? "?onlyUntagged=true" : "";
      const res = await fetch(`/api/brand-assets/retag-all${qs}`, { method: "POST" });
      const data = (await res.json()) as {
        total?: number;
        tagged?: number;
        failed?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Retag failed");
        setRetagStatus(null);
        return;
      }
      setRetagStatus(
        `Done — tagged ${data.tagged ?? 0} of ${data.total ?? 0}${
          data.failed ? ` (${data.failed} failed)` : ""
        }.`,
      );
      await fetchAssets();
    } catch {
      setError("Network error during retag");
      setRetagStatus(null);
    } finally {
      setRetagging(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/brand-assets/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Delete failed");
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Network error during delete");
    }
  }

  const visible = filter === "all" ? assets : assets.filter((a) => a.kind === filter);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 80px" }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Brand assets
          </h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13, lineHeight: 1.5 }}>
            Drop multiple images at once. Logos auto-background-removed (BiRefNet v2).
            All assets auto-tagged by Claude Haiku vision. Product assets become the
            reference for Seedream v4 Edit so FAL keeps the real bottle in frame.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => handleRetagAll({ onlyUntagged: true })}
            disabled={retagging || assets.length === 0}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 7,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: retagging || assets.length === 0 ? "not-allowed" : "pointer",
              opacity: retagging || assets.length === 0 ? 0.5 : 1,
            }}
            title="Tag only assets that currently have zero tags."
          >
            Tag untagged
          </button>
          <button
            onClick={() => handleRetagAll({ onlyUntagged: false })}
            disabled={retagging || assets.length === 0}
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              border: "none",
              borderRadius: 7,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: retagging || assets.length === 0 ? "not-allowed" : "pointer",
              opacity: retagging || assets.length === 0 ? 0.5 : 1,
            }}
            title="Re-tag every asset (merges with existing tags)."
          >
            {retagging ? "Tagging…" : "Re-tag all"}
          </button>
        </div>
      </div>

      {retagStatus && (
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            padding: "8px 12px",
            background: "var(--surface)",
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          {retagStatus}
        </div>
      )}

      <AssetUploader onUploaded={fetchAssets} />

      {error && (
        <div
          style={{
            background: "rgba(184,92,92,0.08)",
            border: "1px solid rgba(184,92,92,0.3)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 13,
            color: "var(--error)",
            marginTop: 20,
          }}
        >
          ⚠ {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 4,
          marginTop: 28,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {TABS.map((t) => {
          const active = filter === t.key;
          const count =
            t.key === "all" ? assets.length : assets.filter((a) => a.kind === t.key).length;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? "var(--text)" : "var(--muted)",
                background: "transparent",
                border: "none",
                borderBottom: active ? "2px solid var(--text)" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.label} <span style={{ color: "var(--subtle)" }}>({count})</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 20 }}>
        {loading && assets.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted)", padding: "40px 0" }}>
            Loading assets…
          </div>
        ) : visible.length === 0 ? (
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              padding: "40px 0",
              textAlign: "center",
            }}
          >
            {filter === "all"
              ? "No assets yet. Upload your product shot and logo above."
              : `No ${filter} assets yet.`}
          </div>
        ) : (
          <AssetGrid assets={visible} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
