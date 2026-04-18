// Bulk re-tag the entire brand asset library via Claude Haiku vision.
// Runs one asset at a time (sequential, not parallel) to keep rate limits
// and Vercel function timeouts happy. Caller can send `?onlyUntagged=true`
// to skip assets that already have tags.

import { getBrandAssets, saveBrandAsset } from "@/lib/kv";
import { autoTagImage } from "@/lib/brand-asset-tagger";

export const maxDuration = 300; // plenty of headroom for big libraries

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const onlyUntagged = url.searchParams.get("onlyUntagged") === "true";
    const replace = url.searchParams.get("replace") === "true"; // if true, overwrite existing tags

    const all = await getBrandAssets();
    const queue = onlyUntagged ? all.filter((a) => a.tags.length === 0) : all;

    const results: Array<{ id: string; name: string; tags: string[]; ok: boolean; error?: string }> = [];

    for (const asset of queue) {
      try {
        const autoTags = await autoTagImage(asset.url, asset.kind);
        const merged = replace
          ? autoTags
          : Array.from(new Set([...asset.tags, ...autoTags])).slice(0, 12);
        await saveBrandAsset({ ...asset, tags: merged });
        results.push({ id: asset.id, name: asset.name, tags: merged, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[retag-all] failed for ${asset.id}:`, message);
        results.push({ id: asset.id, name: asset.name, tags: asset.tags, ok: false, error: message });
      }
    }

    return Response.json({
      total: queue.length,
      tagged: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brand-assets/retag-all]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
