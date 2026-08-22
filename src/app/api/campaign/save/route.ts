import { saveCampaignEmail } from "@/lib/kv";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import { collectBlockImageUrls, setBlockImageUrls, refKey } from "@/lib/campaign-block-images";
import type { CampaignContent, SavedCampaign } from "@/lib/types";
import { randomUUID } from "crypto";

// This route now fans out over content.images AND every image embedded in a
// block, so its worst case is far wider than when it only walked the former.
// It had no maxDuration at all; every comparable route in this repo uses 300.
export const maxDuration = 300;

// Ceiling on block-embedded images mirrored per save. A pathological email
// cannot turn one save into a hundred sequential fetches. Anything past the
// cap keeps its original URL rather than being dropped.
const MAX_BLOCK_IMAGES = 24;

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const topic: string = body.topic ?? "";
    const content: CampaignContent = body.content;
    const existingId: string | undefined = body.id;

    if (!topic || !content?.images) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const id = existingId || randomUUID();

    // Persist generated image URLs (fal CDN expires) to Vercel Blob.
    const images = await Promise.all(
      content.images.map(async (img) => {
        if (img.source === "generated" && img.url) {
          const mirrored = await mirrorImageToBlob(img.url, `${id}-${img.id}`, "campaign-images");
          return { ...img, url: mirrored ?? img.url };
        }
        return img;
      }),
    );

    // Images living INSIDE blocks (trust-grid cells today). These were never
    // mirrored, so a pasted fal URL in a trust grid rotted within days with no
    // error anywhere. Unlike the slots above these are mirrored regardless of
    // origin: a pasted third-party URL expires just as readily, and
    // mirrorImageToBlob already no-ops on URLs that are on Blob.
    const blockRefs = collectBlockImageUrls(content.blocks ?? []).slice(0, MAX_BLOCK_IMAGES);
    const mirroredBlockUrls = new Map<string, string>();
    await Promise.all(
      blockRefs.map(async (ref) => {
        const key = `${id}-${ref.blockId}-${ref.path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
        const mirrored = await mirrorImageToBlob(ref.url, key, "campaign-images");
        // A failed mirror leaves the original in place. Losing the picture is
        // worse than keeping one that may expire.
        if (mirrored) mirroredBlockUrls.set(refKey(ref.blockId, ref.path), mirrored);
      }),
    );
    const blocks = setBlockImageUrls(content.blocks ?? [], mirroredBlockUrls);

    const campaign: SavedCampaign = {
      id,
      topic,
      createdAt: new Date().toISOString(),
      content: { ...content, images, blocks },
    };

    await saveCampaignEmail(campaign);
    return Response.json({ id });
  } catch (err) {
    console.error("[api/campaign/save]", err);
    return Response.json({ error: "Failed to save campaign" }, { status: 500 });
  }
}
