import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_MAX,
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
  FlowCompletenessGap,
  FlowReviewImagePrompt,
  FlowReviewSection,
  SavedFlowReview,
} from "@/lib/types";

export const maxDuration = 300;

type AnalyzeOutput = {
  ifYouOnlyDoThree: string[];
  flowCompleteness?: FlowCompletenessGap;  // Claude should always return this; fallback computed below
  sections: FlowReviewSection[];
  imagePrompts: (Omit<FlowReviewImagePrompt, "status" | "history" | "regenSuggestions"> & {
    rationale?: string;
  })[];
};

// Canonical email counts per flow type — mirrors the prompt rubric.
const CANONICAL_COUNTS: Record<string, { count: number; timing: string }> = {
  abandoned_checkout:  { count: 3,  timing: "1-3h, 24h, 72h" },
  browse_abandonment:  { count: 2,  timing: "4-12h, 48h" },
  welcome:             { count: 4,  timing: "immediate, day 2, day 5, day 9" },
  post_purchase:       { count: 5,  timing: "day 0, day 3, day 7, day 14, day 21" },
  replenishment:       { count: 3,  timing: "replenishment-5d, replenishment-day, replenishment+14d" },
  lapsed:              { count: 2,  timing: "day 0, day 14" },
  campaign:            { count: 1,  timing: "single send" },
};

/** Compute flowCompleteness server-side when Claude omits or returns null for it. */
function computeFlowCompleteness(flow: EmailFlow): FlowCompletenessGap {
  const canon = CANONICAL_COUNTS[flow.flowType];
  if (!canon || flow.flowType === "campaign") {
    return {
      currentCount: flow.emails.length,
      canonicalCount: flow.emails.length,
      gap: 0,
      rationale: "Single campaign — no flow completeness target applies.",
    };
  }
  const currentCount = flow.emails.length;
  const canonicalCount = canon.count;
  const gap = canonicalCount - currentCount;
  let rationale: string;
  if (gap === 0) {
    rationale = `The ${flow.flowType.replace(/_/g, " ")} flow is at the framework-recommended ${canonicalCount} emails (${canon.timing}).`;
  } else if (gap > 0) {
    rationale = `The framework recommends ${canonicalCount} emails for a ${flow.flowType.replace(/_/g, " ")} flow (${canon.timing}). You currently have ${currentCount} — ${gap} email${gap === 1 ? "" : "s"} short.`;
  } else {
    rationale = `You have ${currentCount} emails, which is ${Math.abs(gap)} more than the framework recommendation of ${canonicalCount} for a ${flow.flowType.replace(/_/g, " ")} flow. Consider whether the extra email${Math.abs(gap) === 1 ? " earns" : "s earn"} their place.`;
  }
  return { currentCount, canonicalCount, gap, rationale };
}

/** Replace em dashes with a plain hyphen-space so generated copy stays on-brand. */
function stripEmDashes(text: string): string {
  // " — " (spaced em dash) → ", "
  // "—" (bare em dash) → " - "
  return text.replace(/ — /g, ", ").replace(/—/g, " - ");
}

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

    // Attempt 1 — full prompt at the model's hard token ceiling.
    let text: string;
    let parsed: AnalyzeOutput | null;
    let valid: { ok: boolean; reason?: string };
    {
      const msg = await createContentMessage({
        model: CONTENT_MODEL,
        max_tokens: CONTENT_MAX_TOKENS_MAX,
        thinking: CONTENT_THINKING,
        messages: [{ role: "user", content: buildAnalyzePrompt({ flowJson, linterHint }) }],
      });
      text = extractText(msg);
      parsed = safeParseJson(text);
      valid = validate(parsed);
    }

    // Attempt 2 — if the JSON was truncated (output too long for budget), retry
    // with a conciseness constraint that trims rewrite bodies to 180 words each
    // so the full JSON lands inside the 32k ceiling.
    if (!valid.ok) {
      console.warn(
        `[email-review/analyze] attempt 1 failed (${valid.reason}, outputLen=${text.length}) — retrying with concise flag`,
      );
      const msg2 = await createContentMessage({
        model: CONTENT_MODEL,
        max_tokens: CONTENT_MAX_TOKENS_MAX,
        thinking: CONTENT_THINKING,
        messages: [{ role: "user", content: buildAnalyzePrompt({ flowJson, linterHint, concise: true }) }],
      });
      text = extractText(msg2);
      parsed = safeParseJson(text);
      valid = validate(parsed);
    }

    if (!valid.ok || !parsed) {
      console.error("[email-review/analyze] both attempts failed:", valid.reason, "raw:", text.slice(0, 500));
      return Response.json({
        error: `Analyze returned invalid output: ${valid.reason}`,
        raw: text.slice(0, 2000),
      }, { status: 502 });
    }

    // Guarantee flowCompleteness is always set — fall back to server-side
    // computation when Claude omits the field or returns null/undefined.
    const flowCompleteness: FlowCompletenessGap =
      parsed.flowCompleteness ?? computeFlowCompleteness(preprocessed);

    if (!parsed.flowCompleteness) {
      console.warn("[email-review/analyze] Claude omitted flowCompleteness — using server-side fallback");
    }

    const review: SavedFlowReview = {
      id: randomUUID(),
      flow: preprocessed,
      // Strip em dashes from every section's generated copy so the output is on-brand.
      sections: parsed.sections.map((s) => ({
        ...s,
        bodyMarkdown: stripEmDashes(s.bodyMarkdown),
      })),
      imagePrompts: parsed.imagePrompts.map((p) => ({
        ...p,
        status: "pending" as const,
      })),
      ifYouOnlyDoThree: parsed.ifYouOnlyDoThree.slice(0, 3),
      flowCompleteness,
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
