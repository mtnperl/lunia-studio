// "Make it visual": re-express an existing campaign's copy as a richer set of
// blocks. It is forbidden from writing anything: it takes the whole blocks
// array as input and its result REPLACES the body rather than appending to it.
// The layout it builds is named by a shapeId, resolved server-side.
//
// Fact preservation is enforced by prompt only. The code-enforced verifier was
// considered and cut during the 2026-08-21 CEO review, so the caller's
// before/after diff is the sole check — never apply this result silently.
import {
  createContentMessage,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
  extractText,
} from "@/lib/anthropic";
import { checkRateLimit } from "@/lib/kv";
import {
  buildRestructurePrompt,
  blocksToSourceText,
  LayoutSuggestionSchema,
  layoutBlockToCampaignBlock,
} from "@/lib/campaign-layout-prompts";
import type { CampaignBlock } from "@/lib/types";

import { stripDashes } from "@/lib/strip-dashes";
import { blockTokensBalanced } from "@/lib/campaign-inline-style";
import {
  resolveShapeGuidance,
  isSavedShapeId,
  savedShapeIdOf,
  deriveShapeGuidance,
} from "@/lib/campaign-shapes";
import { getSavedShapes } from "@/lib/kv";
// One LLM call with thinking enabled over a whole email's copy. The batch
// ("restructure this whole flow") path is driven from the client as one request
// per email, so this budget is per-email and never has to cover a whole flow.
// No vercel.json entry exists for campaign routes, so this in-file value wins.
export const maxDuration = 120;

function stripJsonFence(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
}


export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const allowed = await checkRateLimit(ip, "carousel");
  if (!allowed) {
    return Response.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const blocks: CampaignBlock[] = Array.isArray(body.blocks) ? body.blocks : [];
    const subject: string = (body.subject ?? "").trim();
    const topic: string = (body.topic ?? "").trim();
    // The client names a SHAPE; the guidance text is resolved here, from the
    // server-side registry. Guidance is interpolated into an LLM prompt, so
    // accepting it over the wire would let a caller inject arbitrary
    // instructions. An unknown id is a 400, never a silent plain restructure.
    const shapeId: string = typeof body.shapeId === "string" ? body.shapeId : "auto";
    let guidance: string | undefined;
    if (isSavedShapeId(shapeId)) {
      // A saved shape stores STRUCTURE. Its instruction is derived here, from
      // the stored record, so a saved shape can no more inject prompt text
      // than a built-in one can.
      const saved = (await getSavedShapes()).find((sh) => sh.id === savedShapeIdOf(shapeId));
      guidance = saved ? deriveShapeGuidance(saved) : undefined;
    } else {
      guidance = resolveShapeGuidance(shapeId);
    }
    if (guidance === undefined) {
      return Response.json({ error: `Unknown shape "${shapeId}".` }, { status: 400 });
    }

    // Guard on the SOURCE COPY, not the block count: a campaign can hold ten
    // blocks that are all empty scaffolding, and there is nothing to restructure
    // in that. 40 chars is about one sentence.
    const source = blocksToSourceText(blocks);
    if (source.length < 40) {
      return Response.json(
        { error: "Not enough copy to restructure. Write the email first, then make it visual." },
        { status: 400 },
      );
    }

    const prompt = buildRestructurePrompt(blocks, subject, topic, guidance);
    const response = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_LONG,
      thinking: CONTENT_THINKING,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = extractText(response);
    const jsonText = stripJsonFence(raw);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      // A model refusal lands here too — it is prose, so it fails to parse the
      // same way malformed JSON does.
      console.error("[api/campaign/restructure] JSON parse failed:", raw.slice(0, 400));
      return Response.json({ error: "Restructure failed, please try again." }, { status: 422 });
    }

    const result = LayoutSuggestionSchema.safeParse(parsedJson);
    if (!result.success) {
      console.error("[api/campaign/restructure] schema validation failed:", result.error.message);
      return Response.json({ error: "Restructure failed, please try again." }, { status: 422 });
    }

    const mapped = result.data.blocks.map(layoutBlockToCampaignBlock);

    // The prompt asks the model to keep an inline-styling token pair inside one
    // block; this is the check. A split pair would leave an unterminated opener
    // in one block and an orphan close in another, and the renderer would
    // faithfully print a literal "[[lg]]" into the email. Dropping the block is
    // better than shipping that, and the count is reported so the drop is
    // visible rather than silent.
    const restructured = mapped.filter(blockTokensBalanced);
    const droppedForTokens = mapped.length - restructured.length;
    if (droppedForTokens > 0) {
      console.warn(`[api/campaign/restructure] dropped ${droppedForTokens} block(s) with split styling tokens`);
    }

    if (restructured.length === 0) {
      return Response.json({ error: "Restructure produced nothing usable, please try again." }, { status: 422 });
    }

    return Response.json({
      droppedForTokens,
      topBanner: result.data.topBanner ? stripDashes(result.data.topBanner) : undefined,
      promoBand: result.data.promoBand ? stripDashes(result.data.promoBand) : undefined,
      ctaLabel: result.data.ctaLabel ? stripDashes(result.data.ctaLabel) : undefined,
      blocks: restructured,
      sourceBlockCount: blocks.length,
    });
  } catch (err) {
    console.error("[api/campaign/restructure]", err);
    return Response.json({ error: "Restructure failed" }, { status: 500 });
  }
}
