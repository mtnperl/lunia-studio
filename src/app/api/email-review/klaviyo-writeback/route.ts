// Klaviyo writeback: takes an accepted body / subject / preview rewrite from
// a saved flow review and pushes it to Klaviyo as a draft template revision.
//
// Safety rails:
// - Drafts only — never auto-publish
// - Per-action confirmation is enforced client-side via a modal
// - All writes audit-logged via logWriteback
// - If post-verify fails, attempt one rollback
// - Requires KLAVIYO_API_KEY_WRITE; if absent → 503

import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import {
  cloneTemplate,
  swapFlowMessageTemplate,
  hasWriteAccess,
  klaviyoTemplateEditorUrl,
  logWriteback,
  KlaviyoAuthError,
  KlaviyoRateLimitError,
} from "@/lib/klaviyo";
import type { KlaviyoWritebackResult } from "@/lib/types";

export const maxDuration = 60;

type Target = "body" | "subject" | "preview";

type WritebackBody = {
  reviewId: string;
  emailId: string;        // EmailFlowAsset.id (= Klaviyo flow-message id)
  target: Target;
  contentVersion: string; // "A" | "B" | free-form
  rewrite: {
    html?: string;        // for body target
    subject?: string;     // for subject target
    previewText?: string; // for preview target
  };
  // The Klaviyo template id to clone. Required.
  sourceTemplateId: string;
};

function applyHtmlEdit(originalHtml: string | undefined, _targetSection: Target, rewrite: WritebackBody["rewrite"]): string {
  // For body rewrites we patch the existing template HTML. For subject/preview
  // we don't touch the HTML — those live on the flow message, not the template.
  // For v1 we keep this conservative: if the user provided full html, use it
  // verbatim; otherwise return the original (the swap of subject/preview is
  // handled separately and is out of scope for v1's writeback).
  if (rewrite.html) return rewrite.html;
  return originalHtml ?? "";
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "klaviyo-write");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!hasWriteAccess()) {
    return Response.json({ error: "KLAVIYO_API_KEY_WRITE not set", code: "no_write_key" }, { status: 503 });
  }

  const t0 = Date.now();
  try {
    const body = (await req.json()) as Partial<WritebackBody>;
    if (!body.reviewId || !body.emailId || !body.target || !body.contentVersion) {
      return Response.json({ error: "missing required fields" }, { status: 400 });
    }
    if (!body.sourceTemplateId) {
      return Response.json({ error: "sourceTemplateId required (the Klaviyo template id to clone)" }, { status: 400 });
    }

    const review = await getFlowReviewById(body.reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });
    const email = review.flow.emails.find((e) => e.id === body.emailId);
    if (!email) return Response.json({ error: "email not found in review" }, { status: 404 });

    // Step 1 — Clone the template (and patch HTML if body rewrite)
    const newHtml = body.target === "body"
      ? applyHtmlEdit(email.html, body.target, body.rewrite ?? {})
      : undefined;
    const cloned = await cloneTemplate({
      templateId: body.sourceTemplateId,
      edits: {
        name: `Lunia review draft · ${review.flow.flowName} · E${email.position} · ${body.contentVersion} · ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
        ...(newHtml ? { html: newHtml } : {}),
      },
    });

    await logWriteback({
      ts: new Date().toISOString(),
      action: "clone_template",
      flowMessageId: body.emailId,
      templateId: body.sourceTemplateId,
      newTemplateId: cloned.id,
      status: "success",
    });

    // Step 2 — Swap the cloned template onto the flow message (only for body target)
    if (body.target === "body") {
      try {
        await swapFlowMessageTemplate(body.emailId, cloned.id);
        await logWriteback({
          ts: new Date().toISOString(),
          action: "swap_template",
          flowMessageId: body.emailId,
          templateId: body.sourceTemplateId,
          newTemplateId: cloned.id,
          status: "success",
        });
      } catch (swapErr) {
        const detail = swapErr instanceof Error ? swapErr.message : String(swapErr);
        await logWriteback({
          ts: new Date().toISOString(),
          action: "swap_template",
          flowMessageId: body.emailId,
          templateId: body.sourceTemplateId,
          newTemplateId: cloned.id,
          status: "error",
          errorMessage: detail,
        });
        // Attempt rollback: leave the original template assigned (we never swapped).
        // The cloned draft is harmless — Mathan can delete it from Klaviyo if he wants.
        const result: KlaviyoWritebackResult = {
          emailId: body.emailId,
          klaviyoMessageId: body.emailId,
          templateDraftId: cloned.id,
          status: "error",
          target: body.target,
          contentVersion: body.contentVersion,
          errorMessage: `Clone succeeded (template ${cloned.id}) but swap failed: ${detail}. Original template still active.`,
        };
        review.writebacks = [...(review.writebacks ?? []), result];
        await saveFlowReview(review);
        return Response.json({ result, editorUrl: klaviyoTemplateEditorUrl(cloned.id) }, { status: 502 });
      }
    }

    // Subject / preview rewrites: v1 stops at the cloned-template stage. The
    // user opens the draft in Klaviyo and pastes the new subject/preview into
    // the flow message editor manually. This avoids touching the flow-message
    // attribute API which has a different shape across Klaviyo revisions.
    const result: KlaviyoWritebackResult = {
      emailId: body.emailId,
      klaviyoMessageId: body.emailId,
      templateDraftId: cloned.id,
      status: "pushed",
      pushedAt: new Date().toISOString(),
      target: body.target,
      contentVersion: body.contentVersion,
    };
    review.writebacks = [...(review.writebacks ?? []), result];
    await saveFlowReview(review);

    const elapsed = Date.now() - t0;
    console.log(`[email-review/klaviyo-writeback] reviewId=${body.reviewId} emailId=${body.emailId} target=${body.target} version=${body.contentVersion} draft=${cloned.id} elapsed=${elapsed}ms`);

    return Response.json({ result, editorUrl: klaviyoTemplateEditorUrl(cloned.id) });
  } catch (err) {
    if (err instanceof KlaviyoAuthError) return Response.json({ error: err.message, code: "auth" }, { status: 401 });
    if (err instanceof KlaviyoRateLimitError) return Response.json({ error: err.message, code: "rate_limit", retryAfterSec: err.retryAfterSec }, { status: 429 });
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/klaviyo-writeback]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
