export const dynamic = "force-dynamic";

export async function GET() {
  const hasKey = !!process.env.FAL_KEY;
  if (!hasKey) {
    return Response.json({ ok: false, error: "FAL_KEY is not set in this environment" });
  }
  // Return a safe prefix so you can verify it's the right key without exposing it
  const preview = process.env.FAL_KEY!.slice(0, 12) + "...";
  return Response.json({ ok: true, keyPresent: true, keyPreview: preview });
}
