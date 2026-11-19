// The live Instagram grid, read through the Graph API with the Meta token the
// app already holds for ads. Needs the token to carry instagram_basic and a
// Facebook page linked to the Instagram business account. Returns the newest
// posts and one composite "screenshot" of the profile grid (3 across, 4:5
// tiles, newest top-left) for the model to look at.

import sharp from "sharp";

const GRAPH = "https://graph.facebook.com/v21.0";

export interface IgTile { id: string; imageUrl: string; timestamp: string; caption?: string }
export interface IgGrid { username: string; tiles: IgTile[]; screenshot: string /* data:image/jpeg */; thumbs: string[] /* data URLs, same order */ }

async function graph<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Graph ${res.status}`);
  return json;
}

async function igAccount(token: string): Promise<{ id: string; username: string }> {
  const fixed = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (fixed) return graph<{ id: string; username: string }>(`/${fixed}?fields=id,username`, token);
  const pages = await graph<{ data: { instagram_business_account?: { id: string; username: string } }[] }>(
    "/me/accounts?fields=instagram_business_account{id,username}&limit=50", token,
  );
  const accounts = pages.data.map((p) => p.instagram_business_account).filter((a): a is { id: string; username: string } => !!a);
  const pick = accounts.find((a) => /lunia/i.test(a.username)) ?? accounts[0];
  if (!pick) throw new Error("No Instagram business account is linked to the Meta token's pages");
  return pick;
}

/** Newest first. Videos give their thumbnail, albums their first image. */
export async function fetchIgGrid(count = 9): Promise<IgGrid> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("META_ACCESS_TOKEN is not set");
  const acct = await igAccount(token);
  const media = await graph<{ data: { id: string; media_type: string; media_url?: string; thumbnail_url?: string; timestamp: string; caption?: string }[] }>(
    `/${acct.id}/media?fields=id,media_type,media_url,thumbnail_url,timestamp,caption&limit=${count}`, token,
  );
  const tiles: IgTile[] = media.data
    .map((m) => ({ id: m.id, imageUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? "", timestamp: m.timestamp, caption: m.caption?.slice(0, 160) }))
    .filter((t) => t.imageUrl);

  // 4:5 tiles at 216x270, 3 across, 3px gutters, like the profile grid.
  const W = 216, H = 270, G = 3;
  const bufs = await Promise.all(tiles.map(async (t) => {
    const r = await fetch(t.imageUrl);
    if (!r.ok) return null;
    return sharp(Buffer.from(await r.arrayBuffer())).resize(W, H, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
  }));
  const ok: { b: Buffer; t: IgTile }[] = [];
  bufs.forEach((b, i) => { if (b) ok.push({ b, t: tiles[i] }); });
  const rows = Math.max(1, Math.ceil(ok.length / 3));
  const screenshot = await sharp({ create: { width: W * 3 + G * 2, height: rows * H + (rows - 1) * G, channels: 3, background: "#ffffff" } })
    .composite(ok.map(({ b }, i) => ({ input: b, left: (i % 3) * (W + G), top: Math.floor(i / 3) * (H + G) })))
    .jpeg({ quality: 82 }).toBuffer();
  return {
    username: acct.username,
    tiles: ok.map((x) => x.t),
    screenshot: `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    thumbs: ok.map(({ b }) => `data:image/jpeg;base64,${b.toString("base64")}`),
  };
}
