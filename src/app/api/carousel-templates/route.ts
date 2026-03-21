import { put } from "@vercel/blob";
import { anthropic } from "@/lib/anthropic";
import { getCarouselTemplates, saveCarouselTemplate } from "@/lib/kv";
import { BrandStyle, CarouselTemplate, CarouselTemplateImage } from "@/lib/types";

export const maxDuration = 60;

export async function GET() {
  const templates = await getCarouselTemplates();
  return Response.json(templates);
}

const PALETTE_PROMPT = `Analyze these carousel slide images and extract the brand color palette.
Return ONLY valid JSON, no other text:
{"background":"#hex","hookBackground":"#hex","headline":"#hex","hookHeadline":"#hex","body":"#hex","accent":"#hex","secondary":"#hex"}

Definitions:
- background: the main slide background color (content slides)
- hookBackground: the cover/hook slide background (typically dark or bold)
- headline: headline text color on content slides
- hookHeadline: headline text color on the hook/cover slide (typically light or white)
- body: body paragraph text color
- accent: primary brand accent color (buttons, highlights, decorative elements)
- secondary: muted/secondary text color (citations, captions)

Extract the exact hex codes visible in the images. Return only the JSON.`;

async function extractBrandStyle(images: CarouselTemplateImage[]): Promise<BrandStyle | undefined> {
  if (images.length === 0) return undefined;
  try {
    type ImageBlock = { type: "image"; source: { type: "url"; url: string } };
    type TextBlock = { type: "text"; text: string };
    const content: (ImageBlock | TextBlock)[] = [
      ...images.slice(0, 4).map((img): ImageBlock => ({
        type: "image",
        source: { type: "url", url: img.url },
      })),
      { type: "text", text: PALETTE_PROMPT },
    ];
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{ role: "user", content }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(text) as BrandStyle;
  } catch (e) {
    console.error("[carousel-templates] palette extraction failed:", e);
    return undefined;
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return Response.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 503 });
    }
    const form = await req.formData();
    const name = (form.get("name") as string)?.trim();
    if (!name) return Response.json({ error: "Name required" }, { status: 400 });

    const description = (form.get("description") as string)?.trim() || undefined;
    const contentDensity = (form.get("contentDensity") as string) || "medium";
    const styleNotes = (form.get("styleNotes") as string)?.trim() || undefined;
    const files = form.getAll("images") as File[];

    if (files.length === 0) return Response.json({ error: "At least one image required" }, { status: 400 });

    const images: CarouselTemplateImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const slideName = (form.get(`slideName_${i}`) as string)?.trim() || `Slide ${i + 1}`;
      const blob = await put(`carousel-templates/${Date.now()}-${i}-${file.name}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      images.push({ id: crypto.randomUUID(), url: blob.url, slideName });
    }

    // Extract brand color palette from uploaded slides
    const brandStyle = await extractBrandStyle(images);
    console.log("[carousel-templates] extracted brandStyle:", brandStyle);

    const template: CarouselTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      contentDensity: contentDensity as CarouselTemplate["contentDensity"],
      styleNotes,
      images,
      brandStyle,
      uploadedAt: new Date().toISOString(),
    };

    await saveCarouselTemplate(template);
    return Response.json(template);
  } catch (err) {
    console.error("[api/carousel-templates POST]", err);
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}
