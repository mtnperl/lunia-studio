// Fact verification endpoint.
//
// Runs AFTER the user picks a variant, not during generation. vercel.json caps
// /api/carousel-v2/generate at 90s, and that route already spends most of it
// producing three Opus variants in parallel. Verifying inline would blow the
// budget, and a timeout there loses the carousel, not just the check. Verifying
// on selection also means checking one variant instead of three.
//
// POST /api/verify        { kind, id, allHooks? }  → verify and persist
// PATCH /api/verify       { id, unitId, claimId, verdict, reason }  → override
//
// GET is not offered: the record lives on the content object, so the existing
// library/[id] reads already return it.

import { NextRequest } from "next/server";
import {
  checkRateLimit,
  getCarouselById,
  attachCarouselVerification,
  getGatingConfig,
} from "@/lib/kv";
import { invalidateCachedUnit } from "@/lib/verification-cache";
import {
  extractCarouselUnits,
  verifyUnits,
  deriveRecordStatus,
  summarize,
  describeVerifyError,
} from "@/lib/verification";
import type { ClaimVerdict, VerificationRecord, VerifyFrame } from "@/lib/types";
import { encodeFrame } from "@/lib/verification-stream";

export const maxDuration = 300;

type VerifyBody = {
  kind?: string;
  id?: string;
  /** Library re-verify has no selection context, so it checks every hook. */
  allHooks?: boolean;
  /**
   * Opt in to the NDJSON progress stream. Off by default so the JSON contract
   * every other caller relies on is untouched.
   */
  stream?: boolean;
};

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function POST(req: NextRequest): Promise<Response> {
  if (!(await checkRateLimit(clientIp(req), "verify"))) {
    return Response.json(
      { error: "Too many verification runs. Try again in an hour." },
      { status: 429 },
    );
  }

  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = body.kind;
  const id = typeof body.id === "string" ? body.id : "";

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (kind !== "carousel") {
    // Email and script normalizers exist in lib/verification.ts but their
    // storage wiring is not built yet. Fail loudly rather than pretending.
    return Response.json(
      { error: `Verification for "${kind}" is not wired up yet. Carousel only.` },
      { status: 400 },
    );
  }

  try {
    const carousel = await getCarouselById(id);
    if (!carousel) return Response.json({ error: "Carousel not found" }, { status: 404 });

    const units = extractCarouselUnits(
      carousel.content,
      carousel.selectedHook ?? 0,
      body.allHooks === true,
    );

    if (units.length === 0) {
      return Response.json(
        { error: "Nothing to verify — this carousel has no readable text." },
        { status: 400 },
      );
    }

    // ── Streaming path ──────────────────────────────────────────────────────
    // Same run, reported as it goes. Units are already checked in parallel and
    // each VerifiedUnit is self-describing, so emitting them on settle costs
    // nothing and replaces an invented progress bar with a real count.
    if (body.stream === true) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (frame: VerifyFrame) => {
            try {
              controller.enqueue(encoder.encode(encodeFrame(frame)));
            } catch {
              // Client hung up mid-run. The work continues to completion and is
              // still persisted below; per-unit caching makes their re-check cheap.
            }
          };

          send({ t: "start", units: units.map((u) => ({ id: u.id, label: u.label })) });

          // A single grounded unit runs 30-90s, so without this the wire is
          // silent long enough for an idle proxy to drop the connection. A bare
          // newline is a no-op line the decoder already skips, so the heartbeat
          // needs no place in the frame schema.
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode("\n"));
            } catch {
              /* closed */
            }
          }, 15_000);

          try {
            const record = await verifyUnits(
              units,
              "carousel",
              id,
              (unit) => send({ t: "unit", unit }),
              () => send({ t: "phase", phase: "conflicts" }),
            );
            const persisted = await attachCarouselVerification(id, record);
            const gating = await getGatingConfig();
            send({
              t: "done",
              record,
              status: deriveRecordStatus(record),
              summary: summarize(record),
              gating: gating.carousel,
              ...(persisted ? {} : { warning: "Verified, but the result could not be saved." }),
            });
          } catch (err) {
            console.error("[api/verify stream]", err);
            send({ t: "error", message: describeVerifyError(err) });
          } finally {
            clearInterval(heartbeat);
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          // Defeats proxy buffering, which would hold every frame back to the
          // end and silently turn this into the non-streaming path.
          "X-Accel-Buffering": "no",
        },
      });
    }

    const record = await verifyUnits(units, "carousel", id);
    const persisted = await attachCarouselVerification(id, record);

    const gating = await getGatingConfig();
    const status = deriveRecordStatus(record);

    return Response.json({
      record,
      status,
      summary: summarize(record),
      gating: gating.carousel,
      // A verification we couldn't save is still worth showing, but the user
      // needs to know it won't survive a reload.
      ...(persisted ? {} : { warning: "Verified, but the result could not be saved." }),
    });
  } catch (err) {
    console.error("[api/verify]", err);
    return Response.json({ error: describeVerifyError(err) }, { status: 500 });
  }
}

