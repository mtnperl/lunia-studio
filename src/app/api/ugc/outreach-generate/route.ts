import { z } from "zod";
import { createContentMessage } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { clientIp, logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  creatorName: z.string().min(1).max(120),
  angle: z.string().max(80).optional(),
  conceptLabel: z.string().max(200).optional(),
  briefTitle: z.string().max(200).optional(),
  briefUrl: z.string().url().optional(),
  deliverables: z.string().max(1000).optional(),
  notes: z.string().max(500).optional(),
});

const SYSTEM_PROMPT = `You are writing a direct message (DM) from the Lunia Life marketing team to a UGC creator we want to work with.

Lunia Life is a hormone-support supplement brand for women in perimenopause and menopause (ages 35-60). We sell directly to consumers and build trust through real women's stories.

Write a message that:
- Sounds like a real human wrote it, not a corporate template
- Is warm, specific, and conversational (DM style, not email)
- Mentions who we are and why we reached out to THIS creator
- Describes the concept/angle clearly but concisely
- States what we're asking them to create (deliverables)
- Mentions we'll send the full brief with all details
- Ends with a clear next step ("Let me know if you're interested and I'll send over the brief!")
- Is 150-250 words

Do NOT use:
- Formal salutations like "I hope this message finds you well"
- Bullet points or headers
- Em dashes
- Overly promotional language
- Drug claims (cure, treat, prevent, diagnose)

Return plain text only. No markdown.`;

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/outreach-generate", "generate");
  const ip = clientIp(req);
  const allowed = await checkRateLimit(ip, "ugc-caption");
  if (!allowed) {
    logExit("/api/ugc/outreach-generate", "generate", start, 429);
    return Response.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/outreach-generate", "generate", start, 400);
      return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }

    const { creatorName, angle, conceptLabel, briefTitle, briefUrl, deliverables, notes } = parsed.data;

    const userPrompt = [
      `Creator name: ${creatorName}`,
      angle ? `Content angle: ${angle}` : null,
      conceptLabel ? `Concept: ${conceptLabel}` : null,
      briefTitle ? `Brief title: ${briefTitle}` : null,
      deliverables ? `Deliverables: ${deliverables}` : null,
      briefUrl ? `Brief link (include this in the message): ${briefUrl}` : null,
      notes ? `Additional notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await createContentMessage({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    logExit("/api/ugc/outreach-generate", "generate", start, 200);
    return Response.json({ message: text });
  } catch (err) {
    console.error("[api/ugc/outreach-generate] POST", err);
    logExit("/api/ugc/outreach-generate", "generate", start, 500);
    return Response.json({ error: "Outreach generation failed" }, { status: 500 });
  }
}
