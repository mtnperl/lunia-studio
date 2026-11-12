import { checkRateLimit, getAssets, patchAssetDetails, type AssetDetailsPatch } from "@/lib/kv";
import { inspectAsset } from "@/lib/asset-review";
import type { AssetMetadata } from "@/lib/types";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
    if (!await checkRateLimit(ip, "asset-review")) return Response.json({ error: "Too many image checks. Try again later." }, { status: 429 });
    const body = await req.json();
    if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 6 || body.ids.some((id: unknown) => typeof id !== "string")) {
      return Response.json({ error: "Supply 1–6 asset IDs." }, { status: 400 });
    }
    const ids = new Set<string>(body.ids);
    const assets = (await getAssets()).filter((a) => ids.has(a.id));
    if (assets.length !== ids.size) return Response.json({ error: "One or more assets no longer exist." }, { status: 404 });
    const results: (AssetDetailsPatch & { textReview: NonNullable<AssetMetadata["textReview"]> })[] = [];
    const failures: { id: string; error: string }[] = [];
    // Bounded concurrency; write the metadata together after all checks settle.
    for (let i = 0; i < assets.length; i += 3) {
      const batch = await Promise.allSettled(assets.slice(i, i + 3).map((asset) => inspectAsset(asset, body.force === true)));
      batch.forEach((result, index) => {
        if (result.status === "fulfilled") results.push(result.value);
        else failures.push({ id: assets[i + index].id, error: "Image check unavailable. Please retry." });
      });
    }
    await patchAssetDetails(results);
    return Response.json({ results, failures });
  } catch (error) {
    console.error("[asset-review]", error);
    return Response.json({ error: "Could not check images. Please retry." }, { status: 500 });
  }
}
