import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_MAX_TOKENS_MAX,
  CONTENT_THINKING,
} from "@/lib/anthropic";
import { checkRateLimit, saveFlowReview, getAssets } from "@/lib/kv";
import {
  buildAnalyzePhase1Prompt,
  buildAnalyzePhase2Prompt,
  FRAMEWORK_VERSION,
  type AssetCatalogEntry,
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

type ImagePromptDraft = Omit<FlowReviewImagePrompt, "status" | "history" | "regenSuggestions"> & {
  rationale?: string;
};

type Phase1Output = {
  ifYouOnlyDoThree: string[];
  flowCompleteness?: FlowCompletenessGap;
  sections: FlowReviewSection[];           // timing, subjects, design, strategy
  imagePrompts: ImagePromptDraft[];
};

type Phase2Output = {
  key: "rewrites";
  title: string;
  bodyMarkdown: string;
  flags?: FlowReviewSection["flags"];
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

function safeParseJson<T>(raw: string): T | null {
  // 1. Strip ``` fences Claude sometimes adds despite being told not to.
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // 2. Direct parse — the happy path.
  try { return JSON.parse(s) as T; } catch { /* try harder */ }

  // 3. Some models emit prose before the JSON object — find the first `{`
  //    and the matching closing `}` at the same nesting depth.
  const start = s.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(s.slice(start, i + 1)) as T; } catch { break; }
        }
      }
    }
  }
  return null;
}

function validatePhase1(out: Phase1Output | null): { ok: boolean; reason?: string } {
  if (!out) return { ok: false, reason: "Phase 1: Claude did not return parseable JSON" };
  if (!Array.isArray(out.ifYouOnlyDoThree) || out.ifYouOnlyDoThree.length < 1)
    return { ok: false, reason: "Phase 1: missing ifYouOnlyDoThree" };
  if (!Array.isArray(out.sections) || out.sections.length === 0)
    return { ok: false, reason: "Phase 1: missing sections" };
  if (!Array.isArray(out.imagePrompts))
    return { ok: false, reason: "Phase 1: missing imagePrompts" };
  return { ok: true };
}

function validatePhase2(out: Phase2Output | null): { ok: boolean; reason?: string } {
  if (!out) return { ok: false, reason: "Phase 2: Claude did not return parseable JSON" };
  if (out.key !== "rewrites")
    return { ok: false, reason: `Phase 2: unexpected key "${out.key as string}"` };
  if (typeof out.bodyMarkdown !== "string" || out.bodyMarkdown.length < 10)
    return { ok: false, reason: "Phase 2: missing or empty bodyMarkdown" };
  return { ok: true };
}

