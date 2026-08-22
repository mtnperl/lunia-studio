"use client";
// One shared fetch of the asset library.
//
// AssetPicker used to fetch /api/assets on every mount. Sample data needs the
// same list to seed a block's picture, and re-fetching per block-add would be
// wasteful and racy, so the request is memoised at module level: the first
// caller starts it, everyone else awaits the same promise.
import { useEffect, useState } from "react";
import type { AssetMetadata } from "@/lib/types";

let cached: Promise<AssetMetadata[]> | null = null;

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
    load().then((a) => { if (alive) setAssets(a); });
    return () => { alive = false; };
  }, []);
  return assets;
}

/** First product image in the library, used to give a new block a picture
 *  without spending a generation. Undefined until the library loads, or when
 *  it holds no product images. */
export function pickSampleImageUrl(assets: AssetMetadata[] | null): string | undefined {
  return assets?.find((a) => a.assetType === "product-image")?.url ?? undefined;
}
