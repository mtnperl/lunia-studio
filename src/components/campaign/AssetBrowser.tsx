"use client";
// The asset library as a rail panel: folders first, search across the whole
// library or within a folder, then a grid. Picking places the image into
// whatever the owner says it targets. Layout in src/app/shell.css (`.assets*`).
import { useMemo, useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import { ASSET_SECTIONS, shelfFor } from "@/lib/asset-shelves";
import { useAssets } from "./useAssets";
import { Input, Button, EmptyState } from "@/components/ui";

export default function AssetBrowser({
  selectedId,
  onPick,
  target,
  columns = 3,
}: {
  selectedId?: string;
  onPick: (asset: AssetMetadata) => void;
  /** Where a pick lands, in words. Shown above the search. */
  target?: string;
  columns?: number;
}) {
  const assets = useAssets();
  const [shelfKey, setShelfKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const shelves = useMemo(() => {
    if (!assets) return [];
    const counts = new Map<string, AssetMetadata[]>();
    for (const a of assets) {
      const key = shelfFor(a.assetType).key;
      const list = counts.get(key);
      if (list) list.push(a); else counts.set(key, [a]);
    }
    return ASSET_SECTIONS.map((s) => ({ ...s, items: counts.get(s.key) ?? [] })).filter((s) => s.items.length > 0);
  }, [assets]);

  const openShelf = shelfKey ? shelves.find((s) => s.key === shelfKey) : null;
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = openShelf ? openShelf.items : (assets ?? []);
    if (!q) return pool;
    return pool.filter((a) => `${a.name} ${a.assetType} ${a.description ?? ""}`.toLowerCase().includes(q));
  }, [query, openShelf, assets]);
  const showGrid = !!openShelf || query.trim().length > 0;

  return (
    <div className="assets" style={{ ["--assets-cols" as string]: String(columns) }}>
      {target && <div className="assets__target">{target}</div>}
      {!assets && <div className="assets__loading"><span className="ui-spinner" style={{ width: 12, height: 12 }} />Loading the library</div>}
      {assets && assets.length === 0 && (
        <EmptyState title="No images yet" description="Upload images under Assets, or save a carousel to register its generated images here." />
      )}
      {assets && assets.length > 0 && (
        <>
          <Input size="sm" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={openShelf ? `Search ${openShelf.label.toLowerCase()}` : "Search the whole library"} aria-label="Search assets" />
          {showGrid && (
            <div className="assets__crumb">
              <Button size="sm" variant="ghost" onClick={() => { setShelfKey(null); setQuery(""); }}>All folders</Button>
              <span>{openShelf ? `${openShelf.label}, ${results.length}` : `${results.length} matching`}</span>
            </div>
          )}
          {!showGrid && (
            <div className="assets__folders">
              {shelves.map((s) => (
                <button key={s.key} type="button" className="assets__folder" onClick={() => setShelfKey(s.key)}>
                  <span className="assets__dot" style={{ background: s.color }} />
                  <span className="assets__name">{s.label}</span>
                  <span className="assets__thumbs" aria-hidden="true">
                    {s.items.slice(0, 3).map((a) => <img key={a.id} src={a.url} alt="" />)}
                  </span>
                  <span className="n">{s.items.length}</span>
                </button>
              ))}
            </div>
          )}
          {showGrid && results.length === 0 && (
            <EmptyState title="Nothing matches" description={openShelf ? `No "${query.trim()}" in ${openShelf.label}.` : `No "${query.trim()}" in the library.`} />
          )}
          {showGrid && results.length > 0 && (
            <div className="assets__grid">
              {results.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="assets__cell"
                  aria-pressed={a.id === selectedId}
                  onClick={() => onPick(a)}
                  title={[`${a.name}, ${a.assetType}`, a.description].filter(Boolean).join("\n\n")}
                >
                  <img src={a.url} alt={a.name} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
