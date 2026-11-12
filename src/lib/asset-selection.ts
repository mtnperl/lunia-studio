import type { AssetMetadata } from "./types";
import { hasBakedText } from "./asset-baked-text";
import { rankByOverlap } from "./asset-shortlist";

export function assetHasText(asset: AssetMetadata): boolean {
  return asset.textReview?.hasText ?? hasBakedText(asset);
}

export function needsTextReview(asset: AssetMetadata): boolean {
  return !asset.textReview && (asset.assetType === "gen-z" || assetHasText(asset));
}

export function emailEligible(asset: AssetMetadata, includeUnchecked = false): boolean {
  if (!asset.url || ["logo", "carousel-style"].includes(asset.assetType)) return false;
  if (/(?:^|[\s_-])contact[\s_-]*sheet(?:[\s_.-]|$)/i.test(asset.name)) return false;
  if (asset.preference === "archived" || asset.textReview?.status === "typo") return false;
  if (asset.textReview?.status === "uncertain") return false;
  // The Gen Z collection is explicitly approved for its look. A model's
  // aesthetic judgement must not override the owner's preference for it.
  if (asset.assetType !== "gen-z" && asset.textReview?.visualQuality === "avoid") return false;
  return includeUnchecked || !needsTextReview(asset);
}

function priority(asset: AssetMetadata): number {
  if (asset.assetType === "gen-z") return 0;
  if (asset.preference === "preferred") return 1;
  if (asset.textReview?.visualQuality === "strong") return 2;
  if (["email-generated", "carousel-generated"].includes(asset.assetType)) return 4;
  return 3;
}

/** Preference establishes tiers; relevance orders photos within each tier. */
export function rankEmailAssets(assets: AssetMetadata[], copy: string, includeUnchecked = false): AssetMetadata[] {
  return rankByOverlap(
    assets.filter((asset) => emailEligible(asset, includeUnchecked)),
    (asset) => `${asset.name} ${asset.textReview?.sceneDescription || asset.description || ""}`, copy,
  ).sort((a, b) => priority(a) - priority(b));
}

/** Only explicit export suffixes count, never serial photo numbers. */
function exportStem(name: string): string | undefined {
  const original = name.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const stem = original.replace(/(?:[\s_-]+(?:\d{2,5}\s*[x×]\s*\d{2,5}|1x1|4x5|16x9|9x16|square|portrait|landscape|clean|no[\s_-]*text|with[\s_-]*(?:text|caption)|caption(?:ed)?|headline|text))+$/g, "").trim();
  if (stem === original || stem.length < 5 || /^(?:img|image|photo|untitled|export|copy)[\s_-]*\d*$/i.test(stem)) return undefined;
  return stem;
}

export function assetFamilyKey(asset: AssetMetadata): string {
  return asset.familyId ? `family:${asset.familyId}` : exportStem(asset.name) ? `filename:${asset.assetType}:${exportStem(asset.name)}` : `url:${asset.url}`;
}

export type AssetFamily = { key: string; assets: AssetMetadata[]; representative: AssetMetadata; inferred: boolean };

export function groupAssetFamilies(assets: AssetMetadata[]): AssetFamily[] {
  const groups = new Map<string, AssetFamily>();
  // Unsuffixed masters can join their explicitly named exports.
  const stems = new Set(assets.map(exportableKey).filter(Boolean));
  const nameCounts = new Map<string, number>();
  for (const asset of assets) {
    if (asset.familyId) continue;
    const key = `${asset.assetType}:${asset.name.toLowerCase()}`;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  function exportableKey(a: AssetMetadata) {
    const stem = exportStem(a.name);
    return !a.familyId && stem ? `filename:${a.assetType}:${stem}` : undefined;
  }
  for (const asset of assets) {
    const master = `filename:${asset.assetType}:${asset.name.toLowerCase().replace(/\.[a-z0-9]+$/, "")}`;
    const duplicate = !asset.familyId && (nameCounts.get(`${asset.assetType}:${asset.name.toLowerCase()}`) ?? 0) > 1 &&
      !/^(?:img|image|photo|untitled|export|copy)[\s_-]*\d*(?:\.[a-z0-9]+)?$/i.test(asset.name);
    const key = !asset.familyId && stems.has(master) ? master : duplicate && !exportStem(asset.name) ? `filename:${asset.assetType}:${asset.name.toLowerCase()}` : assetFamilyKey(asset);
    const family = groups.get(key);
    if (family) family.assets.push(asset);
    else groups.set(key, { key, assets: [asset], representative: asset, inferred: key.startsWith("filename:") });
  }
  return [...groups.values()];
}

export function formatLabel(asset: AssetMetadata): string {
  if (!asset.width || !asset.height) return "Original size";
  const ratio = asset.width / asset.height;
  const shape = Math.abs(ratio - 1) < .03 ? "Square" : ratio < 1 ? "Portrait" : "Landscape";
  return `${shape} · ${asset.width} × ${asset.height}`;
}

/** Prefer an existing export with the same caption treatment before cropping. */
export function findFormatVariant(assets: AssetMetadata[], currentUrl: string, ratio: number): AssetMetadata | undefined {
  const family = groupAssetFamilies(assets).find((f) => f.assets.some((a) => a.url === currentUrl));
  const current = family?.assets.find((a) => a.url === currentUrl);
  if (!family || !current) return undefined;
  const matches = family.assets.filter((a) => emailEligible(a) && assetHasText(a) === assetHasText(current) &&
    // Distinct caption copy is a distinct treatment, even if both have text.
    (!assetHasText(a) || a.textReview?.text === current.textReview?.text) &&
    a.width && a.height && Math.abs(a.width / a.height - ratio) < .03);
  return matches.sort((a, b) => (b.width! * b.height!) - (a.width! * a.height!))[0];
}
