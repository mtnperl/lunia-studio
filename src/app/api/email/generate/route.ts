import { anthropic } from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { EmailAnatomy, EmailSection, StylePreset } from "@/lib/types";
import { randomUUID } from "crypto";

export const maxDuration = 60;

// Strip HTML artifacts from pasted email text before sending to Claude
function preprocessEmailText(text: string): string {
  return text
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Collapse unsubscribe / footer lines
    .replace(/unsubscribe.*$/gim, "")
    .replace(/privacy policy.*$/gim, "")
    .replace(/you received this.*$/gim, "")
    .replace(/view in browser.*$/gim, "")
    // Collapse multiple whitespace/newlines
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LUNIA_VOICE_SPEC = `Lunia Life brand voice: Aspirational, minimal, wellness-science grounded. Tone: calm confidence. No hype. No FOMO manipulation. Language: clear, direct, sophisticated. Target reader: health-conscious adult, 28-45, optimizing their life. Write like a trusted expert friend, not a marketer.`;

const SCORING_RUBRIC = `Score this email 1-10 using this fixed rubric (sum of points):
- Hook strength (0-2 pts): 0=generic opener/no hook, 1=decent hook, 2=strong pattern interrupt
- CTA clarity (0-2 pts): 0=buried or multiple CTAs, 1=one clear CTA, 2=one clear CTA with urgency or reason
- Visual hierarchy (0-2 pts): 0=wall of text, 1=some structure, 2=scannable sections with clear flow
- Brand voice fit (0-2 pts): 0=generic or hype-heavy, 1=decent voice, 2=distinctive voice consistent throughout
- P.S. line (0-1 pt): 0=missing, 1=present and purposeful
Always set scoreDiagnosis to one sentence naming the highest and lowest scoring elements.`;

const STYLE_CONTEXT: Record<StylePreset, string> = {
  "minimal-modern": "Minimal-modern style: short sentences, generous white space, no filler words. Every word earns its place. Aspirational but grounded.",
  "story-driven": "Story-driven style: open with a specific personal moment or observation. Let the narrative carry the reader to the product. Conversational but purposeful.",
  "bold-product-first": "Bold product-first style: lead with the product benefit immediately. Direct, punchy, confident. Numbers and specifics over vague claims.",
};

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
    const competitorText: string = body.competitorText ?? "";
    const imageData: string[] = Array.isArray(body.imageData) ? body.imageData : [];
    const stylePreset: StylePreset = body.stylePreset ?? "minimal-modern";

    const hasImages = imageData.length > 0;
    const hasText = competitorText.trim().length >= 100;

    if (!hasImages && !hasText) {
      return Response.json({ error: "Paste at least 100 characters of email text, or include a screenshot." }, { status: 400 });
    }

    if (!["minimal-modern", "story-driven", "bold-product-first"].includes(stylePreset)) {
      return Response.json({ error: "Invalid stylePreset" }, { status: 400 });
    }

    // Preprocess and truncate text (may be empty if image-only)
    const cleaned = hasText ? preprocessEmailText(competitorText).slice(0, 8000) : "";

    const analysisPrompt = `${LUNIA_VOICE_SPEC}

${SCORING_RUBRIC}

Style for your Lunia remix: ${STYLE_CONTEXT[stylePreset]}

${hasImages ? "Analyze the competitor email screenshot(s) provided. Examine the visual layout, image-to-text ratio, design hierarchy, copy, subject/preheader if visible, and any CTAs." : ""}
${hasText ? `Also analyze the email text below:\n\n<competitor_email>\n${cleaned}\n</competitor_email>` : ""}

Produce a complete Lunia remix. Return ONLY valid JSON matching this exact schema — no markdown, no explanation:

{
  "anatomy": {
    "subjectFormula": "string — describe the subject line formula (e.g. 'Question + benefit promise')",
    "preheaderStrategy": "string — what the preheader does (e.g. 'Extends subject curiosity')",
    "visualStructure": "string — describe visual/text layout (e.g. 'Hero image → 3-column grid → single CTA')",
    "inferredImageRatio": "string — one of: heavy image | balanced | text-first",
    "copyFramework": "string — copywriting framework used (e.g. 'PAS', 'AIDA', 'Before/After/Bridge')",
    "ctaType": "string — describe the CTA mechanic (e.g. 'Single button, benefit-led')",
    "hasPsLine": boolean
  },
  "topic": "string — 4-8 word topic/theme of this email (e.g. 'Morning energy optimization with adaptogens')",
  "score": number,
  "scoreDiagnosis": "string — one sentence, name highest and lowest scoring elements",
  "frameworkLabel": "string — concise framework name (e.g. 'Pattern Interrupt + PAS + Single CTA')",
  "sendTimingChip": "string — send timing pattern for this email type (e.g. 'Educational → Tue/Wed 9am' or 'Promotional → Thu 11am')",
  "generated": {
    "subjectLines": ["string", "string", "string"],
    "preheader": "string",
    "sections": [
      {
        "heading": "optional string",
        "body": "string",
        "imagePrompt": "string — a Recraft V3 image generation prompt for a wellness lifestyle image that fits this section. Photorealistic. 1024x1280 portrait. Describe scene, lighting, mood. No text in image. Empty string if section is abstract/no visual fit."
      }
    ],
    "cta": "string",
    "ps": "string — a purposeful P.S. line, always include"
  }
}

Generate 3 to 5 sections. Each section must have an imagePrompt (or empty string if not applicable).`;

    // Build message content — images first, then text prompt
    type AllowedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const ALLOWED_MEDIA_TYPES = new Set<string>(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    type ImageBlock = { type: "image"; source: { type: "base64"; media_type: AllowedMediaType; data: string } };
    type TextBlock = { type: "text"; text: string };
    const messageContent: Array<ImageBlock | TextBlock> = [];

    for (const dataUrl of imageData) {
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx === -1) continue;
      const header = dataUrl.slice(0, commaIdx);
      const data = dataUrl.slice(commaIdx + 1);
      const detected = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
      const mediaType: AllowedMediaType = ALLOWED_MEDIA_TYPES.has(detected)
        ? (detected as AllowedMediaType)
        : "image/png";
      messageContent.push({ type: "image", source: { type: "base64", media_type: mediaType, data } });
    }
    messageContent.push({ type: "text", text: analysisPrompt });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: messageContent }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON — strip any accidental markdown fences
    const jsonText = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

    let parsed: {
      topic: string;
      anatomy: EmailAnatomy;
      score: number;
      scoreDiagnosis: string;
      frameworkLabel: string;
      sendTimingChip: string;
      generated: {
        subjectLines: string[];
        preheader: string;
        sections: Array<{ heading?: string; body: string; imagePrompt?: string }>;
        cta: string;
        ps: string;
      };
    };

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[api/email/generate] JSON parse failed:", raw.slice(0, 500));
      return Response.json({ error: "Analysis failed — try with a longer email" }, { status: 422 });
    }

    if (!parsed.generated?.sections?.length) {
      return Response.json({ error: "Could not parse sections — try with more text" }, { status: 422 });
    }

    // Assign server-side stable IDs to each section
    const sectionsWithIds: EmailSection[] = parsed.generated.sections.map(s => ({
      id: randomUUID(),
      heading: s.heading,
      body: s.body,
      imagePrompt: s.imagePrompt ?? "",
    }));

    return Response.json({
      ...parsed,
      generated: {
        ...parsed.generated,
        sections: sectionsWithIds,
      },
    });
  } catch (err) {
    console.error("[api/email/generate]", err);
    return Response.json({ error: "Generation failed" }, { status: 500 });
  }
}
