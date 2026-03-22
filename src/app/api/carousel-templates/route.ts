import { put } from "@vercel/blob";
import { getCarouselTemplates, saveCarouselTemplate } from "@/lib/kv";
import { CarouselTemplate, CarouselTemplateImage } from "@/lib/types";

export async function GET() {
  const templates = await getCarouselTemplates();
  return Response.json(templates);
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

    const template: CarouselTemplate = {
      id: crypto.randomUUID(),
      name,
      description,
      contentDensity: contentDensity as CarouselTemplate["contentDensity"],
      styleNotes,
      images,
      uploadedAt: new Date().toISOString(),
    };

    await saveCarouselTemplate(template);
    return Response.json(template);
  } catch (err) {
    console.error("[api/carousel-templates POST]", err);
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}
