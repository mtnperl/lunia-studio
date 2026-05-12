import { randomUUID } from "crypto";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_MAX_TOKENS_MAX,
  CONTENT_THINKING,
} from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import { buildCarouselToEmailPrompt } from "@/lib/email-review-prompts";
import type { EmailFlow, EmailFlowAsset, EmailFlowType, SavedCarousel } from "@/lib/types";

export const maxDuration = 300;

const VALID_FLOW_TYPES = new Set<string>([
  "abandoned_checkout", "browse_abandonment", "welcome",
  "post_purchase", "replenishment", "lapsed", "campaign",
]);

type ClaudeEmail = {
  id: string;
  position: number;
  role: string;
  subject: string;
  previewText: string;
  senderName: string;
  senderEmail: string;
  sendDelayHours: number;
  bodyText: string;
  rationale: string;
};

type ClaudeOutput = {
  flowType: string;
  flowName: string;
  trigger: string;
  emails: ClaudeEmail[];
};

/** Replace em dashes with a plain hyphen-space so generated copy stays on-brand. */
function stripEmDashes(text: string): string {
  return text.replace(/ — /g, ", ").replace(/—/g, " - ");
}

function safeParseJson(raw: string): ClaudeOutput | null {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(s) as ClaudeOutput; } catch { /* try harder */ }
  const start = s.indexOf("{");
  if (start !== -1) {
    let depth = 0, inString = false, escape = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(s.slice(start, i + 1)) as ClaudeOutput; } catch { break; }
        }
      }
    }
  }
  return null;
}

function validate(out: ClaudeOutput | null): { ok: boolean; reason?: string } {
  if (!out) return { ok: false, reason: "Claude did not return parseable JSON" };
  if (!VALID_FLOW_TYPES.has(out.flowType)) return { ok: false, reason: `invalid flowType: ${out.flowType}` };
  if (!Array.isArray(out.emails) || out.emails.length === 0) return { ok: false, reason: "missing or empty emails array" };
  return { ok: true };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "127.0.0.1";
  const allowed = await checkRateLimit(ip, "email-review");
  if (!allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const carousel = body.carousel as SavedCarousel | undefined;
    if (!carousel || !carousel.topic || !carousel.content) {
      return Response.json({ error: "missing or invalid carousel" }, { status: 400 });
    }

    // Cap userComment to 500 chars
    const rawComment = (body.userComment as string | undefined)?.trim() ?? "";
    const userComment = rawComment.slice(0, 500);

    const t0 = Date.now();
    const msg = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_MAX,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: buildCarouselToEmailPrompt({ carousel, userComment: userComment || undefined }) }],
    });

    const text = extractText(msg);
    const parsed = safeParseJson(text);
    const valid = validate(parsed);

    if (!valid.ok || !parsed) {
      console.error("[email-review/carousel-to-email] invalid output:", valid.reason, "raw:", text.slice(0, 500));
      return Response.json({
        error: `Carousel-to-email failed: ${valid.reason}`,
        raw: text.slice(0, 2000),
      }, { status: 502 });
    }

    const flow: EmailFlow = {
      id: randomUUID(),
      source: "carousel",
      carouselId: carousel.id,
      flowType: parsed.flowType as EmailFlowType,
      flowName: parsed.flowName,
      trigger: parsed.trigger,
      emails: parsed.emails.map<EmailFlowAsset>((e) => ({
        id: e.id,
        position: e.position,
        role: e.role,
        subject: stripEmDashes(e.subject),
        previewText: stripEmDashes(e.previewText),
        senderName: e.senderName,
        senderEmail: e.senderEmail,
        sendDelayHours: e.sendDelayHours,
        bodyText: stripEmDashes(e.bodyText),
      })),
      fetchedAt: new Date().toISOString(),
    };

    const elapsed = Date.now() - t0;
    console.log(`[email-review/carousel-to-email] carouselId=${carousel.id} flowType=${flow.flowType} emails=${flow.emails.length} elapsed=${elapsed}ms`);

    const rationales: Record<string, string> = {};
    parsed.emails.forEach((e) => { rationales[e.id] = e.rationale; });

    return Response.json({ flow, rationales });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/carousel-to-email]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
