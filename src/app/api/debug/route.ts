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

  return Response.json({ envCheck, templatesCount: templates.length, templates, kvError });
}
