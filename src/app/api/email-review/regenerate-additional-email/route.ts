import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import { buildReviseAdditionalEmailPrompt } from "@/lib/email-review-prompts";
import type { AdditionalEmail } from "@/lib/types";

export const maxDuration = 300;

/** Replace em dashes with a plain hyphen-space so generated copy stays on-brand. */
function stripEmDashes(text: string): string {
  return text.replace(/ — /g, ", ").replace(/—/g, " - ");
}

function safeParse(raw: string): AdditionalEmail | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped) as AdditionalEmail; } catch { /* fallthrough */ }
  const m = stripped.match(/\{[\s\S]*\}$/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as AdditionalEmail; } catch { return null; }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    const emailId = body.emailId as string | undefined;
    const userComment = (body.userComment as string | undefined)?.trim();

    if (!reviewId || !emailId || !userComment) {
      return Response.json({ error: "missing reviewId, emailId, or userComment" }, { status: 400 });
    }

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const emails = review.additionalEmails ?? [];
    const idx = emails.findIndex((e) => e.id === emailId);
    if (idx < 0) return Response.json({ error: `additional email ${emailId} not found in review` }, { status: 404 });

    const existingEmail = emails[idx];
    const rewritesSection = review.sections.find((s) => s.key === "rewrites");

    const t0 = Date.now();
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{
        role: "user",
        content: buildReviseAdditionalEmailPrompt({
          flowJson: JSON.stringify(review.flow, null, 2),
          existingEmailJson: JSON.stringify(existingEmail, null, 2),
          userComment,
          existingRewritesMarkdown: rewritesSection?.bodyMarkdown ?? "(no rewrites available)",
        }),
      }],
    });

    const text = extractText(msg);
    const parsed = safeParse(text);

    if (!parsed || typeof parsed.bodyMarkdown !== "string" || !parsed.id) {
      console.error("[email-review/regenerate-additional-email] invalid output:", text.slice(0, 500));
      return Response.json({
        error: "Could not parse a valid email from the model.",
        raw: text.slice(0, 1500),
      }, { status: 502 });
    }

    // Preserve structural fields; apply em-dash stripping to generated copy.
    const revised: AdditionalEmail = {
      ...parsed,
      id: existingEmail.id,
      position: existingEmail.position,
      role: existingEmail.role,
      sendDelayHours: existingEmail.sendDelayHours,
      createdAt: existingEmail.createdAt,
      bodyMarkdown: stripEmDashes(parsed.bodyMarkdown),
      subjectAlts: Array.isArray(parsed.subjectAlts) ? parsed.subjectAlts : [],
    };

    review.additionalEmails = emails.map((e, i) => (i === idx ? revised : e));
    await saveFlowReview(review);

    console.log(`[email-review/regenerate-additional-email] reviewId=${reviewId} emailId=${emailId} elapsed=${Date.now() - t0}ms`);
    return Response.json({ email: revised });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/regenerate-additional-email]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
