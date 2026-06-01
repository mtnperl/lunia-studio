import { getCampaignEmailById, deleteCampaignEmailKv, getAssets } from "@/lib/kv";
import type { SavedCampaign } from "@/lib/types";

/** Backfill content fields older saved campaigns may be missing, so the
 *  current template renders correctly without a manual re-save.
 *  Only logoUrl right now — topBanner is user-authored, hero CTA reuses
 *  cta.label which has always been present. */
async function backfillTemplateFields(campaign: SavedCampaign): Promise<SavedCampaign> {
  if (campaign.content.logoUrl) return campaign;
  const assets = await getAssets();
  const logo = assets.find((a) => a.assetType === "logo");
  if (!logo) return campaign;
  return { ...campaign, content: { ...campaign.content, logoUrl: logo.url } };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const campaign = await getCampaignEmailById(id);
    if (!campaign) {
      return Response.json({ error: "Campaign not found" }, { status: 404 });
    }
    return Response.json(await backfillTemplateFields(campaign));
  } catch (err) {
    console.error("[api/campaign/[id]] GET error:", err);
    return Response.json({ error: "Failed to load campaign" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteCampaignEmailKv(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/campaign/[id]] DELETE error:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
