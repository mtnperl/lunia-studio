import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import { buildGenerateAdditionalEmailsPrompt } from "@/lib/email-review-prompts";
import type { AdditionalEmail } from "@/lib/types";

export const maxDuration = 300;

type ClaudeEmail = Omit<AdditionalEmail, "id" | "createdAt">;
type ClaudeOutput = { emails: ClaudeEmail[] };

function safeParse(raw: string): ClaudeOutput | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped) as ClaudeOutput; } catch { /* fallthrough */ }
  const m = stripped.match(/\{[\s\S]*\}$/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as ClaudeOutput; } catch { return null; }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    if (!reviewId) return Response.json({ error: "missing reviewId" }, { status: 400 });

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const gap = review.flowCompleteness?.gap ?? 0;
    if (gap <= 0) return Response.json({ error: "Flow is at or above the canonical count; nothing to add." }, { status: 400 });

    const requested = Math.min(Math.max(1, Number(body.count) || gap), 6);
    const suggestions = review.flowCompleteness?.suggestedAdditions ?? [];
    const rewritesSection = review.sections.find((s) => s.key === "rewrites");

    const t0 = Date.now();
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{
        role: "user",
        content: buildGenerateAdditionalEmailsPrompt({
          flowJson: JSON.stringify(review.flow, null, 2),
          count: requested,
          suggestedAdditionsJson: JSON.stringify(suggestions, null, 2),
          existingRewritesMarkdown: rewritesSection?.bodyMarkdown ?? "(no rewrites available)",
        }),
      }],
    });
    const text = extractText(msg);
    const parsed = safeParse(text);
    if (!parsed || !Array.isArray(parsed.emails) || parsed.emails.length === 0) {
      console.error("[email-review/generate-additional-emails] invalid output:", text.slice(0, 500));
      return Response.json({ error: "Could not parse generated emails from the model.", raw: text.slice(0, 1500) }, { status: 502 });
    }

    const stamped: AdditionalEmail[] = parsed.emails.slice(0, requested).map((e) => ({
      ...e,
      id: `add-${randomUUID().slice(0, 8)}`,
      subjectAlts: Array.isArray(e.subjectAlts) ? e.subjectAlts : [],
      createdAt: new Date().toISOString(),
    }));

    review.additionalEmails = [...(review.additionalEmails ?? []), ...stamped];
    await saveFlowReview(review);

    console.log(`[email-review/generate-additional-emails] reviewId=${reviewId} requested=${requested} returned=${stamped.length} elapsed=${Date.now() - t0}ms`);
    return Response.json({ emails: stamped, total: review.additionalEmails.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/generate-additional-emails]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
