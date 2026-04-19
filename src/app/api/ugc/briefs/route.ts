import { z } from "zod";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { getBriefs, saveBrief } from "@/lib/kv";
import { findAngle, findConcept } from "@/lib/angleLibrary";
import { UGCBrief } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const createSchema = z.object({
  angle: z.string().min(1).max(60),
  conceptId: z.string().max(120).nullable().optional(),
  conceptLabel: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  script: z.object({
    videoHook: z.string().max(1000),
    textHook: z.string().max(500),
    narrative: z.string().max(8000),
    cta: z.string().max(500),
  }),
  creatorName: z.string().max(200).nullable().optional(),
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
    return Response.json({ error: "Failed to load briefs" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/briefs", "create");
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }

    const { angle, conceptId, conceptLabel, title, script, creatorName } = parsed.data;

    if (!findAngle(angle)) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json({ error: `Unknown angle: ${angle}` }, { status: 400 });
    }
    if (conceptId && !findConcept(angle, conceptId)) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json({ error: `Unknown concept for angle ${angle}: ${conceptId}` }, { status: 400 });
    }

    const now = Date.now();
    const brief: UGCBrief = {
      id: randomUUID(),
      publicBriefId: nanoid(16),
      angle,
      conceptId: conceptId ?? null,
      conceptLabel,
      title,
      script,
      complianceFlags: [],
      status: "draft",
      creatorName: creatorName ?? null,
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    await saveBrief(brief);
    logExit("/api/ugc/briefs", "create", start, 201, { briefId: brief.id });
    return Response.json(brief, { status: 201 });
  } catch (err) {
    console.error("[api/ugc/briefs] POST", err);
    logExit("/api/ugc/briefs", "create", start, 500);
    return Response.json({ error: "Failed to create brief" }, { status: 500 });
  }
}
