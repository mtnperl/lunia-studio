import { getCampaignEmails } from "@/lib/kv";

export async function GET() {
  try {
    const campaigns = await getCampaignEmails();
    return Response.json(campaigns);
  } catch (err) {
    console.error("[api/campaign/library]", err);
    return Response.json({ error: "Failed to load campaign library" }, { status: 500 });
  }
}
