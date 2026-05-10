// Lightweight persistence for the "Mark done / Reopen" UI on review
// sections. No model call — just a KV write.

import { getFlowReviewById, saveFlowReview } from "@/lib/kv";
import type { FlowReviewSectionKey } from "@/lib/types";

const VALID_KEYS: FlowReviewSectionKey[] = ["headline", "timing", "subjects", "rewrites", "design", "strategy"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    const sectionKey = body.sectionKey as FlowReviewSectionKey | undefined;
    const done = Boolean(body.done);

    if (!reviewId || !sectionKey) return Response.json({ error: "missing reviewId or sectionKey" }, { status: 400 });
    if (!VALID_KEYS.includes(sectionKey)) return Response.json({ error: `invalid sectionKey: ${sectionKey}` }, { status: 400 });

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const current = new Set<FlowReviewSectionKey>(review.doneSectionKeys ?? []);
    if (done) current.add(sectionKey); else current.delete(sectionKey);
    review.doneSectionKeys = Array.from(current);
    await saveFlowReview(review);

    return Response.json({ doneSectionKeys: review.doneSectionKeys });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/toggle-section-done]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
