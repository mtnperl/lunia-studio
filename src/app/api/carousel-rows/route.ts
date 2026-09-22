import { getCarouselRows } from "@/lib/kv";

export const dynamic = "force-dynamic";

/** The row library. One row is one six-slide carousel; see
 *  src/lib/carousel-rows.ts for what a row is and where it comes from. */
export async function GET() {
  const rows = await getCarouselRows();
  return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
}
