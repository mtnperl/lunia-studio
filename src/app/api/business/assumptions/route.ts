import { kv } from "@/lib/kv";
import {
  ASSUMPTIONS_KV_KEY,
  BusinessAssumptionsSchema,
  DEFAULT_ASSUMPTIONS,
  type BusinessAssumptions,
} from "@/lib/business-types";

export async function GET() {
  try {
    const stored = await kv.get<BusinessAssumptions>(ASSUMPTIONS_KV_KEY);
    return Response.json(stored ?? DEFAULT_ASSUMPTIONS);
  } catch (err) {
    console.error("[api/business/assumptions GET]", err);
    // KV unavailable — return defaults so the UI can still render.
    return Response.json(DEFAULT_ASSUMPTIONS);
  }
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BusinessAssumptionsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  try {
    await kv.set(ASSUMPTIONS_KV_KEY, parsed.data);
    return Response.json(parsed.data);
  } catch (err) {
    console.error("[api/business/assumptions PUT]", err);
    return Response.json({ error: "Could not save assumptions" }, { status: 503 });
  }
}
