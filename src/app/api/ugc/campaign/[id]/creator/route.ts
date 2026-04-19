import { z } from "zod";
import { randomUUID } from "crypto";
import { getCampaignById, saveCampaign } from "@/lib/kv";
import { UGCCreator, UGC_PIPELINE_STAGES } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const creatorSchema = z.object({
  name: z.string().min(1).max(120),
  angle: z.string().max(80).default(""),
  briefId: z.string().nullable().optional(),
  sourcingPlatform: z.enum(["BACKSTAGE", "upwork", "other"]).default("other"),
  cost: z.number().min(0).max(100000).default(0),
  goodsShipped: z.boolean().default(false),
  stage: z.enum(UGC_PIPELINE_STAGES as [string, ...string[]]).default("invited"),
  versionsDelivered: z.number().int().min(0).max(99).default(0),
  caption1: z.string().max(2000).default(""),
  caption2: z.string().max(2000).default(""),
  notes: z.string().max(2000).default(""),
  postedUrl: z.string().url().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]/creator", "append", { campaignId: id });
  try {
    const body = await req.json();
    const parsed = creatorSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/campaign/[id]/creator", "append", start, 400, { campaignId: id });
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]/creator", "append", start, 404, { campaignId: id });
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.creators.length >= 200) {
      logExit("/api/ugc/campaign/[id]/creator", "append", start, 400, { campaignId: id });
      return Response.json({ error: "Campaign creator limit (200) reached" }, { status: 400 });
    }
    const now = Date.now();
    const creator: UGCCreator = {
      id: randomUUID(),
      name: parsed.data.name,
      angle: parsed.data.angle,
      briefId: parsed.data.briefId ?? null,
      sourcingPlatform: parsed.data.sourcingPlatform,
      cost: parsed.data.cost,
      goodsShipped: parsed.data.goodsShipped,
      stage: parsed.data.stage as UGCCreator["stage"],
      versionsDelivered: parsed.data.versionsDelivered,
      caption1: parsed.data.caption1,
      caption2: parsed.data.caption2,
      notes: parsed.data.notes,
      postedUrl: parsed.data.postedUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    const next = {
      ...campaign,
      creators: [...campaign.creators, creator],
      updatedAt: now,
    };
    await saveCampaign(next);
    logExit("/api/ugc/campaign/[id]/creator", "append", start, 200, {
      campaignId: id,
      creatorId: creator.id,
    });
    return Response.json(creator);
  } catch (err) {
    console.error("[api/ugc/campaign/[id]/creator] POST", err);
    logExit("/api/ugc/campaign/[id]/creator", "append", start, 500, { campaignId: id });
    return Response.json({ error: "Failed to append creator" }, { status: 500 });
  }
}
