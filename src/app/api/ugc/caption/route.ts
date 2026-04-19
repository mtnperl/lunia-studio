import { z } from "zod";
import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import {
  clientIp,
  incrComplianceMetric,
  logEntry,
  logExit,
  scanCompliance,
} from "@/lib/ugc-api";

const bodySchema = z.object({
  creatorName: z.string().min(1).max(120),
  angle: z.string().max(120).default(""),
  briefLabel: z.string().max(200).default(""),
});

const SYSTEM_PROMPT = `You are writing Instagram/TikTok captions for Lunia Life — a sleep supplement brand.

Hard rules:
- NEVER use em dashes. Use commas, periods, or "..." instead.
- NEVER claim the product "cures", "treats", "prevents", or "diagnoses" anything. Use softened language like "may support" or "helps with sleep quality".
- No more than one exclamation mark per caption.
- Conversational, confident, first-person when it fits.
- Each caption is 1-3 short sentences.

Output exactly two captions, one per line. No numbering, no labels, no explanation.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/caption", "draft");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/caption", "draft", start, 429);
    return Response.json(
      { error: "Too many caption drafts. Try again in an hour." },
      { status: 429 },
    );
  }
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/caption", "draft", start, 400);
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { creatorName, angle, briefLabel } = parsed.data;

    const userPrompt = `Creator: ${creatorName}
Angle: ${angle || "(not specified)"}
Brief: ${briefLabel || "(not specified)"}

Write two distinct captions for this creator's UGC post. Vary the hook between the two.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 2);
    const [caption1 = "", caption2 = ""] = lines;

    const scan1 = scanCompliance(caption1);
    const scan2 = scanCompliance(caption2);
    const worst = [scan1.level, scan2.level].includes("red")
      ? "red"
      : [scan1.level, scan2.level].includes("amber")
        ? "amber"
        : "green";
    await incrComplianceMetric(worst);

    logExit("/api/ugc/caption", "draft", start, 200, { level: worst });
    return Response.json({
      caption1,
      caption2,
      flags: {
        caption1: scan1,
        caption2: scan2,
      },
    });
  } catch (err) {
    console.error("[api/ugc/caption] POST", err);
    logExit("/api/ugc/caption", "draft", start, 500);
    return Response.json({ error: "Caption draft failed" }, { status: 500 });
  }
}
