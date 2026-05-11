// Persists per-item done state for individual ⚠ findings within a review
// section. If autoSectionDone=true the whole section is also marked done
// (triggered client-side when the last item in a section is checked off).

import { getFlowReviewById, saveFlowReview } from "@/lib/kv";
import type { FlowReviewSectionKey } from "@/lib/types";

const VALID_KEYS: FlowReviewSectionKey[] = [
  "headline", "timing", "subjects", "rewrites", "design", "strategy",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reviewId      = body.reviewId      as string | undefined;
    const sectionKey    = body.sectionKey    as FlowReviewSectionKey | undefined;
    const itemId        = body.itemId        as string | undefined;
    const done          = Boolean(body.done);
    const autoSectionDone = Boolean(body.autoSectionDone);

    if (!reviewId || !sectionKey || !itemId) {
      return Response.json(
        { error: "missing reviewId, sectionKey, or itemId" },
        { status: 400 },
      );
    }
    if (!VALID_KEYS.includes(sectionKey)) {
      return Response.json(
        { error: `invalid sectionKey: ${sectionKey}` },
        { status: 400 },
      );
    }

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    // ── Update per-item done state ────────────────────────────────────────────
    const doneSectionItems: Record<string, string[]> = { ...(review.doneSectionItems ?? {}) };
    const currentItems = new Set<string>(doneSectionItems[sectionKey] ?? []);
    if (done) currentItems.add(itemId); else currentItems.delete(itemId);
    doneSectionItems[sectionKey] = Array.from(currentItems);
    review.doneSectionItems = doneSectionItems;

    // ── Auto-promote the section to done when the last item is checked ────────
    if (autoSectionDone) {
      const currentDone = new Set<FlowReviewSectionKey>(review.doneSectionKeys ?? []);
      currentDone.add(sectionKey);
      review.doneSectionKeys = Array.from(currentDone);
    } else if (!done) {
      // If any item is reopened, ensure the section is also reopened so the
      // body content is visible again.
      const currentDone = new Set<FlowReviewSectionKey>(review.doneSectionKeys ?? []);
      currentDone.delete(sectionKey);
      review.doneSectionKeys = Array.from(currentDone);
    }

    await saveFlowReview(review);
    return Response.json({
      doneSectionItems: review.doneSectionItems,
      doneSectionKeys:  review.doneSectionKeys,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/toggle-item-done]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
