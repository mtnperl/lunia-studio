import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import { checkRateLimit, saveFlowReview } from "@/lib/kv";
import {
  buildAnalyzePrompt,
  FRAMEWORK_VERSION,
} from "@/lib/email-review-prompts";
import { lintLuniaCopy, lintFindingsToPromptHint } from "@/lib/lunia-linter";
import type {
  EmailFlow,
  EmailFlowAsset,
  FlowReviewImagePrompt,
  FlowReviewSection,
  SavedFlowReview,
} from "@/lib/types";

export const maxDuration = 300;

type AnalyzeOutput = {
  ifYouOnlyDoThree: string[];
  sections: FlowReviewSection[];
  imagePrompts: (Omit<FlowReviewImagePrompt, "status" | "history" | "regenSuggestions"> & {
    rationale?: string;
  })[];
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function preprocessFlow(flow: EmailFlow): EmailFlow {
  return {
    ...flow,
    emails: flow.emails.map<EmailFlowAsset>((e) => ({
      ...e,
      bodyText: e.bodyText ?? (e.html ? stripHtml(e.html) : undefined),
    })),
  };
}

function aggregateLinterFindings(flow: EmailFlow): string {
  const all: ReturnType<typeof lintLuniaCopy>["findings"] = [];
  for (const e of flow.emails) {
    const text = `${e.subject}\n${e.previewText}\n${e.bodyText ?? ""}`;
    const r = lintLuniaCopy(text);
    all.push(...r.findings);
  }
  return lintFindingsToPromptHint({ findings: all });
}

function safeParseJson(raw: string): AnalyzeOutput | null {
  // Strip optional ```json fences
  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(stripped) as AnalyzeOutput;
  } catch {
    // Sometimes Claude leads with "Here is the JSON:" — try the first { ... } block
    const m = stripped.match(/\{[\s\S]*\}$/);
    if (m) {
      try { return JSON.parse(m[0]) as AnalyzeOutput; } catch { /* fall through */ }
    }
    return null;
  }
}

function validate(out: AnalyzeOutput | null): { ok: boolean; reason?: string } {
  if (!out) return { ok: false, reason: "Claude did not return parseable JSON" };
  if (!Array.isArray(out.ifYouOnlyDoThree) || out.ifYouOnlyDoThree.length < 1) {
    return { ok: false, reason: "missing ifYouOnlyDoThree" };
  }
  if (!Array.isArray(out.sections) || out.sections.length === 0) {
    return { ok: false, reason: "missing sections" };
  }
  if (!Array.isArray(out.imagePrompts)) {
    return { ok: false, reason: "missing imagePrompts" };
  }
  return { ok: true };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const flow = body.flow as EmailFlow | undefined;
    if (!flow || !Array.isArray(flow.emails) || flow.emails.length === 0) {
      return Response.json({ error: "missing or empty flow" }, { status: 400 });
    }

    const preprocessed = preprocessFlow(flow);
    const linterHint = aggregateLinterFindings(preprocessed);
    const flowJson = JSON.stringify(preprocessed, null, 2);

    const t0 = Date.now();
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: buildAnalyzePrompt({ flowJson, linterHint }) }],
    });
    const text = extractText(msg);
    const parsed = safeParseJson(text);
    const valid = validate(parsed);
    if (!valid.ok || !parsed) {
      console.error("[email-review/analyze] invalid output:", valid.reason, "raw:", text.slice(0, 500));
      return Response.json({
        error: `Analyze returned invalid output: ${valid.reason}`,
        raw: text.slice(0, 2000),
      }, { status: 502 });
    }

    const review: SavedFlowReview = {
      id: randomUUID(),
      flow: preprocessed,
      sections: parsed.sections,
      imagePrompts: parsed.imagePrompts.map((p) => ({
        ...p,
        status: "pending" as const,
      })),
      ifYouOnlyDoThree: parsed.ifYouOnlyDoThree.slice(0, 3),
      frameworkVersion: FRAMEWORK_VERSION,
      createdAt: new Date().toISOString(),
    };

    await saveFlowReview(review);
    const elapsed = Date.now() - t0;
    console.log(`[email-review/analyze] flow=${flow.flowName} type=${flow.flowType} emails=${flow.emails.length} elapsed=${elapsed}ms reviewId=${review.id}`);

    return Response.json({ review });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/analyze]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
