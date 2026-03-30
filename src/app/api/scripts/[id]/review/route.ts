import { getScriptById, saveScriptKv } from "@/lib/kv";
import { Resend } from "resend";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { emails, note } = await req.json() as { emails: string[]; note?: string };

    if (!emails || emails.length === 0) {
      return Response.json({ error: "No emails provided" }, { status: 400 });
    }

    const script = await getScriptById(id);
    if (!script) return Response.json({ error: "Script not found" }, { status: 404 });

    const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://lunia.studio"}/scripts/${id}`;
    const from = process.env.FROM_EMAIL ?? "Lunia Studio <studio@lunia.life>";

    // Send email if API key is configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const hookPreview = script.hook ? `\n\nHook: "${script.hook}"` : "";
      const noteSection = note ? `\n\nNote from sender:\n${note}` : "";

      await resend.emails.send({
        from,
        to: emails,
        subject: `Review requested: ${script.title}`,
        text: [
          `You've been asked to review a script: "${script.title}"`,
          hookPreview,
          noteSection,
          `\nView script: ${shareUrl}`,
          "\n— Lunia Studio",
        ].join(""),
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1C1916;">
            <div style="border-bottom: 1px solid #D8D1C0; padding-bottom: 16px; margin-bottom: 24px;">
              <span style="font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #A07830;">Lunia Studio</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin: 0 0 8px;">Review requested</h2>
            <p style="color: #6B6359; margin: 0 0 20px;">You've been asked to review a script.</p>
            <div style="background: #F5F0E8; border: 1px solid #D8D1C0; border-left: 3px solid #A07830; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
              <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #A07830; margin: 0 0 6px;">Script</p>
              <p style="font-size: 15px; font-weight: 600; margin: 0 0 8px;">${script.title}</p>
              ${script.hook ? `<p style="font-size: 14px; color: #6B6359; margin: 0; font-style: italic;">"${script.hook}"</p>` : ""}
            </div>
            ${note ? `<div style="background: #EDE8DF; border-radius: 6px; padding: 14px; margin-bottom: 20px;"><p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6B6359; margin: 0 0 6px;">Note</p><p style="font-size: 14px; margin: 0;">${note}</p></div>` : ""}
            <a href="${shareUrl}" style="display: inline-block; background: #A07830; color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none;">View script →</a>
            <p style="font-size: 12px; color: #9B9389; margin-top: 32px;">Sent from Lunia Studio</p>
          </div>
        `,
      });
    }

    // Update script status + store reviewer emails
    const updated = {
      ...script,
      status: "review" as const,
      reviewEmails: emails,
      savedAt: new Date().toISOString(),
    };
    await saveScriptKv(updated);

    return Response.json({ ok: true, script: updated });
  } catch (err) {
    console.error("[api/scripts/[id]/review] POST error:", err);
    return Response.json({ error: "Failed to send review request" }, { status: 500 });
  }
}
