import { randomUUID } from "crypto";
import { getCampaignById, saveCampaign, checkRateLimit } from "@/lib/kv";
import { UGCCreator, UGCPipelineStage, UGCSourcingPlatform } from "@/lib/types";
import { parseXLSX } from "@/lib/xlsx";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const MAX_ROWS = 200;
const MAX_BYTES = 5 * 1024 * 1024;

const STAGE_MAP: Record<string, UGCPipelineStage> = {
  invited: "invited",
  sent: "shipped",
  shipped: "shipped",
  "in transit": "shipped",
  delivered: "delivered",
  "in progress": "delivered",
  approved: "approved",
  ready: "approved",
  "ready to post": "approved",
  posted: "posted",
  published: "posted",
  live: "posted",
};

function normalizeStage(status: string, readyToPost: string): UGCPipelineStage {
  const ready = truthy(readyToPost);
  const key = status.trim().toLowerCase();
  const base = STAGE_MAP[key];
  if (ready && (base === "delivered" || !base)) return "approved";
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

type ParsedRow = { creator: UGCCreator | null; error: string | null };

function parseRow(row: Record<string, string>): ParsedRow {
  const name = (row["Name"] ?? row["name"] ?? "").trim();
  if (!name) return { creator: null, error: "missing Name" };

  const rawCost = (row["cost"] ?? row["Cost"] ?? "0").replace(/[$,]/g, "").trim();
  const cost = Number(rawCost);
  if (rawCost && Number.isNaN(cost)) {
    return { creator: null, error: `invalid cost: "${rawCost}"` };
  }

  const rawVersions = (row["# of versions"] ?? row["versions"] ?? "0").trim();
  const versions = rawVersions ? Number(rawVersions) : 0;
  if (rawVersions && Number.isNaN(versions)) {
    return { creator: null, error: `invalid # of versions: "${rawVersions}"` };
  }

  const now = Date.now();
  const script = (row["script"] ?? row["Script"] ?? "").trim();

  const creator: UGCCreator = {
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

  return { creator, error: null };
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

    const results = table.rows.map((r, i) => ({ index: i, ...parseRow(r) }));
    const errors = results
      .filter((r) => r.error)
      .map((r) => ({ row: r.index + 2, error: r.error }));
    const creators = results.filter((r) => r.creator).map((r) => r.creator!);

    if (dryRun) {
      logExit("/api/ugc/campaign/[id]/import", "import", start, 200, {
        campaignId: id,
        dryRun: true,
        parsed: creators.length,
        errors: errors.length,
      });
      return Response.json({
        dryRun: true,
        parsed: creators.length,
        errors,
        preview: creators.slice(0, 50),
      });
    }

    if (errors.length > 0) {
      return Response.json(
        { error: "Fix row errors before importing", errors },
        { status: 400 },
      );
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
