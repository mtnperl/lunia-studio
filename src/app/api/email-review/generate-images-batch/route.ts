// Batch image generator. Triggers each pending image prompt in the review
// concurrently. Each child call writes its own status to the saved review
// (status: generating → ready/error), so the client just polls the review
// and updates each card as it lands.
//
// The route returns immediately with `started: [...]` so the UI can show
// "generating N of M" without waiting for fal. The actual completion is
// observable by re-fetching the review.

import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";

export const maxDuration = 30;

function originFromRequest(req: Request): string {
  // Vercel sets `x-forwarded-host`; in local dev fall back to URL host.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "images");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    if (!reviewId) return Response.json({ error: "missing reviewId" }, { status: 400 });

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    // Mark every non-ready prompt as generating before kicking off, so the UI
    // immediately shows the busy state while the child fetches start.
    const targets = review.imagePrompts.filter((p) => p.status !== "ready");
    for (const t of targets) {
      const i = review.imagePrompts.findIndex((p) => p.id === t.id);
      if (i < 0) continue;
      review.imagePrompts[i] = { ...review.imagePrompts[i], status: "generating", errorMessage: undefined };
    }
    await saveFlowReview(review);

    // Fan out — fire-and-forget each call. We do NOT await; child writes
    // status to the saved review on completion. Client polls via /[id].
    const origin = originFromRequest(req);
    for (const p of targets) {
      // Important: run inside a microtask, not awaited. We don't want to hold
      // open the request handler.
      void fetch(`${origin}/api/email-review/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, promptId: p.id }),
      }).catch((err) => {
        console.warn("[batch] child fetch failed:", err);
      });
    }

    return Response.json({ started: targets.map((t) => t.id), total: review.imagePrompts.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/generate-images-batch]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
