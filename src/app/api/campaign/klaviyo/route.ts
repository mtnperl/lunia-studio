import { createEmailTemplate, hasWriteAccess, KlaviyoAuthError } from "@/lib/klaviyo";

export const maxDuration = 30;

/** Push a campaign email to Klaviyo as a new draft template. The caller is
 *  responsible for rendering the HTML (CampaignEditor already does this via
 *  renderCampaignEmail), so we just relay it. */
export async function POST(req: Request) {
  if (!hasWriteAccess()) {
    return Response.json(
      { error: "Klaviyo write access not configured — add KLAVIYO_API_KEY (full-access) or KLAVIYO_API_KEY_WRITE to the server env." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const html: string = body.html ?? "";
    const topic: string = (body.topic ?? "Lunia campaign").trim();
    const subject: string | undefined = body.subject;

    if (!html || html.length < 200) {
      return Response.json({ error: "Missing or too-short html in body" }, { status: 400 });
    }

    // Name is what shows up in the Klaviyo template list — include date + subject
    // so a creator scanning the list can identify it at a glance.
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `Lunia · ${subject?.trim() || topic} · ${stamp}`.slice(0, 120);

    const result = await createEmailTemplate({ name, html });
    return Response.json(result);
  } catch (err) {
    if (err instanceof KlaviyoAuthError) {
      return Response.json({ error: err.message }, { status: 401 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/campaign/klaviyo]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
