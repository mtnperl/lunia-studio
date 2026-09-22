import { checkRateLimit, getCarouselRows } from "@/lib/kv";
import { isBuildable, type CarouselRow } from "@/lib/carousel-rows";

export const maxDuration = 30;

// How many suggestions to surface per click.
const SUGGESTION_COUNT = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * What to shoot next: buildable rows nobody has used yet, one per carousel
 * type so a click does not return six variations on the same theme.
 *
 * This used to pick from the subject library and filter by which frozen format
 * a subject fitted. Rows carry their own six slides, so the only questions
 * left are whether the row was approved and whether it has been built.
 */
export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const rows = await getCarouselRows().catch(() => [] as CarouselRow[]);
    const unused = rows.filter((r) => isBuildable(r) && !r.usedAt);
    if (unused.length === 0) return Response.json([]);

    const byType = new Map<string, CarouselRow[]>();
    for (const r of unused) {
      const list = byType.get(r.carouselType) ?? [];
      list.push(r);
      byType.set(r.carouselType, list);
    }
    // Highest evidence first inside a type, so a click surfaces the strongest
    // row of each, then shuffle the types so it is not the same six each time.
    for (const [, list] of byType) list.sort((a, b) => b.evidence - a.evidence || b.story - a.story);
    const picked = shuffle([...byType.keys()])
      .slice(0, SUGGESTION_COUNT)
      .map((t) => byType.get(t)![0]);

    return Response.json(
      picked.map((r) => ({
        id: r.id,
        title: r.subject,
        category: r.carouselType,
        evidence: r.evidence,
        story: r.story,
      })),
    );
  } catch (err) {
    console.error("[api/carousel/suggestions]", err);
    return Response.json({ error: "Failed to load suggestions" }, { status: 500 });
  }
}
