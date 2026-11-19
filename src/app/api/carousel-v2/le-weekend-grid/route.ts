import { fetchIgGrid } from "@/lib/instagram-grid";

export const maxDuration = 60;

/** The live Instagram grid for the Le week-end studio. */
export async function GET(): Promise<Response> {
  try {
    const g = await fetchIgGrid(9);
    return Response.json({ username: g.username, thumbs: g.thumbs, timestamps: g.tiles.map((t) => t.timestamp) });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not read Instagram" }, { status: 502 });
  }
}
