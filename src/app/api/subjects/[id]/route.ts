import { updateSubject, markSubjectUsed, markSubjectUnused, deleteSubject } from "@/lib/kv";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body.action === "markUsed") {
    await markSubjectUsed(id);
    return Response.json({ ok: true });
  }

  if (body.action === "markUnused") {
    await markSubjectUnused(id);
    return Response.json({ ok: true });
  }

  if (typeof body.text === "string" && body.text.trim()) {
    await updateSubject(id, body.text.trim());
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Props) {
  const { id } = await params;
  await deleteSubject(id);
  return Response.json({ ok: true });
}
