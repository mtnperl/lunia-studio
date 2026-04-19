import { z } from "zod";
import { randomUUID } from "crypto";
import { nanoid } from "nanoid";
import { getBriefs, saveBrief } from "@/lib/kv";
import { findAngle, findConcept } from "@/lib/angleLibrary";
import { UGCBrief } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const docSchema = z.object({
  aboutBrand: z.string().max(4000),
  whoWereLookingFor: z.string().max(4000),
  theConcept: z.string().max(4000),
  theSetup: z.string().max(4000),
  whereToFilm: z.string().max(4000),
  deliverables: z.string().max(4000),
});

const createSchema = z.object({
  angle: z.string().max(60),
  conceptId: z.string().max(120).nullable().optional(),
  conceptLabel: z.string().max(200),
  title: z.string().min(1).max(200),
  doc: docSchema.nullable().optional(),
  script: z.object({
    videoHook: z.string().max(1000),
    textHook: z.string().max(500),
    narrative: z.string().max(8000),
    cta: z.string().max(500),
  }).optional(),
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

    const { angle, conceptId, conceptLabel, title, doc, script, creatorName } = parsed.data;

    if (angle && !findAngle(angle)) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json({ error: `Unknown angle: ${angle}` }, { status: 400 });
    }
    if (angle && conceptId && !findConcept(angle, conceptId)) {
      logExit("/api/ugc/briefs", "create", start, 400);
      return Response.json({ error: `Unknown concept for angle ${angle}: ${conceptId}` }, { status: 400 });
    }

    const now = Date.now();
    const brief: UGCBrief = {
      id: randomUUID(),
      publicBriefId: nanoid(16),
      angle: angle || "other",
      conceptId: conceptId ?? null,
      conceptLabel: conceptLabel || title,
      title,
      doc: doc ?? null,
      script: script ?? { videoHook: "", textHook: "", narrative: "", cta: "" },
      complianceFlags: [],
      status: "draft",
      creatorName: creatorName ?? null,
      createdAt: now,
      updatedAt: now,
      sharedAt: null,
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
