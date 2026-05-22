import { getCampaignEmailById, deleteCampaignEmailKv } from "@/lib/kv";

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
    return Response.json(campaign);
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
