import { getDecisionModelSnapshots, saveDecisionModelSnapshot, deleteDecisionModelSnapshot } from "@/lib/kv";
import type { DecisionModelSnapshot } from "@/lib/decision-model";

// Decision Model — monthly snapshot history. A snapshot is a plain record
// (window, actuals, assumptions, computed output) the client already computed;
// this route just persists and lists it. No calc logic here.

export async function GET() {
  try {
    const snapshots = await getDecisionModelSnapshots();
    return Response.json({ snapshots });
  } catch (err) {
    console.error("[api/decision-model/snapshots GET]", err);
    return Response.json({ snapshots: [] });
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const s = body as Partial<DecisionModelSnapshot>;
  if (!s || typeof s !== "object" || !s.range || !s.input || !s.output) {
    return Response.json({ error: "snapshot requires range, input, and output" }, { status: 400 });
  }

  const snapshot: DecisionModelSnapshot = {
    id: typeof s.id === "string" && s.id ? s.id : `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
    range: s.range,
    actualsSource: s.actualsSource ?? "unavailable",
    input: s.input,
    output: s.output,
    note: typeof s.note === "string" ? s.note.slice(0, 280) : undefined,
  };

  try {
    await saveDecisionModelSnapshot(snapshot);
    return Response.json(snapshot);
  } catch (err) {
    console.error("[api/decision-model/snapshots POST]", err);
    return Response.json({ error: "Could not save snapshot" }, { status: 503 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  try {
    await deleteDecisionModelSnapshot(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/decision-model/snapshots DELETE]", err);
    return Response.json({ error: "Could not delete snapshot" }, { status: 503 });
  }
}
