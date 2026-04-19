import { z } from "zod";
import { randomUUID } from "crypto";
import { getBriefs, saveBrief, getCampaigns } from "@/lib/kv";
import { UGCBriefTemplate } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const patchSchema = z
  .object({
    angle: z.string().min(1).max(80).optional(),
    label: z.string().min(1).max(120).optional(),
    docUrl: z.string().url().optional(),
  })
  .strict();

async function isBriefReferenced(briefId: string): Promise<boolean> {
  const campaigns = await getCampaigns();
  return campaigns.some((c) => c.creators.some((cr) => cr.briefId === briefId));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]", "patch", { briefId: id });
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/[id]", "patch", start, 400, { briefId: id });
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const briefs = await getBriefs();
    const current = briefs.find((b) => b.id === id);
    if (!current) {
      logExit("/api/ugc/briefs/[id]", "patch", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    if (await isBriefReferenced(id)) {
      const fork: UGCBriefTemplate = {
        id: randomUUID(),
        angle: parsed.data.angle ?? current.angle,
        label: parsed.data.label ?? current.label,
        docUrl: parsed.data.docUrl ?? current.docUrl,
        createdAt: Date.now(),
        archivedAt: null,
      };
      await saveBrief(fork);
      logExit("/api/ugc/briefs/[id]", "patch", start, 200, {
        briefId: id,
        forkedTo: fork.id,
      });
      return Response.json({ ...fork, forkedFrom: id });
    }

    const updated: UGCBriefTemplate = { ...current, ...parsed.data };
    await saveBrief(updated);
    logExit("/api/ugc/briefs/[id]", "patch", start, 200, { briefId: id });
    return Response.json(updated);
  } catch (err) {
    console.error("[api/ugc/briefs/[id]] PATCH", err);
    logExit("/api/ugc/briefs/[id]", "patch", start, 500, { briefId: id });
    return Response.json({ error: "Patch failed" }, { status: 500 });
  }
}
