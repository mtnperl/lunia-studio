import type { AssetMetadata } from "./types";
import { assetHasText } from "./asset-selection";

/** Manual clean photos apply directly. Captions are checked on the same click. */
export async function prepareManualPhoto(asset: AssetMetadata, check: (id: string) => Promise<NonNullable<AssetMetadata["textReview"]>>): Promise<AssetMetadata> {
  let result = asset;
  if (!asset.textReview && assetHasText(asset)) result = { ...asset, textReview: await check(asset.id) };
  if (result.textReview?.status === "typo" || result.textReview?.status === "uncertain") {
    throw new Error(result.textReview.issues.join(" ") || "Caption could not be verified. Choose a clean version.");
  }
  return result;
}
