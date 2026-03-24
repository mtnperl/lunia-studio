import { anthropic } from "@/lib/anthropic";
import { fal } from "@/lib/fal";
import { AdCTA } from "@/lib/types";

export const maxDuration = 60; // seconds — sequential Claude + fal.ai can take ~35-45s

// Flow:
// competitorCopy + angle + emotion
//   → Claude (claude-sonnet-4-5)
//   → parse JSON { headline, primaryText, cta, imagePrompt, complianceNote }
//   → [if !skipImage] fal.ai (fal-ai/recraft-v3, 1024x1024)
//   → return { headline, primaryText, cta, imageUrl?, complianceNote }

const SYSTEM_PROMPT = `You are writing ad copy for Lunia Life, a premium wellness supplement brand.
Brand voice: warm, confident, non-alarmist, evidence-informed.

RULES (non-negotiable):
- No medical claims ("cures", "treats", "heals", "prevents")
- Use softeners: "may support", "designed to", "helps promote"
- No em dashes (—). Use commas or periods instead.
- Headline: ≤27 characters including spaces
- Primary text: ≤125 characters including spaces
- Tone must reflect the angle and emotion provided
- Image prompt: extract ONLY the lifestyle context from the competitor copy (e.g., "morning routine", "post-workout recovery"). Ignore all competitor brand names, product names, and specific claims. Image must feature Lunia Life packaging in a clean lifestyle setting.

Output ONLY valid JSON. No preamble, no explanation, no markdown:
{
  "headline": "...",
  "primaryText": "...",
  "cta": "Shop Now",
  "imagePrompt": "clean product shot of a white Lunia Life supplement bottle on ...",
  "complianceNote": ""
}

cta must be exactly one of: "Shop Now", "Learn More", "Get Offer"
Choose cta based on copy intent: discount/urgency → "Get Offer", educational/story → "Learn More", product/conversion → "Shop Now"
complianceNote: empty string if clean, otherwise describe what was flagged and why.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const competitorCopy: string = (body.competitorCopy ?? "").trim();
    const angle: string = (body.angle ?? "").trim();
    const emotion: string = (body.emotion ?? "").trim();
    const skipImage: boolean = body.skipImage === true;

    if (!competitorCopy) {
      return Response.json({ error: "competitorCopy is required" }, { status: 400 });
    }
    if (competitorCopy.length > 2000) {
      return Response.json({ error: "competitorCopy must be ≤2000 characters" }, { status: 400 });
    }

    const userMessage = [
      "Rewrite this competitor ad in the Lunia Life brand voice.",
      angle ? `Angle: ${angle}` : null,
      emotion ? `Emotion: ${emotion}` : null,
      "",
      "COMPETITOR AD COPY:",
      competitorCopy,
    ].filter(Boolean).join("\n");

    // Step 1: Claude rewrite + compliance check
    console.log("[api/ads/generate] Claude call start", { angle, emotion, copyLength: competitorCopy.length });
    let claudeResult: { headline: string; primaryText: string; cta: AdCTA; imagePrompt: string; complianceNote: string } | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 512,
          system: attempt === 1 ? SYSTEM_PROMPT : SYSTEM_PROMPT + "\n\nCRITICAL: Your previous response was not valid JSON. Output ONLY the JSON object, nothing else.",
          messages: [{ role: "user", content: userMessage }],
        });

        const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
        claudeResult = JSON.parse(cleaned);
        break;
      } catch (err) {
        console.error(`[api/ads/generate] Claude attempt ${attempt} failed`, err);
        if (attempt === 2) {
          // Branded fallback on second failure
          claudeResult = {
            headline: "Discover Lunia Life",
            primaryText: "Premium wellness, designed to support your goals.",
            cta: "Learn More",
            imagePrompt: "clean product shot of a white Lunia Life supplement bottle on a marble countertop with soft morning light",
            complianceNote: "",
          };
        }
      }
    }

    if (!claudeResult) {
      return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
    }

    console.log("[api/ads/generate] Claude OK", { headline: claudeResult.headline, complianceNote: claudeResult.complianceNote });

    // Step 2: fal.ai image generation (skip if skipImage flag)
    let imageUrl: string | null = null;
    if (!skipImage) {
      try {
        const imagePrompt = (claudeResult.imagePrompt ?? "").slice(0, 300);
        console.log("[api/ads/generate] fal.ai call start", { promptLength: imagePrompt.length });

        const result = await fal.subscribe("fal-ai/recraft-v3", {
          input: {
            prompt: imagePrompt,
            image_size: { width: 1024, height: 1024 },
            style: "realistic_image",
            num_images: 1,
          },
          logs: false,
        });

        imageUrl = (result.data as { images?: { url: string }[] })?.images?.[0]?.url ?? null;
        if (!imageUrl) throw new Error("No image URL in fal.ai response");
        console.log("[api/ads/generate] fal.ai OK");
      } catch (err) {
        console.error("[api/ads/generate] fal.ai failed", err);
        // Return copy-only — imageUrl stays null, client keeps existing image if skipImage
      }
    }

    return Response.json({
      headline: claudeResult.headline,
      primaryText: claudeResult.primaryText,
      cta: claudeResult.cta,
      imageUrl,
      complianceNote: claudeResult.complianceNote ?? "",
    });
  } catch (err) {
    console.error("[api/ads/generate] error", err);
    return Response.json({ error: "Generation failed — please try again" }, { status: 500 });
  }
}
