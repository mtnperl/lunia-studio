import { z } from "zod";
import { getOutreach, setOutreach } from "@/lib/kv";
import { logEntry, logExit } from "@/lib/ugc-api";

const putSchema = z.object({
  text: z.string().max(10_000),
});

export async function GET(): Promise<Response> {
  const start = logEntry("/api/ugc/outreach", "read");
  try {
    const text = await getOutreach();
    logExit("/api/ugc/outreach", "read", start, 200);
    return Response.json({ text });
  } catch (err) {
    console.error("[api/ugc/outreach] GET", err);
    logExit("/api/ugc/outreach", "read", start, 500);
    return Response.json({ text: "" }, { status: 200 });
  }
}

export async function PUT(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/outreach", "write");
  try {
    const body = await req.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/outreach", "write", start, 400);
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    await setOutreach(parsed.data.text);
    logExit("/api/ugc/outreach", "write", start, 200);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/outreach] PUT", err);
    logExit("/api/ugc/outreach", "write", start, 500);
    return Response.json({ error: "Write failed" }, { status: 500 });
  }
}
