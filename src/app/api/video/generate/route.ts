import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { VideoAdScene } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are writing a short video ad script for Lunia Life, a premium sleep supplement brand.
Brand: Lunia Life — website www.lunialife.com. All video ads are for the Lunia Life audience: health-conscious adults (25-55) who struggle with sleep and want natural solutions. Always reference the brand as "Lunia Life" or "Lunia Restore". The CTA subline should always drive to www.lunialife.com.
Lunia Restore contains magnesium bisglycinate, L-theanine, and apigenin. Melatonin-free. Under $1/serving. 78,000+ customers.
Brand voice: warm, confident, evidence-informed, minimal.

RULES (non-negotiable):
- No medical claims ("cures", "treats", "heals", "prevents")
- Use softeners only: "may support", "designed to", "helps promote", "shown in studies", "associated with"
- No em dashes (—). Use commas or periods instead.
- Headlines: ≤8 words, punchy, uppercase impact (but write in sentence case)
- Sublines: ≤15 words, conversational
- No competitor names
- Use second person ("you", "your")
- Stats must be real and defensible

Output ONLY valid JSON, no preamble, no markdown fences:
{
  "scenes": [
    {
      "type": "hook",
      "headline": "...",
      "subline": "..."
    },
    {
      "type": "science",
      "headline": "...",
      "subline": "...",
      "stat": "...",
      "caption": "..."
    },
    {
      "type": "product",
      "headline": "...",
      "subline": "..."
    },
    {
      "type": "proof",
      "headline": "...",
      "stat": "78,000+",
      "caption": "..."
    },
    {
      "type": "cta",
      "headline": "Try Lunia tonight",
      "subline": "..."
    }
  ]
}

For the science scene: stat should be a compelling number (e.g. "72%", "Stage 3", "23%"), caption is a short attribution.
For the proof scene: stat defaults to "78,000+" unless topic suggests a better real metric. Caption should be "customers trust Lunia Life" or similar.
For the cta scene: headline must reference Lunia. Subline should create mild urgency or reinforce key benefit in ≤12 words.`;

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

    const HOOK_TONE_INSTRUCTIONS: Record<string, string> = {
      "pattern-interrupt": "HOOK STYLE: Pattern Interrupt. The hook headline must challenge a false belief or habit the viewer holds about themselves (e.g. 'Stop telling yourself you're a bad sleeper.'). Bold, direct, slightly provocative.",
      "stat-shock": "HOOK STYLE: Stat Shock. The hook headline must lead with a surprising statistic or counterintuitive fact that forces a reframe (e.g. '72% of adults wake up exhausted every morning.'). The stat should feel real and alarming.",
      "question-hook": "HOOK STYLE: Question Hook. The hook headline must be a conversational question that mirrors the viewer's exact lived experience (e.g. 'Why do you fall asleep fine but wake up at 3am?'). Highly specific, not generic.",
    };
    const hookInstruction = HOOK_TONE_INSTRUCTIONS[hookTone] ?? HOOK_TONE_INSTRUCTIONS["pattern-interrupt"];

    const userMessage = `Generate a 5-scene video ad script for the following topic: ${topic}

${hookInstruction}`;

    let scenes: VideoAdScene[] | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const message = await createContentMessage({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: attempt === 1 ? SYSTEM_PROMPT : SYSTEM_PROMPT + "\n\nCRITICAL: Previous response was not valid JSON. Output ONLY the JSON object, nothing else.",
          messages: [{ role: "user", content: userMessage }],
        });

        const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
        const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(cleaned);

        // Attach default durationFrames
        const DEFAULTS: Record<string, number> = {
          hook: 90, science: 150, product: 150, proof: 150, cta: 210,
        };
        scenes = (parsed.scenes as VideoAdScene[]).map((s) => ({
          ...s,
          durationFrames: DEFAULTS[s.type] ?? 150,
        }));
        break;
      } catch (err) {
        console.error(`[api/video/generate] attempt ${attempt} failed`, err);
      }
    }

    if (!scenes) {
      return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
    }

    return Response.json({ scenes });
  } catch (err) {
    console.error("[api/video/generate]", err);
    return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
  }
}
