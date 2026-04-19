import { z } from "zod";
import { scanCompliance } from "@/lib/compliance";
import { logEntry, logExit } from "@/lib/ugc-api";

const bodySchema = z.object({
  text: z.string().max(10_000),
});

export async function POST(req: Request): Promise<Response> {
  const start = logEntry("/api/ugc/compliance/check", "scan");
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      logExit("/api/ugc/compliance/check", "scan", start, 400);
      return Response.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const result = scanCompliance(parsed.data.text);
    logExit("/api/ugc/compliance/check", "scan", start, 200, { level: result.level });
    return Response.json(result);
  } catch (err) {
    console.error("[api/ugc/compliance/check] POST", err);
    logExit("/api/ugc/compliance/check", "scan", start, 500);
    return Response.json({ error: "Scan failed" }, { status: 500 });
  }
}
