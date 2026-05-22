import { saveCampaignEmail } from "@/lib/kv";
import { mirrorImageToBlob } from "@/lib/blob-mirror";
import type { CampaignContent, SavedCampaign } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
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

    const campaign: SavedCampaign = {
      id,
      topic,
      createdAt: new Date().toISOString(),
      content: { ...content, images },
    };

    await saveCampaignEmail(campaign);
    return Response.json({ id });
  } catch (err) {
    console.error("[api/campaign/save]", err);
    return Response.json({ error: "Failed to save campaign" }, { status: 500 });
  }
}
