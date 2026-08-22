// Image URLs that live INSIDE a block, rather than in content.images.
//
// /api/campaign/save mirrors content.images to Blob because fal CDN URLs
// expire, but it has only ever walked that array. Block-embedded URLs were
// never mirrored, so trustgrid's imageUrl has been quietly rotting: paste a
// generated URL into a trust-grid cell and the picture disappears from the
// saved campaign within days, with no error anywhere.
//
// Everything is mirrored, not just URLs we generated. mirrorImageToBlob
// already no-ops on Blob URLs and isSafeToFetch already blocks the dangerous
// shapes, and a pasted third-party URL rots just as readily as a fal one — so
// a "was this generated?" flag would add state without adding safety.
//
// NOT fixed here: temp/-prefixed upload URLs. Those are already on Blob, so
// mirrorImageToBlob returns them untouched, and they auto-expire by design.
import type { CampaignBlock } from "./types";

/** One image URL found inside a block. `path` identifies the field so the URL
 *  can be written back to exactly where it came from. */
export type BlockImageRef = { blockId: string; path: string; url: string };

/** Stable key for pairing a ref with its replacement. */
export function refKey(blockId: string, path: string): string {
  return `${blockId}::${path}`;
}

/** Every place a block can hold an image URL directly.
 *
 *  Adding an image-bearing kind means adding one entry here and nothing else:
 *  the save route, the collector and the writer are all driven by this list. */
type Accessor = {
  path: string;
  get: (b: CampaignBlock) => (string | undefined)[];
  set: (b: CampaignBlock, index: number, url: string) => CampaignBlock;
};

const ACCESSORS: Accessor[] = [
  {
    path: "trustItems",
    get: (b) => (b.trustItems ?? []).map((t) => t.imageUrl),
    set: (b, i, url) => ({
      ...b,
      trustItems: (b.trustItems ?? []).map((t, j) => (j === i ? { ...t, imageUrl: url } : t)),
    }),
  },
];

/** Every block-embedded image URL in the email, in a stable order. Blocks with
 *  no images contribute nothing; empty and whitespace-only URLs are skipped so
 *  a half-filled row never becomes a fetch. */
export function collectBlockImageUrls(blocks: CampaignBlock[]): BlockImageRef[] {
  const refs: BlockImageRef[] = [];
  for (const b of blocks) {
    for (const acc of ACCESSORS) {
      acc.get(b).forEach((url, i) => {
        if (typeof url === "string" && url.trim()) {
          refs.push({ blockId: b.id, path: `${acc.path}[${i}]`, url });
        }
      });
    }
  }
  return refs;
}

/** Write mirrored URLs back. Keyed by refKey, so a ref with no replacement
 *  (mirroring failed, or it was capped) keeps its original URL rather than
 *  being blanked — a rotting image is bad, a missing one is worse. */
export function setBlockImageUrls(
  blocks: CampaignBlock[],
  replacements: Map<string, string>,
): CampaignBlock[] {
  if (replacements.size === 0) return blocks;
  return blocks.map((block) => {
    let next = block;
    for (const acc of ACCESSORS) {
      acc.get(block).forEach((url, i) => {
        if (typeof url !== "string" || !url.trim()) return;
        const replacement = replacements.get(refKey(block.id, `${acc.path}[${i}]`));
        if (replacement) next = acc.set(next, i, replacement);
      });
    }
    return next;
  });
}
