import { randomUUID } from "crypto";
import { getAssets, patchAssetDetails } from "@/lib/kv";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!Array.isArray(body.ids) || body.ids.length < 2 || body.ids.length > 50 || body.ids.some((id: unknown) => typeof id !== "string")) {
      return Response.json({ error: "Select 2–50 image versions to group." }, { status: 400 });
    }
    const ids = [...new Set<string>(body.ids)];
    const assets = await getAssets();
    if (ids.length < 2 || ids.some((id) => !assets.some((a) => a.id === id))) {
      return Response.json({ error: "Selected images were not found." }, { status: 400 });
    }
    const familyId = randomUUID();
    await patchAssetDetails(ids.map((id) => ({ id, familyId })));
    return Response.json({ familyId });
  } catch {
    return Response.json({ error: "Could not group images." }, { status: 500 });
  }
}
