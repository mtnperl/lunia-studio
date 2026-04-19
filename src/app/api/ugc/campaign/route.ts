import { z } from "zod";
import { randomUUID } from "crypto";
import { getCampaigns, saveCampaign } from "@/lib/kv";
import { UGCCampaign } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const createSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  label: z.string().min(1).max(80).optional(),
});

export async function GET(): Promise<Response> {
  const start = logEntry("/api/ugc/campaign", "list");
  try {
    const campaigns = await getCampaigns();
    logExit("/api/ugc/campaign", "list", start, 200, { count: campaigns.length });
    return Response.json(campaigns);
  } catch (err) {
    console.error("[api/ugc/campaign] GET", err);
    logExit("/api/ugc/campaign", "list", start, 500);
    return Response.json([], { status: 200 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/campaign", "create");
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/campaign", "create", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { month, year, label } = parsed.data;
    const id = `${year}-${String(month).padStart(2, "0")}`;
    const existing = (await getCampaigns()).find((c) => c.id === id);
    if (existing) {
      logExit("/api/ugc/campaign", "create", start, 409, { campaignId: id });
      return Response.json({ error: "Campaign already exists", id }, { status: 409 });
    }
    const defaultLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    const now = Date.now();
    const campaign: UGCCampaign = {
      id,
      label: label ?? defaultLabel,
      month,
      year,
      creators: [],
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    await saveCampaign(campaign);
    logExit("/api/ugc/campaign", "create", start, 200, { campaignId: id });
    return Response.json(campaign);
  } catch (err) {
    console.error("[api/ugc/campaign] POST", err);
    logExit("/api/ugc/campaign", "create", start, 500);
    return Response.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

// Used by client to generate stable creator ids server-side.
export { randomUUID };
