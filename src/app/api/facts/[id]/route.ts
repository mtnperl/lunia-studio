import { getFacts, saveFacts, deleteFact } from "@/lib/kv";
import type { Fact } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Edit a fact. A changed statement is kept in `previous` so the old value
 *  can be found in documents that still carry it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    const patch = (await req.json()) as Partial<Fact>;
    const all = await getFacts();
    const idx = all.findIndex((f) => f.id === id);
    if (idx < 0) return Response.json({ error: "Fact not found" }, { status: 404 });
    const cur = all[idx];
    const now = new Date().toISOString();
    const previous = patch.statement && patch.statement.trim() !== cur.statement
      ? [...(cur.previous ?? []), { statement: cur.statement, changedAt: now }]
      : cur.previous;
    const next: Fact = {
      ...cur,
      ...patch,
      id,
      statement: (patch.statement ?? cur.statement).trim(),
      source: { ...cur.source, ...(patch.source ?? {}) },
      previous,
      updatedAt: now,
      verifiedAt: patch.status === "verified" && cur.status !== "verified" ? now : cur.verifiedAt,
    };
    all[idx] = next;
    await saveFacts(all);
    return Response.json(next);
  } catch (err) {
    console.error("[api/facts/[id]] PATCH", err);
    return Response.json({ error: "Could not update the fact" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await params;
    await deleteFact(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/facts/[id]] DELETE", err);
    return Response.json({ error: "Could not delete the fact" }, { status: 500 });
  }
}
