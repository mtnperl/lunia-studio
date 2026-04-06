import { getEmails } from "@/lib/kv";

export async function GET() {
  try {
    const all = await getEmails();
    // Return fields needed for library grid + side-by-side voice diff
    const emails = all.map(({ id, frameworkLabel, score, scoreDiagnosis, competitorText, generated, imageUrl, savedAt }) => ({
      id, frameworkLabel, score, scoreDiagnosis, competitorText, generated, imageUrl, savedAt,
    }));
    return Response.json({ emails });
  } catch (err) {
    console.error("[api/email/library]", err);
    return Response.json({ error: "Failed to load library" }, { status: 500 });
  }
}
