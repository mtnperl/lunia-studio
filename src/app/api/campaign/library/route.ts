import { getCampaignEmails, getAssets } from "@/lib/kv";

export async function GET() {
  try {
    const [campaigns, assets] = await Promise.all([getCampaignEmails(), getAssets()]);
    const logoUrl = assets.find((a) => a.assetType === "logo")?.url ?? null;
    // Backfill missing logoUrl on legacy saves so the new logo strip
    // renders without anyone having to open and re-save each campaign.
    const patched = campaigns.map((c) =>
      c.content.logoUrl || !logoUrl
        ? c
        : { ...c, content: { ...c.content, logoUrl } },
    );
    return Response.json(patched);
  } catch (err) {
    console.error("[api/campaign/library]", err);
    return Response.json({ error: "Failed to load campaign library" }, { status: 500 });
  }
}
