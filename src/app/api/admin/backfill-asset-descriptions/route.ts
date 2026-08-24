// Caption the assets that predate captioning.
//
//   GET  /api/admin/backfill-asset-descriptions   → what would be captioned
//   POST /api/admin/backfill-asset-descriptions   → caption up to `limit`
//                    { "confirm": true, "limit": 40 }
//
// Uploads have described themselves since the caption helper landed, so this
// exists for the library as it stood before that — an image with no
// description is invisible to /api/campaign/choose-asset, which is a quiet
// failure rather than a loud one, hence the dry run.
//
// Batched deliberately. Captioning is one model call per image and this runs
// in a function with a wall clock, so the route does a bounded slice and
// reports what is left; call it again until `remaining` is 0. That is
// friendlier than one heroic request that dies at 300 seconds having saved
// none of its work.
import { getAssets, setAssetDescription } from "@/lib/kv";
import { describeAsset } from "@/lib/asset-caption";
import type { AssetMetadata } from "@/lib/types";

export const maxDuration = 300;

/** Same exclusions the chooser applies, for the same reasons — there is no
 *  point paying to caption a logo the chooser will never offer. */
const EXCLUDED_TYPES = new Set(["logo", "carousel-style"]);
const DESCRIBABLE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

function pending(assets: AssetMetadata[]): AssetMetadata[] {
  return assets.filter(
    (a) =>
      !EXCLUDED_TYPES.has(a.assetType) &&
      DESCRIBABLE.has(a.type) &&
      (a.description ?? "").trim().length === 0,
  );
}

export async function GET() {
  try {
    const assets = await getAssets();
    const todo = pending(assets);
    return Response.json({
      total: assets.length,
      described: assets.filter((a) => (a.description ?? "").trim().length > 0).length,
      pending: todo.length,
      skipped: {
        excludedType: assets.filter((a) => EXCLUDED_TYPES.has(a.assetType)).length,
        undescribableType: assets.filter((a) => !DESCRIBABLE.has(a.type)).length,
      },
      sample: todo.slice(0, 10).map((a) => ({ id: a.id, name: a.name, assetType: a.assetType })),
      hint: "POST { confirm: true } to caption a batch.",
    });
  } catch (err) {
    console.error("[api/admin/backfill-asset-descriptions]", err);
    return Response.json({ error: "Failed to read the asset library" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return Response.json({ error: "Pass { confirm: true } to write descriptions." }, { status: 400 });
    }
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(Number(body?.limit)) ? Number(body.limit) : DEFAULT_LIMIT),
    );

    const todo = pending(await getAssets());
    const batch = todo.slice(0, limit);

    // Sequential on purpose. Each caption is a Redis read-modify-write of one
    // array holding the whole library, so running these concurrently would
    // have them overwrite each other's descriptions — the last writer wins and
    // the rest of the batch silently vanishes.
    const captioned: { id: string; name: string; description: string }[] = [];
    const failed: { id: string; name: string }[] = [];
    for (const asset of batch) {
      const description = await describeAsset({ url: asset.url, type: asset.type, name: asset.name });
      if (!description) {
        failed.push({ id: asset.id, name: asset.name });
        continue;
      }
      const saved = await setAssetDescription(asset.id, description);
      if (saved) captioned.push({ id: asset.id, name: asset.name, description });
      else failed.push({ id: asset.id, name: asset.name });
    }

    return Response.json({
      captioned: captioned.length,
      failed: failed.length,
      remaining: Math.max(0, todo.length - captioned.length),
      results: captioned,
      failures: failed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/backfill-asset-descriptions]", message);
    return Response.json({ error: `Backfill failed: ${message}` }, { status: 500 });
  }
}
