/**
 * POST /api/ad/brief
 *
 * Framework #4 entry point. Accepts angle + optional product asset context,
 * calls Claude Opus to produce a fully structured AdBrief, validates it with
 * Zod and the compliance gate, and returns it.
 *
 * The brief contains:
 *   - All copy layers (headline, primary text, overlay text)
 *   - Composition zones (where product goes, where text goes)
 *   - Moodboard (lighting, surface, era)
 *   - A Recraft V4 background-only image prompt
 *   - Self-reported compliance (re-verified server-side by regex)
 *
 * Downstream:
 *   - /api/ad/background     → takes brief.backgroundPrompt, calls Recraft V4
 *   - AdCompositor.tsx       → reads brief.composition + brief.copy to place layers
 */

import { anthropic } from "@/lib/anthropic";
import {
  AdBriefSchema,
  buildBriefSystemPrompt,
  buildBriefUserMessage,
  validateBriefCompliance,
  type AdBrief,
} from "@/lib/ad-brief";
import { getBrandAssetById, checkRateLimit } from "@/lib/kv";
import type { AdAngle, VisualFormat } from "@/lib/types";

export const maxDuration = 60;

const VALID_ANGLES = new Set<AdAngle>([
  "credibility", "price-anchor", "skeptic-convert",
  "outcome-first", "formula", "comparison", "social-proof",
]);

const VALID_FORMATS = new Set<VisualFormat>([
  "product-dark", "lifestyle-flatlay", "text-dominant",
  "before-after", "ingredient-macro",
]);

function extractJsonObject(text: string): unknown {
  const stripped = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Find the outermost { ... } if fences or prose leaked through
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(stripped.slice(first, last + 1));
    }
    throw new Error("Claude response was not valid JSON");
  }
}

async function generateBrief(opts: {
  angle: AdAngle;
  visualFormat?: VisualFormat;
  customHook?: string;
  productTags?: string[];
  productKind?: string;
}): Promise<AdBrief> {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 2048,
    system: buildBriefSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildBriefUserMessage(opts),
      },
    ],
  });

  const text = msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  const raw = extractJsonObject(text);

  // Zod parse — throws ZodError if shape doesn't match
  const parsed = AdBriefSchema.parse(raw);

  return parsed;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "ad");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const angle = body.angle as AdAngle;
  const visualFormat = body.visualFormat as VisualFormat | undefined;
  const customHook = typeof body.customHook === "string" ? body.customHook.slice(0, 500) : undefined;
  const productAssetId = typeof body.productAssetId === "string" ? body.productAssetId : undefined;

  if (!VALID_ANGLES.has(angle)) {
    return Response.json({ error: "Invalid or missing angle" }, { status: 400 });
  }
  if (visualFormat && !VALID_FORMATS.has(visualFormat)) {
    return Response.json({ error: "Invalid visualFormat" }, { status: 400 });
  }

  // Resolve product asset tags so Claude can make tag-aware layout decisions
  let productTags: string[] | undefined;
  let productKind: string | undefined;
  if (productAssetId) {
    try {
      const asset = await getBrandAssetById(productAssetId);
      if (asset) {
        productTags = asset.tags;
        productKind = asset.kind;
      }
    } catch (err) {
      console.warn("[api/ad/brief] could not resolve productAssetId:", err);
    }
  }

  try {
    let brief = await generateBrief({
      angle,
      visualFormat,
      customHook,
      productTags,
      productKind,
    });

    // Force the angle to match the request in case Opus drifted
    brief = { ...brief, angle };

    // Compliance gate — retry once if violations found
    const violations = validateBriefCompliance(brief);
    if (violations.length > 0) {
      console.warn("[api/ad/brief] compliance violations, retrying:", violations);
      try {
        let retry = await generateBrief({
          angle,
          visualFormat,
          customHook,
          productTags,
          productKind,
        });
        retry = { ...retry, angle };
        const retryViolations = validateBriefCompliance(retry);
        if (retryViolations.length === 0) {
          brief = retry;
        } else {
          // Keep the original — surface violations to the client
          console.warn("[api/ad/brief] retry still has violations:", retryViolations);
        }
      } catch (retryErr) {
        console.warn("[api/ad/brief] retry failed:", retryErr);
      }
    }

    const finalViolations = validateBriefCompliance(brief);

    return Response.json({
      brief,
      complianceViolations: finalViolations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/brief]", message);
    return Response.json({ error: `Brief generation failed: ${message}` }, { status: 500 });
  }
}
