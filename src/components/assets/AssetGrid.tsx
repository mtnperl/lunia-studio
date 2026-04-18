"use client";
// AssetGrid — responsive thumbnail grid of BrandAssets with delete, copy URL,
// and kind-badge chips.

import { useState } from "react";
import type { BrandAsset } from "@/lib/types";

type Props = {
  assets: BrandAsset[];
  onDelete: (id: string) => void;
};

const KIND_COLOR: Record<BrandAsset["kind"], string> = {
  product: "#6C5CE7",
  logo: "#C8A96E",
  reference: "#5F9E75",
};

export default function AssetGrid({ assets, onDelete }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 14,
      }}
    >
      {assets.map((a) => (
        <div
          key={a.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              aspectRatio: "1 / 1",
              background:
                a.kind === "logo"
                  ? "repeating-conic-gradient(var(--surface-r) 0% 25%, var(--surface) 0% 50%) 0/16px 16px"
                  : "var(--bg)",
              position: "relative",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.url}
              alt={a.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "3px 7px",
                borderRadius: 4,
                background: KIND_COLOR[a.kind],
                color: "#fff",
              }}
            >
              {a.kind}
            </span>
          </div>
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={a.name}
            >
              {a.name}
            </div>
            {a.tags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {a.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "var(--surface-r)",
                      color: "var(--muted)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button
                onClick={() => copyUrl(a.url, a.id)}
                style={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 8px",
                  background: "var(--surface-r)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copiedId === a.id ? "Copied ✓" : "Copy URL"}
              </button>
              <button
                onClick={() => onDelete(a.id)}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "5px 10px",
                  background: "transparent",
                  color: "var(--error)",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
