import { anthropic } from "@/lib/anthropic";
import { deleteCarouselTemplate, getCarouselTemplates, saveCarouselTemplate } from "@/lib/kv";
import { BrandStyle, CarouselTemplate, CarouselTemplateImage } from "@/lib/types";

export const maxDuration = 60;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteCarouselTemplate(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
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

// PATCH — extract brand palette and update the template
export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const templates = await getCarouselTemplates();
    const template = templates.find((t: CarouselTemplate) => t.id === id);
    if (!template) return Response.json({ error: "Template not found" }, { status: 404 });

    const brandStyle = await extractBrandStyle(template.images);
    if (!brandStyle) return Response.json({ error: "Palette extraction failed" }, { status: 500 });

    const updated: CarouselTemplate = { ...template, brandStyle };
    await saveCarouselTemplate(updated);
    console.log("[carousel-templates] extracted brandStyle for", id, brandStyle);
    return Response.json(updated);
  } catch (err) {
    console.error("[api/carousel-templates PATCH]", err);
    return Response.json({ error: "Analysis failed" }, { status: 500 });
  }
}
