import { kv } from "@/lib/kv";
import { resolveRangeParams } from "@/lib/analytics-utils";
import { fetchSimpleFin, SimpleFinError, type SimpleFinFetchResult } from "@/lib/simplefin-client";

export const maxDuration = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const resolved = resolveRangeParams(url, { defaultDays: 30, maxDays: 400 });
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 400 });
  }
  const { since, until } = resolved;

  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) {
    return Response.json(
      {
        error: "SimpleFIN not connected",
        setup: "Generate an Access URL at simplefin.org and set SIMPLEFIN_ACCESS_URL in your environment.",
      },
      { status: 503 }
    );
  }

  const cacheKey = `simplefin:v1:${since}_${until}`;
  const bust = url.searchParams.get("bust") === "1";

  if (!bust) {
    try {
      const cached = await kv.get<SimpleFinFetchResult>(cacheKey);
      if (cached) return Response.json(cached);
    } catch {
      /* KV unavailable — fall through to live fetch */
    }
  }

  try {
    const data = await fetchSimpleFin(accessUrl, since, until);

    try {
      // 1-hour TTL — frequent enough for daily checking, infrequent enough to keep us
      // under any per-bridge polling limits.
      await kv.set(cacheKey, data, { ex: 3600 });
    } catch {
      /* silently skip cache write */
    }

    console.log(
      "[api/simplefin] since=%s until=%s accounts=%d txns=%d errs=%d",
      since,
      until,
      data.accounts.length,
      data.transactions.length,
      data.errlist.length
    );

    return Response.json(data);
  } catch (err) {
    if (err instanceof SimpleFinError) {
      console.error("[api/simplefin] bridge error", err.status, err.body.slice(0, 200));
      if (err.status === 401 || err.status === 403) {
        return Response.json(
          { error: "SimpleFIN credentials expired — regenerate your Access URL." },
          { status: 502 }
        );
      }
      if (err.status >= 500 && err.status < 600) {
        return Response.json(
          { error: "SimpleFIN bridge temporarily unavailable — try again." },
          { status: 502 }
        );
      }
      return Response.json(
        { error: `SimpleFIN error (${err.status})` },
        { status: 502 }
      );
    }
    console.error("[api/simplefin] unexpected error", err);
    return Response.json(
      { error: "Could not reach SimpleFIN — check your connection." },
      { status: 502 }
    );
  }
}