// ─── Human override ───────────────────────────────────────────────────────────
//
// The checker is wrong sometimes: paywalled journals, books, and the user's own
// unpublished data are all invisible to web search, and a real claim can come
// back unverifiable. Overriding records a decision without destroying evidence —
// the machine verdict stays on the claim beside the override, so an overridden
// green is always distinguishable from a verified one.

type OverrideBody = {
  id?: string;
  unitId?: string;
  claimId?: string;
  /** null clears the override and restores the machine verdict. */
  verdict?: ClaimVerdict | null;
  reason?: string;
};

const VALID_VERDICTS: ClaimVerdict[] = ["pass", "fail", "unverifiable"];

export async function PATCH(req: NextRequest): Promise<Response> {
  if (!(await checkRateLimit(clientIp(req), "verify-override"))) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: OverrideBody;
  try {
    body = (await req.json()) as OverrideBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, unitId, claimId, reason } = body;
  if (!id || !unitId || !claimId) {
    return Response.json({ error: "id, unitId and claimId are required" }, { status: 400 });
  }
  if (body.verdict != null && !VALID_VERDICTS.includes(body.verdict)) {
    return Response.json({ error: `verdict must be one of ${VALID_VERDICTS.join(", ")}` }, { status: 400 });
  }

  try {
    const carousel = await getCarouselById(id);
    if (!carousel) return Response.json({ error: "Carousel not found" }, { status: 404 });

    const record: VerificationRecord | undefined = carousel.verification;
    if (!record) return Response.json({ error: "This carousel has not been verified yet" }, { status: 409 });

    const unit = record.units.find((u) => u.id === unitId);
    if (!unit) return Response.json({ error: "Unit not found in the record" }, { status: 404 });

    const claim = unit.claims.find((c) => c.id === claimId);
    if (!claim) return Response.json({ error: "Claim not found in the record" }, { status: 404 });

    if (body.verdict == null) {
      delete claim.overriddenTo;
      delete claim.overriddenAt;
      delete claim.overrideReason;
    } else {
      claim.overriddenTo = body.verdict;
      claim.overriddenAt = new Date().toISOString();
      if (typeof reason === "string" && reason.trim()) claim.overrideReason = reason.trim().slice(0, 500);
      else delete claim.overrideReason;
    }

    const saved = await attachCarouselVerification(id, record);
    if (!saved) return Response.json({ error: "Could not save the override" }, { status: 500 });

    // The override belongs to THIS carousel. Drop the shared cache entry so a
    // different carousel with byte-identical text doesn't inherit the decision.
    await invalidateCachedUnit(unit.contentHash);

    return Response.json({
      record,
      status: deriveRecordStatus(record),
      summary: summarize(record),
    });
  } catch (err) {
    console.error("[api/verify PATCH]", err);
    return Response.json({ error: describeVerifyError(err) }, { status: 500 });
  }
}
