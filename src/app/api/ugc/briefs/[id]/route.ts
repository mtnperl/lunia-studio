import { z } from "zod";
import { getBriefById, saveBrief, deleteBriefKv } from "@/lib/kv";
import { BriefStatus } from "@/lib/types";
import { logEntry, logExit } from "@/lib/ugc-api";

const docSchema = z.object({
  aboutBrand: z.string().max(4000),
  whoWereLookingFor: z.string().max(4000),
  theConcept: z.string().max(4000),
  theSetup: z.string().max(4000),
  whereToFilm: z.string().max(4000),
  deliverables: z.string().max(4000),
});

const patchSchema = z.object({
  title: z.string().max(200).optional(),
  conceptLabel: z.string().max(200).optional(),
  creatorName: z.string().max(200).nullable().optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
  doc: docSchema.nullable().optional(),
  script: z.object({
    videoHook: z.string().max(1000),
    textHook: z.string().max(500),
    narrative: z.string().max(8000),
    cta: z.string().max(500),
  }).optional(),
  complianceFlags: z.array(z.object({
    severity: z.enum(["amber", "red"]),
    rule: z.string(),
    match: z.string(),
  })).optional(),
  sharedAt: z.number().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]", "read", { briefId: id });
  try {
    const brief = await getBriefById(id);
    if (!brief) {
      logExit("/api/ugc/briefs/[id]", "read", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }
    logExit("/api/ugc/briefs/[id]", "read", start, 200, { briefId: id });
    return Response.json(brief);
  } catch (err) {
    console.error("[api/ugc/briefs/[id]] GET", err);
    logExit("/api/ugc/briefs/[id]", "read", start, 500, { briefId: id });
    return Response.json({ error: "Failed to load brief" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]", "patch", { briefId: id });
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/briefs/[id]", "patch", start, 400, { briefId: id });
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }

    const existing = await getBriefById(id);
    if (!existing) {
      logExit("/api/ugc/briefs/[id]", "patch", start, 404, { briefId: id });
      return Response.json({ error: "Brief not found" }, { status: 404 });
    }

    const next = {
      ...existing,
      ...parsed.data,
      status: (parsed.data.status ?? existing.status) as BriefStatus,
      updatedAt: Date.now(),
    };
    await saveBrief(next);
    logExit("/api/ugc/briefs/[id]", "patch", start, 200, { briefId: id });
    return Response.json(next);
  } catch (err) {
    console.error("[api/ugc/briefs/[id]] PATCH", err);
    logExit("/api/ugc/briefs/[id]", "patch", start, 500, { briefId: id });
    return Response.json({ error: "Failed to update brief" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const start = logEntry("/api/ugc/briefs/[id]", "delete", { briefId: id });
  try {
    await deleteBriefKv(id);
    logExit("/api/ugc/briefs/[id]", "delete", start, 200, { briefId: id });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/ugc/briefs/[id]] DELETE", err);
    logExit("/api/ugc/briefs/[id]", "delete", start, 500, { briefId: id });
    return Response.json({ error: "Failed to delete brief" }, { status: 500 });
  }
}
