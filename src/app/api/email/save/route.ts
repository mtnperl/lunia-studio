import { saveEmail } from "@/lib/kv";
import { SavedEmail } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      competitorText, stylePreset, anatomy, score, scoreDiagnosis,
      frameworkLabel, sendTimingChip, generated, imageUrl, imagePrompt,
    } = body;

    if (!competitorText || !stylePreset || !anatomy || score == null || !generated) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email: SavedEmail = {
      id: randomUUID(),
      competitorText,
      stylePreset,
      anatomy,
      score,
      scoreDiagnosis,
      frameworkLabel,
      sendTimingChip,
      generated,
      imageUrl,
      imagePrompt,
      savedAt: new Date().toISOString(),
    };

    await saveEmail(email);
    return Response.json({ id: email.id });
  } catch (err) {
    console.error("[api/email/save]", err);
    return Response.json({ error: "Failed to save email" }, { status: 500 });
  }
}
