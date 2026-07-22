import { deleteCampaignSnippet } from "@/lib/kv";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteCampaignSnippet(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/campaign/snippets/[id]]", err);
    return Response.json({ error: "Failed to delete snippet" }, { status: 500 });
  }
}
