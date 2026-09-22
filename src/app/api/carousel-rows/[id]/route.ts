import { deleteCarouselRow, getCarouselRowById, updateCarouselRow } from "@/lib/kv";
import { ROW_STATUSES, type HookOption, type RowStatus } from "@/lib/carousel-rows";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const row = await getCarouselRowById(id);
  if (!row) return Response.json({ error: "Row not found" }, { status: 404 });
  return Response.json(row, { headers: { "Cache-Control": "no-store" } });
}

/**
 * The editor's two decisions: which hook the cover wears, and where the row
 * sits in production. Slide copy is deliberately NOT patchable here. It came
 * from a reviewed sheet, and a row that drifts from its source stops being
 * reviewable. Edit the words on the deck after it is built, or edit the sheet
 * and re-import.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const body = (await req.json()) as { selectedHook?: unknown; status?: unknown };
    const patch: { selectedHook?: HookOption; status?: RowStatus } = {};
    if (body.selectedHook === "a" || body.selectedHook === "b" || body.selectedHook === "c") {
      patch.selectedHook = body.selectedHook;
    }
    if (typeof body.status === "string" && (ROW_STATUSES as readonly string[]).includes(body.status)) {
      patch.status = body.status as RowStatus;
    }
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "Nothing to update. Send selectedHook or status." }, { status: 400 });
    }
    const next = await updateCarouselRow(id, patch);
    if (!next) return Response.json({ error: "Row not found" }, { status: 404 });
    return Response.json(next);
  } catch (err) {
    console.error("[api/carousel-rows PATCH]", err);
    return Response.json({ error: "Failed to update row" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  await deleteCarouselRow(id);
  return Response.json({ ok: true });
}
