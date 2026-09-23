import { getCarouselRows, saveCarouselRows } from "@/lib/kv";

export const dynamic = "force-dynamic";

/** The row library. One row is one six-slide carousel; see
 *  src/lib/carousel-rows.ts for what a row is and where it comes from. */
export async function GET() {
  const rows = await getCarouselRows();
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Empty the library, so the sheet can be imported clean.
 *
 * Import is a merge on the subject line: it keeps each row's id, chosen hook,
 * status and build history, which is what you want when the sheet is edited
 * and what you do not want when it is replaced. This is the other door. It
 * clears the build stamps too, so a re-import starts every row unbuilt.
 *
 * Saved decks are not touched. A deck built from a row is its own record and
 * survives the row it came from.
 */
export async function DELETE() {
  const existing = await getCarouselRows().catch(() => []);
  await saveCarouselRows([]);
  console.log(`[carousel-rows] library emptied: ${existing.length} rows deleted`);
  return Response.json({ ok: true, deleted: existing.length });
}
