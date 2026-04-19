import { z } from "zod";
import { randomUUID } from "crypto";
import { getBriefs, saveBrief } from "@/lib/kv";
import { UGCBriefTemplate } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const createSchema = z.object({
  angle: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  docUrl: z.string().url(),
});

export async function GET(): Promise<Response> {
  const start = logEntry("/api/ugc/briefs", "list");
  try {
    const briefs = await getBriefs();
    logExit("/api/ugc/briefs", "list", start, 200, { count: briefs.length });
    return Response.json(briefs);
  } catch (err) {
    console.error("[api/ugc/briefs] GET", err);
    logExit("/api/ugc/briefs", "list", start, 500);
    return Response.json([], { status: 200 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs", "create");
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const brief: UGCBriefTemplate = {
      id: randomUUID(),
      angle: parsed.data.angle,
      label: parsed.data.label,
      docUrl: parsed.data.docUrl,
      createdAt: Date.now(),
      archivedAt: null,
    };
    await saveBrief(brief);
    logExit("/api/ugc/briefs", "create", start, 200, { briefId: brief.id });
    return Response.json(brief);
  } catch (err) {
    console.error("[api/ugc/briefs] POST", err);
    logExit("/api/ugc/briefs", "create", start, 500);
    return Response.json({ error: "Failed to create brief" }, { status: 500 });
  }
}
