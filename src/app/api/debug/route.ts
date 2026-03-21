import { getCarouselTemplates } from "@/lib/kv";

export async function GET() {
  const envCheck = {
    KV_REST_API_URL: process.env.KV_REST_API_URL ? process.env.KV_REST_API_URL.slice(0, 30) + "..." : "NOT SET",
    KV_URL: process.env.KV_URL ? process.env.KV_URL.slice(0, 30) + "..." : "NOT SET",
    REDIS_URL: process.env.REDIS_URL ? process.env.REDIS_URL.slice(0, 30) + "..." : "NOT SET",
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "SET" : "NOT SET",
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "SET" : "NOT SET",
  };

  let templates: unknown[] = [];
  let kvError: string | null = null;
  try {
    templates = await getCarouselTemplates();
  } catch (e) {
    kvError = String(e);
  }

  // Test image URL accessibility for each template
  const templateSummary = await Promise.all(
    (templates as Array<{ id: string; name: string; images: Array<{ url: string; slideName: string }> }>).map(async (t) => {
      const imageChecks = await Promise.all(
        t.images.map(async (img) => {
          try {
            const r = await fetch(img.url, { method: "HEAD" });
            return { url: img.url.slice(0, 60) + "...", slideName: img.slideName, status: r.status, ok: r.ok };
          } catch (e) {
            return { url: img.url.slice(0, 60) + "...", slideName: img.slideName, status: "FETCH_ERROR", error: String(e) };
          }
        })
      );
      return { id: t.id, name: t.name, imageChecks };
    })
  );

  return Response.json({ envCheck, templatesCount: templates.length, templateSummary, kvError });
}
