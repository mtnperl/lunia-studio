import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import { buildRegenerateSectionPrompt } from "@/lib/email-review-prompts";
import type { FlowReviewSection, FlowReviewSectionKey } from "@/lib/types";

/** Replace em dashes with a plain hyphen-space so generated copy stays on-brand. */
function stripEmDashes(text: string): string {
  return text.replace(/ — /g, ", ").replace(/—/g, " - ");
}

export const maxDuration = 300;

const VALID_KEYS: FlowReviewSectionKey[] = ["headline", "timing", "subjects", "rewrites", "design", "strategy"];

type SectionOutput = {
  key: FlowReviewSectionKey;
  title: string;
  bodyMarkdown: string;
  flags?: { severity: "compliance" | "warning"; text: string; emailId?: string }[];
};

function safeParseSection(raw: string): SectionOutput | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped) as SectionOutput; } catch { /* fall through */ }
  const m = stripped.match(/\{[\s\S]*\}$/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as SectionOutput; } catch { return null; }
}

function summarizeOtherSections(sections: FlowReviewSection[], skipKey: FlowReviewSectionKey): string {
  return sections
    .filter((s) => s.key !== skipKey)
    .map((s) => `- ${s.title}: ${s.bodyMarkdown.replace(/\s+/g, " ").slice(0, 160)}`)
    .join("\n");
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    const sectionKey = body.sectionKey as FlowReviewSectionKey | undefined;
    const userComment = (body.userComment as string | undefined)?.trim();
    if (!reviewId || !sectionKey || !userComment) {
      return Response.json({ error: "missing reviewId, sectionKey, or userComment" }, { status: 400 });
    }
    if (!VALID_KEYS.includes(sectionKey)) {
      return Response.json({ error: `invalid sectionKey: ${sectionKey}` }, { status: 400 });
    }

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });
    const idx = review.sections.findIndex((s) => s.key === sectionKey);
    if (idx < 0) return Response.json({ error: `section ${sectionKey} not present in review` }, { status: 404 });

    const t0 = Date.now();
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{
        role: "user",
        content: buildRegenerateSectionPrompt({
          flowJson: JSON.stringify(review.flow, null, 2),
          sectionKey,
          currentSectionMarkdown: review.sections[idx].bodyMarkdown,
          userComment,
          otherSectionsBrief: summarizeOtherSections(review.sections, sectionKey),
        }),
      }],
    });
    const text = extractText(msg);
    const parsed = safeParseSection(text);
    if (!parsed || parsed.key !== sectionKey || typeof parsed.bodyMarkdown !== "string") {
      console.error("[email-review/regenerate-section] invalid output, raw:", text.slice(0, 500));
      return Response.json({
        error: `Could not parse a valid section from the model.`,
        raw: text.slice(0, 1500),
      }, { status: 502 });
    }

    review.sections[idx] = {
      key: sectionKey,
      title: parsed.title || review.sections[idx].title,
      bodyMarkdown: stripEmDashes(parsed.bodyMarkdown),
      flags: parsed.flags,
    };
    await saveFlowReview(review);

    console.log(`[email-review/regenerate-section] reviewId=${reviewId} section=${sectionKey} elapsed=${Date.now() - t0}ms`);
    return Response.json({ section: review.sections[idx] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/regenerate-section]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
