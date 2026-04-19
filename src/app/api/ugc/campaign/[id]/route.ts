import { z } from "zod";
import { getCampaignById, saveCampaign, deleteCampaignKv } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

const patchSchema = z.object({
  label: z.string().min(1).max(80).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]", "read", { campaignId: id });
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]", "read", start, 404, { campaignId: id });
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    logExit("/api/ugc/campaign/[id]", "read", start, 200, { campaignId: id });
    return Response.json(campaign);
  } catch (err) {
    console.error("[api/ugc/campaign/[id]] GET", err);
    logExit("/api/ugc/campaign/[id]", "read", start, 500, { campaignId: id });
    return Response.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]", "patch", { campaignId: id });
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/campaign/[id]", "patch", start, 400, { campaignId: id });
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]", "patch", start, 404, { campaignId: id });
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const next = { ...campaign, ...parsed.data, updatedAt: Date.now() };
    await saveCampaign(next);
    logExit("/api/ugc/campaign/[id]", "patch", start, 200, { campaignId: id });
    return Response.json(next);
  } catch (err) {
    console.error("[api/ugc/campaign/[id]] PATCH", err);
    logExit("/api/ugc/campaign/[id]", "patch", start, 500, { campaignId: id });
    return Response.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]", "delete", { campaignId: id });
  try {
    const url = new URL(req.url);
    const confirm = url.searchParams.get("confirm");
    if (confirm !== id) {
      logExit("/api/ugc/campaign/[id]", "delete", start, 400, { campaignId: id });
      return Response.json(
        { error: "Confirmation token mismatch; pass ?confirm={campaignId}" },
        { status: 400 },
      );
    }
    await deleteCampaignKv(id);
    logExit("/api/ugc/campaign/[id]", "delete", start, 200, { campaignId: id });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/campaign/[id]] DELETE", err);
    logExit("/api/ugc/campaign/[id]", "delete", start, 500, { campaignId: id });
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
