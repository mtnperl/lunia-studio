import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

export async function POST(req: Request) {
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
    const topic: string = body.topic ?? "";
    const emailGoal: string = body.emailGoal ?? "";
    const role: "hero" | "value" | "summary" = body.role ?? "hero";

    if (!topic.trim()) {
      return Response.json({ error: "topic is required" }, { status: 400 });
    }

    if (!["hero", "value", "summary"].includes(role)) {
      return Response.json({ error: "role must be hero, value, or summary" }, { status: 400 });
    }

    const roleInstructions: Record<string, string> = {
      hero: `HERO panel — the entry point. Grabs attention. Subject line as headline, strong sub-line, one CTA. body should be empty string.
- subject: Main headline, bold, 5-9 words, pattern interrupt or curiosity gap
- subSubject: Sub-headline, 10-16 words, expands the hook, makes the value concrete
- body: "" (empty)
- cta: 2-4 words, benefit-led, no generic "click here"
- imagePrompt: Detailed Recraft V3 prompt: wellness lifestyle scene, no text in image, photorealistic or illustrated, describe scene + lighting + mood. 1024x1280 portrait orientation.`,
      value: `VALUE panel — the substance. Product or information in context of the topic. Supports the claim with a short body. cta should be empty string.
- subject: Value proposition headline, 5-9 words
- subSubject: Expansion line, 10-16 words
- body: 2-3 sentences supporting the value prop in Lunia voice. Evidence-based, no filler. Read like a trusted expert, not a marketer.
- cta: "" (empty)
- imagePrompt: Detailed Recraft V3 prompt: product in natural lifestyle context, or supporting visual. No text in image. 1024x1280 portrait.`,
      summary: `SUMMARY panel — the close. Reinforces the benefit, drives the click. Final CTA. body should be empty string.
- subject: Closing headline, 5-9 words, reinforce the benefit
- subSubject: Reinforcement line, 10-16 words
- body: "" (empty)
- cta: Final CTA, 2-4 words
- imagePrompt: Detailed Recraft V3 prompt: aspirational outcome or lifestyle result. No text in image. 1024x1280 portrait.`,
    };

    const prompt = `You are an expert email designer for Lunia Life, a premium sleep + wellness supplement brand.

Lunia voice: direct, evidence-based, calm confidence. No hype. No exclamation marks. Think AG1 meets LMNT.

Regenerate copy for a single email panel.

Email topic: ${topic.trim()}
${emailGoal.trim() ? `Email goal / context: ${emailGoal.trim()}` : ""}

Panel role: ${role.toUpperCase()}
${roleInstructions[role]}

Return ONLY valid JSON with this exact structure (no markdown, no code fences):

{
  "subject": "...",
  "subSubject": "...",
  "body": "...",
  "cta": "...",
  "imagePrompt": "..."
}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: {
      subject: string;
      subSubject: string;
      body: string;
      cta: string;
      imagePrompt: string;
    };

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[api/email/regenerate-panel] JSON parse failed:", raw.slice(0, 400));
      return Response.json({ error: "Generation failed — please try again" }, { status: 422 });
    }

    return Response.json({
      subject: parsed.subject ?? "",
      subSubject: parsed.subSubject ?? "",
      body: parsed.body ?? "",
      cta: parsed.cta ?? "",
      imagePrompt: parsed.imagePrompt ?? "",
    });
  } catch (err) {
    console.error("[api/email/regenerate-panel]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
