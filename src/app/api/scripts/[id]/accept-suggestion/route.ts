import { getScriptById, saveScriptKv } from "@/lib/kv";
import { applySuggestionAccept } from "@/lib/suggestions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { suggestionId?: string };
    const suggestionId = body?.suggestionId;
    if (!suggestionId) {
      return Response.json({ error: "suggestionId is required" }, { status: 400 });
    }

    const script = await getScriptById(id);
    if (!script) return Response.json({ error: "Not found" }, { status: 404 });
    if (script.status === "locked") {
      return Response.json({ error: "Script is locked" }, { status: 409 });
    }

    const next = applySuggestionAccept(script, suggestionId);
    if (!next) return Response.json({ error: "Suggestion not found" }, { status: 404 });

    await saveScriptKv({ ...next, savedAt: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/scripts/[id]/accept-suggestion] error:", err);
    return Response.json({ error: "Failed to accept suggestion" }, { status: 500 });
  }
}
