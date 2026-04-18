/**
 * POST /api/ad/background
 *
 * Framework #4 background image generator.
 * Takes the backgroundPrompt from an AdBrief and calls Recraft V4.
 * Returns a single image URL.
 *
 * Separation of concerns: /api/ad/brief produces the prompt;
 * this route executes the image call. This way the UI can start rendering
 * the brief (copy + composition) immediately while the image loads.
 */

import { generateAdBackground } from "@/lib/fal";
import { checkRateLimit } from "@/lib/kv";
import type { AdAspectRatio } from "@/lib/fal";

export const maxDuration = 90;

const VALID_ASPECTS = new Set<AdAspectRatio>(["1:1", "4:5"]);

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

  const backgroundPrompt = typeof body.backgroundPrompt === "string"
    ? body.backgroundPrompt.slice(0, 1000)
    : null;

  const aspect = (body.aspect ?? "1:1") as AdAspectRatio;

  if (!backgroundPrompt || backgroundPrompt.trim().length < 10) {
    return Response.json(
      { error: "backgroundPrompt is required (min 10 chars)" },
      { status: 400 },
    );
  }
  if (!VALID_ASPECTS.has(aspect)) {
    return Response.json({ error: "aspect must be '1:1' or '4:5'" }, { status: 400 });
  }

  try {
    const imageUrl = await generateAdBackground({ backgroundPrompt, aspect });
    return Response.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/background]", message);
    return Response.json({ error: `Image generation failed: ${message}` }, { status: 500 });
  }
}
