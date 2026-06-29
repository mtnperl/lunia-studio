import { createContentMessage, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT, extractText } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 30;

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation. Language: clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimizing their sleep. Lunia Life sells a melatonin-free sleep supplement (magnesium glycinate, L-theanine, apigenin).

HARD BRAND RULE — NEVER use em dashes (—) or en dashes (–) anywhere. Use commas, periods, or short sentences instead.`;

function stripDashes(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const topic: string = (body.topic ?? "").trim();
    const current: string[] = Array.isArray(body.current)
      ? body.current.filter((s: unknown): s is string => typeof s === "string")
      : [];

    if (topic.length < 3) {
      return Response.json({ error: "Need a campaign topic to regenerate subject lines." }, { status: 400 });
    }

    const prompt = `${LUNIA_VOICE_SPEC}

Write 3 fresh email subject line options for this Lunia Life campaign.

Campaign topic / angle: ${topic}
${current.length ? `Current subject lines (write 3 genuinely different ones, do not just reword these):\n${current.map((s) => `- ${s}`).join("\n")}` : ""}

Rules:
- Exactly 3 options, each taking a distinct angle (e.g. benefit-led, curiosity, specificity).
- Aim for 30 to 55 characters each. No emoji. No surrounding quotes.
- Lunia voice: calm confidence, not hypey. No em dashes or en dashes.

Return ONLY valid JSON, no markdown, matching this exact schema:
{ "subjectLines": ["string", "string", "string"] }`;

    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(response);
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: { subjectLines?: unknown };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[api/campaign/regenerate-subjects] JSON parse failed:", raw.slice(0, 300));
      return Response.json({ error: "Regeneration failed, please try again." }, { status: 422 });
    }

    const subjectLines = Array.isArray(parsed.subjectLines)
      ? parsed.subjectLines
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
          .slice(0, 3)
          .map(stripDashes)
      : [];

    if (subjectLines.length === 0) {
      return Response.json({ error: "Regeneration failed, please try again." }, { status: 422 });
    }

    return Response.json({ subjectLines });
  } catch (err) {
    console.error("[api/campaign/regenerate-subjects]", err);
    return Response.json({ error: "Regeneration failed" }, { status: 500 });
  }
}
