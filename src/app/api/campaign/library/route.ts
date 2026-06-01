import { getCampaignEmails, getAssets } from "@/lib/kv";

export async function GET() {
  try {
    const [campaigns, assets] = await Promise.all([getCampaignEmails(), getAssets()]);
    const logoUrl = assets.find((a) => a.assetType === "logo")?.url ?? null;
    // Always override logoUrl with the current logo asset. Saved
    // campaigns hold the URL from generation time, which goes stale the
    // moment a tighter logo is uploaded — the template's crop is tuned
    // for the latest asset, so the old URL makes saves look unchanged.
    const patched = !logoUrl
      ? campaigns
      : campaigns.map((c) => ({ ...c, content: { ...c.content, logoUrl } }));
    return Response.json(patched);
  } catch (err) {
    console.error("[api/campaign/library]", err);
    return Response.json({ error: "Failed to load campaign library" }, { status: 500 });
  }
}
