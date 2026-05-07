// Proxy for fal.ai CDN images — makes them same-origin for html-to-image canvas export.
// Without this, html-to-image taints the canvas and PNG export fails.

const ALLOWED_HOSTS = ['fal.media', 'v2.fal.media', 'storage.googleapis.com', 'blob.vercel-storage.com'];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url param', { status: 400 });
  }

  // Validate the URL comes from a known fal.ai CDN host
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
  );
  if (!isAllowed) {
    return new Response('URL not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(imageUrl, { cache: 'force-cache' });
    if (!upstream.ok) {
      return new Response('Upstream fetch failed', { status: 502 });
    }
    const buffer = await upstream.arrayBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Proxy error', { status: 500 });
  }
}
