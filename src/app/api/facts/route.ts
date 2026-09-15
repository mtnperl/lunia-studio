import { getFacts, saveFacts } from "@/lib/kv";
import { mergeFacts } from "@/lib/facts";
import type { Fact } from "@/lib/types";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/** The whole ledger, newest first. */
export async function GET(): Promise<Response> {
  const facts = await getFacts();
  return Response.json(facts.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")));
}

/** Add one fact (manual) or several. Body: Fact | Fact[] with optional ids. */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const items: Partial<Fact>[] = Array.isArray(body) ? body : [body];
    const now = new Date().toISOString();
    const incoming: Fact[] = items
      .filter((f) => typeof f.statement === "string" && f.statement.trim().length > 0)
      .map((f) => ({
        id: f.id ?? `fact-${randomUUID()}`,
        subjectId: f.subjectId,
        subjectText: f.subjectText ?? "",
        statement: f.statement!.trim(),
        value: f.value,
        // The research prompt returns citation, url and quote at the top level;
        // the ledger keeps them under source. Accept both.
        source: f.source ?? { citation: (f as Record<string, unknown>).citation as string | undefined, url: (f as Record<string, unknown>).url as string | undefined, quote: (f as Record<string, unknown>).quote as string | undefined },
        status: f.status ?? "pending",
        origin: f.origin ?? "research",
        contentId: f.contentId,
        createdAt: f.createdAt ?? now,
        updatedAt: now,
        verifiedAt: f.status === "verified" ? (f.verifiedAt ?? now) : f.verifiedAt,
        previous: f.previous,
        note: f.note,
        ...(f.claimVerdict ? { claimVerdict: f.claimVerdict } : {}),
        ...(typeof f.safeForCopy === "boolean" ? { safeForCopy: f.safeForCopy } : {}),
        ...(f.claimCorrection ? { claimCorrection: f.claimCorrection } : {}),
      }));
    const existing = await getFacts();
    const { facts, added, updated } = mergeFacts(existing, incoming);
    await saveFacts(facts);
    return Response.json({ ok: true, added, updated });
  } catch (err) {
    console.error("[api/facts] POST", err);
    return Response.json({ error: "Could not save facts" }, { status: 500 });
  }
}

/**
 * Delete a set of facts in one write.
 *
 * Deleting one at a time through /api/facts/[id] reads and rewrites the whole
 * ledger per fact, so clearing a subject of five facts rewrote a few thousand
 * rows five times. This filters once and saves once.
 */
export async function DELETE(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((x: unknown): x is string => typeof x === "string" && x.length > 0).slice(0, 500)
      : [];
    if (ids.length === 0) return Response.json({ error: "No ids given" }, { status: 400 });
    const wanted = new Set(ids);
    const all = await getFacts();
    const kept = all.filter((f) => !wanted.has(f.id));
    const deleted = all.length - kept.length;
    if (deleted > 0) await saveFacts(kept);
    return Response.json({ ok: true, deleted, remaining: kept.length });
  } catch (err) {
    console.error("[api/facts] DELETE", err);
    return Response.json({ error: "Could not delete the facts" }, { status: 500 });
  }
}
