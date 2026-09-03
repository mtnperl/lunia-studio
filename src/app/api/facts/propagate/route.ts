import { getCarousels, getCampaignEmails, getFacts } from "@/lib/kv";
import { findCarriers, numericSignatures } from "@/lib/facts";

export const dynamic = "force-dynamic";

/** Where does a value still live? `?factId=` hunts the fact's previous
 *  statements (the old, wrong values); `?q=` hunts a literal string. */
export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const factId = url.searchParams.get("factId");
    const q = url.searchParams.get("q");
    let signatures: string[] = [];
    if (factId) {
      const fact = (await getFacts()).find((f) => f.id === factId);
      if (!fact) return Response.json({ error: "Fact not found" }, { status: 404 });
      const old = (fact.previous ?? []).flatMap((p) => numericSignatures(p.statement));
      const cur = new Set(numericSignatures(fact.statement));
      signatures = [...new Set(old)].filter((s) => !cur.has(s));
      if (signatures.length === 0) return Response.json({ signatures: [], carriers: [], note: "No earlier value to hunt. Edit the statement first, or search a literal with q." });
    } else if (q && q.trim().length >= 3) {
      signatures = [q.trim()];
    } else {
      return Response.json({ error: "Pass factId or q" }, { status: 400 });
    }
    const [carousels, emails] = await Promise.all([getCarousels(), getCampaignEmails()]);
    return Response.json({ signatures, carriers: findCarriers(signatures, carousels, emails) });
  } catch (err) {
    console.error("[api/facts/propagate] GET", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
