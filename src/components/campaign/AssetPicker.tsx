"use client";
// Pick an image from the library, by shelf.
//
// This used to render one flat grid of everything. On a 700-image library that
// means scrolling past 335 bottle shots to reach a lifestyle photograph, and
// the thing you want is never the thing on screen. It now opens on the shelves
// — the same ones the Assets manager uses, from the same table — and you step
// into one.
import { useMemo, useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import { ASSET_SECTIONS, shelfFor } from "@/lib/asset-shelves";
import { useAssets } from "./useAssets";
import { Spinner } from "./Loaders";

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
  const [shelfKey, setShelfKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  /** Assets per shelf, computed once. Empty shelves are not offered: a folder
   *  you can open to find nothing is worse than one that is not there. */
  const shelves = useMemo(() => {
    if (!assets) return [];
    const counts = new Map<string, AssetMetadata[]>();
    for (const a of assets) {
      const key = shelfFor(a.assetType).key;
      const list = counts.get(key);
      if (list) list.push(a); else counts.set(key, [a]);
    }
    return ASSET_SECTIONS
      .map((s) => ({ ...s, items: counts.get(s.key) ?? [] }))
      .filter((s) => s.items.length > 0);
  }, [assets]);

  const openShelf = shelfKey ? shelves.find((s) => s.key === shelfKey) : null;

  /** Search runs over the WHOLE library when no shelf is open, and within the
   *  shelf when one is — so it is a way past the folders, not a thing that
   *  fights them. Matches the description too, which is what the model reads
   *  when it picks for you. */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = openShelf ? openShelf.items : (assets ?? []);
    if (!q) return pool;
    return pool.filter((a) =>
      `${a.name} ${a.assetType} ${a.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, openShelf, assets]);

  const showGrid = !!openShelf || query.trim().length > 0;

  const header: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "7px 10px", background: "var(--surface)", borderBottom: "1px solid var(--border)", gap: 8,
  };
  const label: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--muted)",
    textTransform: "uppercase", letterSpacing: "0.06em",
  };

  return (
    <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg)", overflow: "hidden" }}>
      <div style={header}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {openShelf && (
            <button
              onClick={() => { setShelfKey(null); setQuery(""); }}
              title="Back to all folders"
              style={{
                background: "transparent", border: "none", cursor: "pointer", padding: 0,
                fontSize: 11, fontWeight: 700, color: "var(--accent)", fontFamily: "inherit",
              }}
            >‹ Folders</button>
          )}
          <span style={{ ...label, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {openShelf ? `${openShelf.label} · ${openShelf.items.length}` : "Pick an image — choose a folder"}
          </span>
        </span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ padding: 8 }}>
        {!assets && (
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
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={openShelf ? `Search ${openShelf.label.toLowerCase()}…` : "Search the whole library…"}
              style={{
                width: "100%", padding: "6px 8px", borderRadius: 5, fontSize: 12, marginBottom: 8,
                border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
            />

            {/* The folders. Each carries its count, so you know what you are
                stepping into before you step into it. */}
            {!showGrid && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {shelves.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setShelfKey(s.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, width: "100%",
                      padding: "7px 8px", borderRadius: 6, cursor: "pointer", textAlign: "left",
                      border: "1px solid var(--border)", background: "var(--surface)", fontFamily: "inherit",
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{s.label}</span>
                    {/* A thumbnail strip, so a folder is recognisable before
                        it is opened. */}
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {s.items.slice(0, 3).map((a) => (
                        <img key={a.id} src={a.url} alt=""
                          style={{ width: 20, height: 20, objectFit: "cover", borderRadius: 3, border: "1px solid var(--border)" }} />
                      ))}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums", minWidth: 30, textAlign: "right" }}>
                      {s.items.length}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showGrid && results.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                Nothing matches “{query.trim()}”{openShelf ? ` in ${openShelf.label}` : ""}.
              </div>
            )}

            {showGrid && results.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, maxHeight: 320, overflowY: "auto" }}>
                {results.map((a) => {
                  const active = a.id === selectedId;
                  return (
                    <button
                      key={a.id}
                      onClick={() => onPick(a)}
                      // The description is what the model reads when it picks
                      // for you; showing it here means the two of you are
                      // choosing from the same information.
                      title={[`${a.name} · ${a.assetType}`, a.description].filter(Boolean).join("\n\n")}
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
          </>
        )}
      </div>
    </div>
  );
}
