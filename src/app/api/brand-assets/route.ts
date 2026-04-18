// List all brand assets. Optional `?kind=product|logo|reference` filter.

import { getBrandAssets } from "@/lib/kv";
import type { BrandAssetKind } from "@/lib/types";

const VALID_KINDS: BrandAssetKind[] = ["product", "logo", "reference"];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const kindRaw = url.searchParams.get("kind");
    const all = await getBrandAssets();
    const filtered =
      kindRaw && VALID_KINDS.includes(kindRaw as BrandAssetKind)
        ? all.filter((a) => a.kind === kindRaw)
        : all;
    return Response.json({ assets: filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/brand-assets]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
