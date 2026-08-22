// Layouts the user banked from their own campaigns.
//
// Stores STRUCTURE only — an ordered list of block kinds and their layout
// options. No copy, and no guidance text: the instruction sent to the model is
// derived from the structure at prompt time, so nothing a human typed ever
// reaches an LLM prompt.
import { getSavedShapes, saveSavedShape, deleteSavedShape } from "@/lib/kv";
import { CAMPAIGN_BLOCK_KINDS } from "@/lib/types";
import type { ShapeBlockRecord, SavedShape } from "@/lib/campaign-shapes";
import { randomUUID } from "crypto";

const MAX_BLOCKS = 24;

/** Accept only fields we know, with values we recognise. A saved shape is
 *  replayed into a prompt, so its record is validated rather than trusted. */
function sanitizeBlocks(input: unknown): ShapeBlockRecord[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const kinds = new Set<string>(CAMPAIGN_BLOCK_KINDS);
  const out: ShapeBlockRecord[] = [];
  for (const raw of input.slice(0, MAX_BLOCKS)) {
    if (!raw || typeof raw !== "object") return null;
    const b = raw as Record<string, unknown>;
    if (typeof b.kind !== "string" || !kinds.has(b.kind)) return null;
    const rec: ShapeBlockRecord = { kind: b.kind as ShapeBlockRecord["kind"] };
    if (b.imagePosition === "left" || b.imagePosition === "right") rec.imagePosition = b.imagePosition;
    if (b.headerStyle === "card" || b.headerStyle === "pill") rec.headerStyle = b.headerStyle;
    // A colour role, not free text: it is interpolated into the derived guidance.
    if (typeof b.bulletColor === "string" && /^[a-z]{2,12}$/.test(b.bulletColor)) rec.bulletColor = b.bulletColor;
    if (typeof b.emphasisRow === "number" && Number.isInteger(b.emphasisRow) && b.emphasisRow >= 0) rec.emphasisRow = b.emphasisRow;
    if (typeof b.cells === "number" && Number.isInteger(b.cells) && b.cells > 0 && b.cells <= 12) rec.cells = b.cells;
    out.push(rec);
  }
  return out;
}

export async function GET(): Promise<Response> {
  try {
    return Response.json(await getSavedShapes());
  } catch (err) {
    console.error("[api/campaign/shapes] GET", err);
    return Response.json({ error: "Failed to load saved shapes" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const name: string = (body.name ?? "").trim().slice(0, 60);
    if (!name) return Response.json({ error: "Name your shape first." }, { status: 400 });

    const blocks = sanitizeBlocks(body.blocks);
    if (!blocks) return Response.json({ error: "This email has no layout to save." }, { status: 400 });

    const shape: SavedShape = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      theme: body.theme === "cream" || body.theme === "navy" ? body.theme : undefined,
      blocks,
    };
    await saveSavedShape(shape);
    return Response.json(shape);
  } catch (err) {
    console.error("[api/campaign/shapes] POST", err);
    return Response.json({ error: "Failed to save the shape" }, { status: 500 });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
    await deleteSavedShape(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/campaign/shapes] DELETE", err);
    return Response.json({ error: "Failed to delete the shape" }, { status: 500 });
  }
}
