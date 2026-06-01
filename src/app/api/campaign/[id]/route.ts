import { getCampaignEmailById, deleteCampaignEmailKv, getAssets } from "@/lib/kv";
import type { SavedCampaign } from "@/lib/types";

/** Always re-resolve logoUrl to the CURRENT logo asset (not whatever was
 *  saved). Saved campaigns hold a logoUrl from the time of generation,
 *  which goes stale the moment a new logo asset is uploaded — the crop
 *  in the template is then trimming the OLD image's padding, not the
 *  new one's. Overriding on read keeps saves visually in sync with the
 *  asset library without anyone having to open + re-save each campaign. */
async function backfillTemplateFields(campaign: SavedCampaign): Promise<SavedCampaign> {
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
