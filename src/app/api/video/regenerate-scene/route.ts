import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { VideoAdScene, VideoAdSceneType } from "@/lib/types";

export const maxDuration = 30;

const SCENE_INSTRUCTIONS: Record<VideoAdSceneType, string> = {
  hook: 'Generate a hook scene: a bold problem statement or provocative question. headline ≤8 words, subline ≤15 words.',
  science: 'Generate a science scene: a compelling sleep/wellness stat with a short attribution. headline ≤8 words, subline ≤15 words, stat = a number/percentage, caption = short journal attribution.',
  product: 'Generate a product scene: a key Lunia benefit claim using softener language. headline ≤8 words, subline ≤15 words.',
  proof: 'Generate a proof scene: social proof headline. headline ≤8 words, stat = "78,000+" (keep unless better option exists), caption = "customers trust Lunia Life" or similar.',
  cta: 'Generate a CTA scene: headline must reference Lunia, subline creates mild urgency or reinforces key benefit in ≤12 words.',
};

const DEFAULTS: Record<VideoAdSceneType, number> = {
  hook: 90, science: 150, product: 150, proof: 150, cta: 210,
};

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const allowed = await checkRateLimit(ip, "video");
    if (!allowed) {
      return Response.json({ error: "Rate limit reached. Try again in an hour." }, { status: 429 });
    }

    const body = await req.json();
    const topic: string = (body.topic ?? "").trim();
    const sceneType: VideoAdSceneType = body.sceneType;

    if (!topic || !sceneType) {
      return Response.json({ error: "topic and sceneType are required" }, { status: 400 });
    }

    const instruction = SCENE_INSTRUCTIONS[sceneType];
    if (!instruction) {
      return Response.json({ error: "Invalid sceneType" }, { status: 400 });
    }

    const system = `You are writing a single video ad scene for Lunia Life, a premium sleep supplement brand.
Rules: no em dashes, no medical claims, use softeners ("may support", "designed to", "helps promote").
Output ONLY valid JSON for one scene, no preamble:
{ "type": "${sceneType}", "headline": "...", "subline": "...", "stat": "...", "caption": "..." }
Omit stat and caption if not relevant to this scene type.`;

    const userMessage = `Topic: ${topic}\n\n${instruction}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const message = await createContentMessage({
          model: "claude-sonnet-4-5",
          max_tokens: 256,
          system: attempt === 1 ? system : system + "\n\nCRITICAL: Output ONLY the JSON object.",
          messages: [{ role: "user", content: userMessage }],
        });

        const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
        const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        const parsed = JSON.parse(cleaned) as VideoAdScene;
        const scene: VideoAdScene = {
          ...parsed,
          type: sceneType,
          durationFrames: DEFAULTS[sceneType],
        };
        return Response.json({ scene });
      } catch (err) {
        console.error(`[api/video/regenerate-scene] attempt ${attempt} failed`, err);
      }
    }

    return Response.json({ error: "Regeneration failed — please try again" }, { status: 500 });
  } catch (err) {
    console.error("[api/video/regenerate-scene]", err);
    return Response.json({ error: "Regeneration failed — please try again" }, { status: 500 });
  }
}
