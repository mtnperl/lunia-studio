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
      <div style={{ marginBottom: 24 }}>
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
          Upload the real Lunia Life product photo and logo here. When you
          build an ad, attach a product asset and FAL will keep the real
          bottle in frame (via Seedream v4 Edit) instead of hallucinating
          packaging. Logos are stamped onto the final canvas at export time.
        </p>
      </div>

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
