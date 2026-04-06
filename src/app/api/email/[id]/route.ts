import { deleteEmailKv } from "@/lib/kv";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteEmailKv(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/email/[id]]", err);
    return Response.json({ error: "Failed to delete email" }, { status: 500 });
  }
}
