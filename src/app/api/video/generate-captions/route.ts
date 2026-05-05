import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are writing TikTok-style caption text for a Lunia Life video ad.
Brand: Lunia Life — website www.lunialife.com. Health-conscious adults (25-55) who struggle with sleep.
Lunia Restore: magnesium bisglycinate, L-theanine, apigenin. Melatonin-free. Under $1/serving. 78,000+ customers.
Brand voice: warm, direct, evidence-informed. Speaks like a knowledgeable friend, not a commercial.

RULES:
- No medical claims ("cures", "treats", "heals", "prevents"). Use softeners: "may support", "designed to", "helps promote"
- No em dashes (—). Use commas or short sentences.
- Each caption: 6-12 words. Punchy. Conversational.
- The last caption always ends with "lunialife.com"
- Write exactly 6 captions total
- No competitor names
- Second person ("you", "your")

Output ONLY valid JSON, no preamble:
{
  "captions": [
    "sentence 1",
    "sentence 2",
    "sentence 3",
    "sentence 4",
    "sentence 5",
    "sentence 6"
  ]
}`;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const allowed = await checkRateLimit(ip, "video");
    if (!allowed) {
      return Response.json({ error: "Rate limit reached. Try again in an hour." }, { status: 429 });
    }

    const body = await req.json();
    const topic: string = (body.topic ?? "").trim();
    const hookTone: string = (body.hookTone ?? "pattern-interrupt").trim();

    if (!topic) {
      return Response.json({ error: "topic is required" }, { status: 400 });
    }

    const HOOK_TONE_MAP: Record<string, string> = {
      "pattern-interrupt": "Start with a bold challenge to a common belief the viewer holds.",
      "stat-shock": "Start with a surprising statistic that forces a mental reframe.",
      "question-hook": "Start with a specific question that mirrors the viewer's exact experience.",
    };
    const hookInstruction = HOOK_TONE_MAP[hookTone] ?? HOOK_TONE_MAP["pattern-interrupt"];

    const userMessage = `Generate 6 TikTok-style captions for: ${topic}\n\n${hookInstruction}`;

    let captions: string[] | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const message = await createContentMessage({
          model: "claude-sonnet-4-5",
          max_tokens: 512,
          system: attempt === 1 ? SYSTEM_PROMPT : SYSTEM_PROMPT + "\n\nCRITICAL: Output ONLY the JSON object.",
          messages: [{ role: "user", content: userMessage }],
        });
        const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
        const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(cleaned);
        captions = parsed.captions as string[];
        break;
      } catch (err) {
        console.error(`[api/video/generate-captions] attempt ${attempt} failed`, err);
      }
    }

    if (!captions) {
      return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
    }

    const durationFrames = captions.length * 75;
    return Response.json({ captions, durationFrames });
  } catch (err) {
    console.error("[api/video/generate-captions]", err);
    return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
  }
}
