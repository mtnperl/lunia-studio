import { updateSubject, markSubjectUsed, markSubjectUnused, deleteSubject } from "@/lib/kv";
import { isSubjectFormat } from "@/lib/subject-fit";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Props) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const format = typeof body.format === "string" && body.format.trim() ? body.format.trim() : undefined;

  if (body.action === "markUsed") {
    await markSubjectUsed(id, format);
    return Response.json({ ok: true });
  }

  if (body.action === "markUnused") {
    await markSubjectUnused(id, format);
    return Response.json({ ok: true });
  }

  const text = typeof body.text === "string" && body.text.trim() ? body.text.trim() : undefined;
  const formats = Array.isArray(body.formats) ? (body.formats as unknown[]).filter(isSubjectFormat) : undefined;
  if (text !== undefined || formats !== undefined) {
    await updateSubject(id, { text, formats });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Props) {
  const { id } = await params;
  await deleteSubject(id);
  return Response.json({ ok: true });
}
