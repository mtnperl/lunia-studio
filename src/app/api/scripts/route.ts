import { getScripts, saveScriptKv } from "@/lib/kv";
import { Script } from "@/lib/types";

export async function GET() {
  try {
    const scripts = await getScripts();
    return Response.json(scripts);
  } catch (err) {
    console.error("[api/scripts] GET error:", err);
    return Response.json([], { status: 200 }); // fail open — return empty library
  }
}

export async function POST(req: Request) {
  try {
    const script = await req.json() as Script;
    if (!script?.id || !script?.title) {
      return Response.json({ error: "Invalid script" }, { status: 400 });
    }
    await saveScriptKv(script);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/scripts] POST error:", err);
    return Response.json({ error: "Failed to save script" }, { status: 500 });
  }
}
