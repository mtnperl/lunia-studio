import { getFlowReviewById, deleteFlowReviewKv } from "@/lib/kv";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const review = await getFlowReviewById(id);
  if (!review) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json({ review });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteFlowReviewKv(id);
  return Response.json({ ok: true });
}
