import { anthropic } from "@/lib/anthropic";
import {
  STATIC_AD_CREATOR_SYSTEM_PROMPT,
  buildAdGenerationUserMessage,
  lintAdConcept,
} from "@/lib/ad-prompts";
import { checkRateLimit } from "@/lib/kv";
import type { AdAngle, AdConcept, VisualFormat } from "@/lib/types";

export const maxDuration = 60;

const VALID_ANGLES = new Set<AdAngle>([
  "credibility",
  "price-anchor",
  "skeptic-convert",
  "outcome-first",
  "formula",
  "comparison",
  "social-proof",
]);

const VALID_FORMATS = new Set<VisualFormat>([
  "product-dark",
  "lifestyle-flatlay",
  "text-dominant",
  "before-after",
  "ingredient-macro",
]);

function extractJsonArray(text: string): unknown {
  // Strip ```json fences if present
  const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Last-resort: find the first [ and last ]
    const first = stripped.indexOf("[");
    const last = stripped.lastIndexOf("]");
    if (first >= 0 && last > first) {
      return JSON.parse(stripped.slice(first, last + 1));
    }
    throw new Error("Claude response was not valid JSON");
  }
}

function isConcept(v: unknown): v is AdConcept {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.angle === "string" &&
    typeof o.label === "string" &&
    typeof o.headline === "string" &&
    typeof o.primaryText === "string" &&
    typeof o.overlayText === "string" &&
    typeof o.visualDirection === "string" &&
    Array.isArray(o.whyItWorks) &&
    (o.whyItWorks as unknown[]).every((x) => typeof x === "string")
  );
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

  try {
    const body = await req.json();
    const angle = body.angle as AdAngle;
    const visualFormat = body.visualFormat as VisualFormat;
    const customHook = typeof body.customHook === "string" ? body.customHook : undefined;

    if (!VALID_ANGLES.has(angle)) {
      return Response.json({ error: "Invalid or missing angle" }, { status: 400 });
    }
    if (!VALID_FORMATS.has(visualFormat)) {
      return Response.json({ error: "Invalid or missing visualFormat" }, { status: 400 });
    }
    if (customHook && customHook.length > 500) {
      return Response.json({ error: "customHook too long (max 500 chars)" }, { status: 400 });
    }

    const userMessage = buildAdGenerationUserMessage({ angle, visualFormat, customHook });

    async function generateOnce(): Promise<AdConcept[]> {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 3072,
        system: STATIC_AD_CREATOR_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      const text = msg.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("\n");
      const parsed = extractJsonArray(text);
      if (!Array.isArray(parsed)) throw new Error("Expected JSON array");
      const concepts = parsed.filter(isConcept);
      if (concepts.length === 0) throw new Error("No valid concepts in response");
      return concepts;
    }

    // Generate + compliance lint; one retry if issues surface.
    let concepts = await generateOnce();
    const dirty = concepts.some((c) => lintAdConcept(c).length > 0);
    if (dirty) {
      try {
        concepts = await generateOnce();
      } catch {
        // keep first batch if retry fails
      }
    }

    // Tag each concept with any residual compliance issues (non-blocking —
    // surfaced in UI so user can regenerate copy if needed).
    const withLint = concepts.map((c) => ({
      ...c,
      angle: VALID_ANGLES.has(c.angle) ? c.angle : angle, // force requested angle
      complianceIssues: lintAdConcept(c),
    }));

    return Response.json({ concepts: withLint });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/generate]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
