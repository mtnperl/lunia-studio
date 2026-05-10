import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_SHORT,
} from "@/lib/anthropic";
import { checkRateLimit, getFlowReviewById, saveFlowReview } from "@/lib/kv";
import { buildRegenSuggestionsPrompt } from "@/lib/email-review-prompts";
import type { FlowReviewImageEngine } from "@/lib/types";

export const maxDuration = 120;

const VALID_ENGINES: FlowReviewImageEngine[] = ["recraft", "ideogram", "flux2"];

type Suggestion = { engine: FlowReviewImageEngine; prompt: string; rationale: string };

function safeParseSuggestions(raw: string): Suggestion[] | null {
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let candidate: unknown;
  try {
    candidate = JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\[[\s\S]*\]/);
    if (!m) return null;
    try { candidate = JSON.parse(m[0]); } catch { return null; }
  }
  if (!Array.isArray(candidate)) return null;
  const out: Suggestion[] = [];
  for (const c of candidate.slice(0, 3)) {
    if (!c || typeof c !== "object") continue;
    const engineRaw = (c as { engine?: string }).engine;
    const promptRaw = (c as { prompt?: string }).prompt;
    const rationaleRaw = (c as { rationale?: string }).rationale;
    if (typeof promptRaw !== "string" || promptRaw.trim().length < 50) continue;
    const engine: FlowReviewImageEngine = VALID_ENGINES.includes(engineRaw as FlowReviewImageEngine)
      ? (engineRaw as FlowReviewImageEngine)
      : "recraft";
    out.push({ engine, prompt: promptRaw.trim(), rationale: typeof rationaleRaw === "string" ? rationaleRaw : "" });
  }
  return out.length === 3 ? out : null;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    const promptId = body.promptId as string | undefined;
    const userComment = (body.userComment as string | undefined) ?? "";
    if (!reviewId || !promptId) return Response.json({ error: "missing reviewId or promptId" }, { status: 400 });

    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const idx = review.imagePrompts.findIndex((p) => p.id === promptId);
    if (idx < 0) return Response.json({ error: "prompt not found" }, { status: 404 });
    const prompt = review.imagePrompts[idx];

    const email = review.flow.emails.find((e) => e.id === prompt.emailId);
    const emailContext = email
      ? `Email ${email.position}: ${email.subject}\n${email.bodyText?.slice(0, 600) ?? ""}\nIntent: replacement image at ${prompt.placement} (${prompt.aspect})`
      : `Replacement image at ${prompt.placement} (${prompt.aspect})`;

    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{
        role: "user",
        content: buildRegenSuggestionsPrompt({
          currentPrompt: prompt.prompt,
          currentEngine: prompt.engine,
          emailContext,
          userComment,
        }),
      }],
    });
    const text = extractText(msg);
    const suggestions = safeParseSuggestions(text);
    if (!suggestions) {
      console.error("[email-review/regen-suggestions] invalid output, raw:", text.slice(0, 500));
      return Response.json({ error: "Could not parse 3 suggestions from model", raw: text.slice(0, 1500) }, { status: 502 });
    }

    review.imagePrompts[idx] = { ...prompt, regenSuggestions: suggestions };
    await saveFlowReview(review);
    return Response.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/regen-suggestions]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
