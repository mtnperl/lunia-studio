import { checkRateLimit, getSubjects } from "@/lib/kv";
import type { Subject } from "@/lib/types";

export const maxDuration = 30;

// How many topic suggestions to surface per click.
const SUGGESTION_COUNT = 6;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";
  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json(
      { error: "Too many requests. Please try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const subjects = await getSubjects().catch(() => [] as Subject[]);
    // Never resurface a subject that's already been used for a carousel.
    const unused = subjects.filter((s) => !s.usedAt);

    if (unused.length === 0) {
      return Response.json([]);
    }

    // Group by category, shuffled within each category so repeated clicks
    // don't always surface the same item first.
    const byCategory = new Map<string, Subject[]>();
    for (const s of unused) {
      const list = byCategory.get(s.category) ?? [];
      list.push(s);
      byCategory.set(s.category, list);
    }
    const categories = shuffle([...byCategory.keys()]);
    for (const cat of categories) byCategory.set(cat, shuffle(byCategory.get(cat)!));

    // One subject per category, from as many distinct categories as possible —
    // never two suggestions from the same category unless the library has
    // fewer than SUGGESTION_COUNT categories with unused subjects left.
    const picked: Subject[] = categories
      .slice(0, SUGGESTION_COUNT)
      .map((cat) => byCategory.get(cat)![0]);

    return Response.json(
      picked.map((s) => ({ id: s.id, title: s.text, category: s.category }))
    );
  } catch (err) {
    console.error("[api/carousel/suggestions]", err);
    return Response.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
