"use client";
// One shared fetch of the asset library.
//
// AssetPicker used to fetch /api/assets on every mount. Sample data needs the
// same list to seed a block's picture, and re-fetching per block-add would be
// wasteful and racy, so the request is memoised at module level: the first
// caller starts it, everyone else awaits the same promise.
import { useEffect, useState } from "react";
import type { AssetMetadata } from "@/lib/types";
import { rankEmailAssets } from "@/lib/asset-selection";

let cached: Promise<AssetMetadata[]> | null = null;
const listeners = new Set<(assets: AssetMetadata[]) => void>();

export function publishAssets(assets: AssetMetadata[]) {
  cached = Promise.resolve(assets);
  listeners.forEach((listener) => listener(assets));
}

export async function refreshAssets(): Promise<AssetMetadata[]> {
  const res = await fetch("/api/assets", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not reload the image library.");
  const assets: AssetMetadata[] = await res.json();
  if (!Array.isArray(assets)) throw new Error("Invalid image library response.");
  publishAssets(assets);
  return assets;
}

function load(): Promise<AssetMetadata[]> {
  cached ??= fetch("/api/assets")
    .then((r) => r.json())
    .then((data) => (Array.isArray(data) ? (data as AssetMetadata[]) : []))
    .catch(() => {
      // Do not cache a failure: a transient network error should not disable
      // asset-backed samples for the rest of the session.
      cached = null;
      return [];
    });
  return cached;
}

/** The asset library, or null while it is still loading. Never throws: a
 *  failed load reads as an empty library, and callers fall back to whatever
 *  they do with no assets (for samples, an empty image field and the
 *  renderer's own placeholder). */
export function useAssets(): AssetMetadata[] | null {
  const [assets, setAssets] = useState<AssetMetadata[] | null>(null);
  useEffect(() => {
    let alive = true;
    listeners.add(setAssets);
    load().then((a) => { if (alive) setAssets(a); });
    return () => { alive = false; listeners.delete(setAssets); };
  }, []);
  return assets;
}

/** Seed new blocks from the same curated priority as the main chooser.
 * Unchecked Gen Z text stays gated until the one-time library check. */
export function pickSampleImageUrl(assets: AssetMetadata[] | null): string | undefined {
  return rankEmailAssets(assets ?? [], "")[0]?.url;
}
