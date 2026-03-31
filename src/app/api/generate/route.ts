import { anthropic as client } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";

const SYSTEM_PROMPT = `You are a UGC scriptwriter for Lunia Life, a sleep supplement brand.

Product: Lunia Restore — Magnesium Bisglycinate, L-Theanine, Apigenin. Melatonin-free. Under $1/serving. 4.9 stars. 78,000+ customers.

Brand rules:
- No em dashes. Use commas or short sentences instead.
- No medical claims. Use language like: "may support", "helps promote", "shown in studies", "associated with"
- Tone: dry, science-forward, understated, never cheesy or hypey
- Never exaggerate. Let the product data speak.

Output EXACTLY this structure with no deviations:

HOOKS
Hook 1 [type: credibility]:
[hook text, punchy, max 15 words]

Hook 2 [type: pain]:
[hook text, punchy, max 15 words]

Hook 3 [type: curiosity]:
[hook text, punchy, max 15 words]

SCRIPT
[HOOK]
[hook placeholder -- creator will choose]

[BODY]
[3-5 short paragraphs, 2-3 sentences each, conversational, science-backed where relevant]

[CTA]
[1-2 lines, soft call to action, no hard sell]

FILMING NOTES
Setting: [specific suggestion]
Energy: [calm/energetic/conversational]
Key visual: [one specific b-roll moment]`;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again in an hour." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { topic, persona, format, angle, context, creator, subjectNotes, instructions } = await req.json();

    const userMessage = [
      topic ? `Topic: ${topic}` : "",
      `Persona: ${persona}`,
      `Format: ${format}`,
      `Angle: ${angle}`,
      subjectNotes ? `Subject background: ${subjectNotes}` : "",
      instructions ? `Specific instructions: ${instructions}` : "",
      context ? `Additional context: ${context}` : "",
      creator ? `Creator: ${creator}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[api/generate]", err);
    return new Response("Generation failed", { status: 500 });
  }
}
