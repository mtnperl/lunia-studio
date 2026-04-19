import { randomUUID } from "crypto";
import { getCampaignById, saveCampaign, checkRateLimit } from "@/lib/kv";
import { UGCCreator, UGCPipelineStage, UGCSourcingPlatform } from "@/lib/types";
import { parseXLSX } from "@/lib/xlsx";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const MAX_ROWS = 200;
const MAX_BYTES = 5 * 1024 * 1024;

const STAGE_MAP: Record<string, UGCPipelineStage> = {
  invited: "invited",
  sent: "approved",
  shipped: "approved",
  "in transit": "approved",
  approved: "approved",
  accepted: "approved",
  delivered: "delivered",
  "in progress": "delivered",
  edited: "edited-and-ready",
  ready: "edited-and-ready",
  "ready to post": "edited-and-ready",
  "edited and ready": "edited-and-ready",
  posted: "posted",
  published: "posted",
  live: "posted",
  cancelled: "cancelled",
  canceled: "cancelled",
};

function normalizeStage(status: string, readyToPost: string): UGCPipelineStage {
  const ready = truthy(readyToPost);
  const key = status.trim().toLowerCase();
  const base = STAGE_MAP[key];
  if (ready && (base === "delivered" || !base)) return "edited-and-ready";
  return base ?? "invited";
}

function truthy(v: string): boolean {
  const s = (v ?? "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1" || s === "x";
}

function normalizePlatform(v: string): UGCSourcingPlatform {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "backstage") return "BACKSTAGE";
  if (s === "upwork") return "upwork";
  return "other";
}

function parseRow(row: Record<string, string>): UGCCreator {
  const name = (row["Name"] ?? row["name"] ?? "").trim();

  const rawCost = (row["cost"] ?? row["Cost"] ?? "").replace(/[$,]/g, "").trim();
  const cost = rawCost ? Number(rawCost) : 0;

  const rawVersions = (row["# of versions"] ?? row["versions"] ?? "").trim();
  const versions = rawVersions ? Number(rawVersions) : 0;

  const now = Date.now();
  const script = (row["script"] ?? row["Script"] ?? "").trim();

  return {
    id: randomUUID(),
    name,
    angle: (row["Content Angle"] ?? row["angle"] ?? "").trim(),
    briefId: null,
    sourcingPlatform: normalizePlatform(row["platform"] ?? row["Platform"] ?? ""),
    cost: Number.isFinite(cost) ? cost : 0,
    goodsShipped: truthy(row["goods shipped?"] ?? row["goods shipped"] ?? ""),
    stage: normalizeStage(row["Status"] ?? "", row["Ready to be posted?"] ?? ""),
    versionsDelivered: Number.isFinite(versions) ? versions : 0,
    caption1: (row["Caption1"] ?? row["Caption 1"] ?? "").trim(),
    caption2: (row["Caption 2"] ?? row["Caption2"] ?? "").trim(),
    notes: script ? `script: ${script}` : "",
    postedUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/campaign/[id]/import", "import", { campaignId: id });
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-import");
  if (!allowed) {
    logExit("/api/ugc/campaign/[id]/import", "import", start, 429, { campaignId: id });
    return Response.json({ error: "Too many imports. Try again in an hour." }, { status: 429 });
  }
  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";

    const buf = await req.arrayBuffer();
    if (buf.byteLength === 0) {
      logExit("/api/ugc/campaign/[id]/import", "import", start, 400, { campaignId: id });
      return Response.json({ error: "Empty file" }, { status: 400 });
    }
    if (buf.byteLength > MAX_BYTES) {
      logExit("/api/ugc/campaign/[id]/import", "import", start, 413, { campaignId: id });
      return Response.json({ error: `File too large (max ${MAX_BYTES} bytes)` }, { status: 413 });
    }

    const campaign = await getCampaignById(id);
    if (!campaign) {
      logExit("/api/ugc/campaign/[id]/import", "import", start, 404, { campaignId: id });
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }

    let table: { headers: string[]; rows: Record<string, string>[] };
    try {
      table = parseXLSX(buf);
    } catch (err) {
      console.error("[api/ugc/campaign/[id]/import] parse", err);
      return Response.json({ error: "Could not parse spreadsheet (XLS/XLSX only)" }, { status: 400 });
    }

    if (table.rows.length === 0) {
      return Response.json({ error: "No rows in spreadsheet" }, { status: 400 });
    }
    if (table.rows.length > MAX_ROWS) {
      return Response.json(
        { error: `Too many rows (${table.rows.length}); max ${MAX_ROWS}` },
        { status: 400 },
      );
    }

    const creators = table.rows.map((r) => parseRow(r));

    if (dryRun) {
      logExit("/api/ugc/campaign/[id]/import", "import", start, 200, {
        campaignId: id,
        dryRun: true,
        parsed: creators.length,
      });
      return Response.json({
        dryRun: true,
        parsed: creators.length,
        errors: [],
        preview: creators.slice(0, 50),
      });
    }

    if (campaign.creators.length + creators.length > MAX_ROWS) {
      return Response.json(
        { error: `Import would exceed the ${MAX_ROWS} creator cap on this campaign` },
        { status: 400 },
      );
    }

    const next = {
      ...campaign,
      creators: [...campaign.creators, ...creators],
      updatedAt: Date.now(),
    };
    await saveCampaign(next);
    logExit("/api/ugc/campaign/[id]/import", "import", start, 200, {
      campaignId: id,
      imported: creators.length,
    });
    return Response.json({ imported: creators.length });
  } catch (err) {
    console.error("[api/ugc/campaign/[id]/import] POST", err);
    logExit("/api/ugc/campaign/[id]/import", "import", start, 500, { campaignId: id });
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
