import { getScriptById } from "@/lib/kv";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const script = await getScriptById(id);
    if (!script) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(script);
  } catch (err) {
    console.error("[api/scripts/[id]] GET error:", err);
    return Response.json({ error: "Failed to fetch script" }, { status: 500 });
  }
}
