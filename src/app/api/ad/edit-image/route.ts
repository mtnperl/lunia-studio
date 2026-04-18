import { editAdImage, type AdAspectRatio } from "@/lib/fal";
import { checkRateLimit } from "@/lib/kv";

export const maxDuration = 60;

const VALID_ASPECTS = new Set<AdAspectRatio>(["1:1", "4:5"]);

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "ad-image");
  if (!allowed) {
    return Response.json(
      { error: "Too many image requests. Please try again in an hour." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const imageUrl: string = typeof body.imageUrl === "string" ? body.imageUrl : "";
    const editInstruction: string =
      typeof body.editInstruction === "string" ? body.editInstruction.trim() : "";
    const aspect = body.aspect as AdAspectRatio;

    if (!imageUrl.startsWith("http")) {
      return Response.json({ error: "valid imageUrl required" }, { status: 400 });
    }
    if (!editInstruction) {
      return Response.json({ error: "editInstruction required" }, { status: 400 });
    }
    if (editInstruction.length > 500) {
      return Response.json(
        { error: "editInstruction too long (max 500 chars)" },
        { status: 400 },
      );
    }
    if (!VALID_ASPECTS.has(aspect)) {
      return Response.json({ error: "aspect must be 1:1 or 4:5" }, { status: 400 });
    }

    const url = await editAdImage({ imageUrl, editInstruction, aspect });
    return Response.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/ad/edit-image]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
