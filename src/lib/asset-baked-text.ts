// Does a library image have words painted into it?
//
// /api/campaign/choose-asset puts the picked image beside copy that already
// says something. An image carrying its own headline ("text overlay reads
// ...") then says two things at once, which reads as an ad pasted into an
// email. Most of the gen-z set is exactly that, and the chooser's prompt rule
// ("never pick visible text") could not hold while half its shortlist was them.
//
// The test runs on the auto-caption, which names text in a handful of ways:
// a quoted phrase (often cut off before the closing quote), "bold text",
// "caption text", "contains ... text", "tagline". Product shots are exempt:
// their label text is the product, and the chooser only offers them for copy
// about the product.
import type { AssetMetadata } from "./types";

const BAKED_TEXT = new RegExp(
  [
    String.raw`\b(headline|text overlay|overlaid text|overlay text|lettering|typography|wordmark|tagline)\b`,
    String.raw`\b(bold|caption|headline|graphic|overlay|white|black)\s+text\b`,
    String.raw`\b(caption|text|words?|sign)\s+(reads?|reading|says)\b`,
    String.raw`\bcontains\b[^.]*\btext\b`,
    // An opening quote is enough: captions are truncated, often mid-quote.
    String.raw`["“][^"”\s][^"”]{2,}`,
  ].join("|"),
  "i",
);

export function hasBakedText(a: Pick<AssetMetadata, "assetType" | "description">): boolean {
  return a.assetType !== "product-image" && BAKED_TEXT.test(a.description ?? "");
}
