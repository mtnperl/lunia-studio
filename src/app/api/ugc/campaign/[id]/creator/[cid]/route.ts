import { z } from "zod";
import { getCampaignById, saveCampaign } from "@/lib/kv";
import { UGC_PIPELINE_STAGES, UGCCreator } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const patchSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    angle: z.string().max(80).optional(),
    briefId: z.string().nullable().optional(),
    sourcingPlatform: z.enum(["BACKSTAGE", "upwork", "other"]).optional(),
    cost: z.number().min(0).max(100000).optional(),
    goodsShipped: z.boolean().optional(),
    stage: z.enum(UGC_PIPELINE_STAGES as [string, ...string[]]).optional(),
    versionsDelivered: z.number().int().min(0).max(99).optional(),
    caption1: z.string().max(2000).optional(),
    caption2: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    postedUrl: z.string().url().nullable().optional(),
  })
  .strict();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
): Promise<Response> {
  const { id, cid } = await params;
  const start = logEntry("/api/ugc/campaign/[id]/creator/[cid]", "patch", {
    campaignId: id,
    creatorId: cid,
  });
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/campaign/[id]/creator/[cid]", "patch", start, 400, {
        campaignId: id,
        creatorId: cid,
      });
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]/creator/[cid]", "patch", start, 404, { campaignId: id });
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    const idx = campaign.creators.findIndex((c) => c.id === cid);
    if (idx < 0) {
      logExit("/api/ugc/campaign/[id]/creator/[cid]", "patch", start, 404, {
        campaignId: id,
        creatorId: cid,
      });
      return Response.json({ error: "Creator not found" }, { status: 404 });
    }
    const now = Date.now();
    const current = campaign.creators[idx];
    const merged: UGCCreator = {
      ...current,
      ...(parsed.data as Partial<UGCCreator>),
      updatedAt: now,
    };
    const next = {
      ...campaign,
      creators: campaign.creators.map((c, i) => (i === idx ? merged : c)),
      updatedAt: now,
    };
    await saveCampaign(next);
    logExit("/api/ugc/campaign/[id]/creator/[cid]", "patch", start, 200, {
      campaignId: id,
      creatorId: cid,
    });
    return Response.json(merged);
  } catch (err) {
    console.error("[api/ugc/campaign/[id]/creator/[cid]] PATCH", err);
    logExit("/api/ugc/campaign/[id]/creator/[cid]", "patch", start, 500, {
      campaignId: id,
      creatorId: cid,
    });
    return Response.json({ error: "Patch failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; cid: string }> },
): Promise<Response> {
  const { id, cid } = await params;
  const start = logEntry("/api/ugc/campaign/[id]/creator/[cid]", "delete", {
    campaignId: id,
    creatorId: cid,
  });
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]/creator/[cid]", "delete", start, 404, { campaignId: id });
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    const next = {
      ...campaign,
      creators: campaign.creators.filter((c) => c.id !== cid),
      updatedAt: Date.now(),
    };
    await saveCampaign(next);
    logExit("/api/ugc/campaign/[id]/creator/[cid]", "delete", start, 200, {
      campaignId: id,
      creatorId: cid,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/campaign/[id]/creator/[cid]] DELETE", err);
    logExit("/api/ugc/campaign/[id]/creator/[cid]", "delete", start, 500, {
      campaignId: id,
      creatorId: cid,
    });
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