/** Summarise Phase 1 findings in a few lines for Phase 2 context coherence. */
function buildPhase1Brief(p1: Phase1Output): string {
  return p1.sections
    .map((s) => `- ${s.title}: ${s.bodyMarkdown.replace(/\s+/g, " ").slice(0, 200)}…`)
    .join("\n");
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

    // Pull the brand asset library and pass it into the prompt so Claude can
    // pick reference assets (product/lifestyle/ingredient) for each image.
    // Logo is auto-attached server-side at generate time so we exclude it here
    // to avoid Claude listing it (it would just get deduped anyway).
    const allAssets = await getAssets();
    const assetCatalog: AssetCatalogEntry[] = allAssets
      .filter((a) => a.assetType !== "logo")
      .map((a) => ({ id: a.id, assetType: a.assetType, name: a.name }));

    const t0 = Date.now();

    // ── Phase 1: timing, subjects, design, strategy + meta + image prompts ──
    const thinking5k = CONTENT_THINKING;
    const thinking4k = CONTENT_THINKING;

    let p1text: string;
    let p1: Phase1Output | null;
    {
      const msg = await createContentMessage({
        model: CONTENT_MODEL,
        max_tokens: CONTENT_MAX_TOKENS_MAX,
        thinking: thinking5k,
        messages: [{ role: "user", content: buildAnalyzePhase1Prompt({ flowJson, linterHint, assetCatalog }) }],
      });
      p1text = extractText(msg);
      p1 = safeParseJson<Phase1Output>(p1text);
    }
    const v1 = validatePhase1(p1);
    if (!v1.ok || !p1) {
      console.error("[email-review/analyze] Phase 1 failed:", v1.reason, "raw:", p1text.slice(0, 500));
      return Response.json({
        error: `Analyze Phase 1 failed: ${v1.reason}`,
        raw: p1text.slice(0, 2000),
      }, { status: 502 });
    }
    console.log(`[email-review/analyze] Phase 1 ok — ${p1.sections.length} sections, ${p1.imagePrompts.length} prompts, elapsed=${Date.now() - t0}ms`);

    // ── Phase 2: full body rewrites (Version A + B per email) ───────────────
    // The rewrites section is by far the longest output; isolating it here
    // means each call comfortably fits within the 32k token ceiling.
    let p2text: string;
    let p2: Phase2Output | null;
    {
      const msg2 = await createContentMessage({
        model: CONTENT_MODEL,
        max_tokens: CONTENT_MAX_TOKENS_MAX,
        thinking: thinking4k,
        messages: [{ role: "user", content: buildAnalyzePhase2Prompt({
          flowJson,
          phase1Brief: buildPhase1Brief(p1),
        }) }],
      });
      p2text = extractText(msg2);
      p2 = safeParseJson<Phase2Output>(p2text);
    }
    const v2 = validatePhase2(p2);
    if (!v2.ok || !p2) {
      console.error("[email-review/analyze] Phase 2 failed:", v2.reason, "raw:", p2text.slice(0, 500));
      return Response.json({
        error: `Analyze Phase 2 (rewrites) failed: ${v2.reason}`,
        raw: p2text.slice(0, 2000),
      }, { status: 502 });
    }
    console.log(`[email-review/analyze] Phase 2 ok — rewrites ${p2.bodyMarkdown.length} chars, elapsed=${Date.now() - t0}ms`);

    // ── Merge phases + guarantee flowCompleteness ───────────────────────────
    const rewritesSection: FlowReviewSection = {
      key: "rewrites",
      title: p2.title || "Full body rewrites",
      bodyMarkdown: stripEmDashes(p2.bodyMarkdown),
      flags: p2.flags,
    };

    // Strip em-dashes and drop any rogue "rewrites" Claude snuck into Phase 1
    // despite the explicit instruction not to — Phase 2 is the authoritative source.
    const p1SectionsClean = p1.sections
      .filter((s) => s.key !== "rewrites")
      .map((s) => ({ ...s, bodyMarkdown: stripEmDashes(s.bodyMarkdown) }));

    // Insert rewrites after subjects; fall back to end if subjects is missing.
    const subjectsIdx = p1SectionsClean.findIndex((s) => s.key === "subjects");
    const insertAt = subjectsIdx >= 0 ? subjectsIdx + 1 : p1SectionsClean.length;
    const mergedSections: FlowReviewSection[] = [
      ...p1SectionsClean.slice(0, insertAt),
      rewritesSection,
      ...p1SectionsClean.slice(insertAt),
    ];

    const flowCompleteness: FlowCompletenessGap =
      p1.flowCompleteness ?? computeFlowCompleteness(preprocessed);
    if (!p1.flowCompleteness) {
      console.warn("[email-review/analyze] Claude omitted flowCompleteness — using server-side fallback");
    }

    // Validate the asset IDs Claude picked. Drop anything that doesn't exist
    // in the live asset library (Claude can hallucinate IDs).
    const validAssetIds = new Set(allAssets.map((a) => a.id));

    const review: SavedFlowReview = {
      id: randomUUID(),
      flow: preprocessed,
      sections: mergedSections,
      imagePrompts: p1.imagePrompts.map((p) => {
        const refAssetIds = (p.referenceAssetIds ?? []).filter((id) => validAssetIds.has(id));
        return {
          ...p,
          engine: "gpt-image-2" as const, // hard-pin — every email image uses GPT Image 2
          referenceAssetIds: refAssetIds,
          status: "pending" as const,
        };
      }),
      ifYouOnlyDoThree: p1.ifYouOnlyDoThree.slice(0, 3),
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
