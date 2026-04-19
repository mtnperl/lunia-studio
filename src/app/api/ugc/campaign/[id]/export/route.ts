import { getCampaignById } from "@/lib/kv";
import { serializeXLSX } from "@/lib/xlsx";
import { logEntry, logExit } from "@/lib/ugc-api";
import { UGCCreator, UGC_STAGE_LABELS } from "@/lib/types";

const HEADERS = [
  "Name",
  "Content Angle",
  "platform",
  "cost",
  "goods shipped?",
  "script",
  "Status",
  "Ready to be posted?",
  "# of versions",
  "Caption1",
  "Caption 2",
];

function rowFor(c: UGCCreator): Record<string, string> {
  const scriptMatch = c.notes?.match(/^script:\s*(.*)$/);
  return {
    Name: c.name,
    "Content Angle": c.angle,
    platform: c.sourcingPlatform === "BACKSTAGE" ? "BACKSTAGE" : c.sourcingPlatform,
    cost: c.cost ? `$${c.cost}` : "",
    "goods shipped?": c.goodsShipped ? "TRUE" : "FALSE",
    script: scriptMatch ? scriptMatch[1] : "",
    Status: UGC_STAGE_LABELS[c.stage] ?? c.stage,
    "Ready to be posted?": c.stage === "approved" || c.stage === "posted" ? "TRUE" : "FALSE",
    "# of versions": c.versionsDelivered ? String(c.versionsDelivered) : "",
    Caption1: c.caption1 ?? "",
    "Caption 2": c.caption2 ?? "",
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]/export", "export", { campaignId: id });
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]/export", "export", start, 404, { campaignId: id });
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    const buf = serializeXLSX(HEADERS, campaign.creators.map(rowFor), "Creators");
    logExit("/api/ugc/campaign/[id]/export", "export", start, 200, {
      campaignId: id,
      rows: campaign.creators.length,
    });
    return new Response(buf as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${campaign.id}-ugc.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[api/ugc/campaign/[id]/export] GET", err);
    logExit("/api/ugc/campaign/[id]/export", "export", start, 500, { campaignId: id });
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}
