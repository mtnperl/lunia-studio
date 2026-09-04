import { randomUUID } from "crypto";
import { deleteCarouselLook, getCarouselLooks, saveCarouselLook } from "@/lib/kv";
import type { CarouselLook, CarouselLookSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const KEYS: (keyof CarouselLookSettings)[] = [
  "stylePreset", "imageStyle", "reelsMode", "darkBackground", "slideBgColor", "logoScale", "arrowScale",
  "citationFontSize", "headlineScale", "bodyScale", "iconScale", "showLuniaLifeWatermark", "hookOverlays",
  "showSlideArrows", "showSlideNumbers", "showCitationBars", "hookHeadlineWeight", "contentBgOverlayOpacity",
];

/** Keep only the known style keys, so a look can never smuggle content. */
function pickSettings(raw: unknown): CarouselLookSettings {
  const out: Record<string, unknown> = {};
  if (raw && typeof raw === "object") for (const k of KEYS) { const v = (raw as Record<string, unknown>)[k]; if (v !== undefined) out[k] = v; }
  return out as CarouselLookSettings;
}

export async function GET(): Promise<Response> {
  try { return Response.json(await getCarouselLooks()); }
  catch (err) { console.error("[carousel-v2/looks] GET", err); return Response.json({ error: "Failed to load looks" }, { status: 500 }); }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim().slice(0, 60);
    if (!name) return Response.json({ error: "Name the look first." }, { status: 400 });
    const look: CarouselLook = { id: randomUUID(), name, createdAt: new Date().toISOString(), settings: pickSettings(body.settings) };
    await saveCarouselLook(look);
    return Response.json(look);
  } catch (err) { console.error("[carousel-v2/looks] POST", err); return Response.json({ error: "Failed to save the look" }, { status: 500 }); }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await deleteCarouselLook(id);
    return Response.json({ ok: true });
  } catch (err) { console.error("[carousel-v2/looks] DELETE", err); return Response.json({ error: "Failed to delete the look" }, { status: 500 }); }
}
