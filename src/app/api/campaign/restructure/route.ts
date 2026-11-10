// "Make it visual": re-express an existing campaign's copy as a designed set of
// blocks. Its result REPLACES the body, so it reads every field of every block
// (see blockToSourceText), is offered the email's own pictures and the user's
// saved snippets by reference, and runs the design review before returning
// (see campaign-layout-pass). The layout it builds is named by a shapeId,
// resolved server-side.
//
// Fact preservation is enforced by prompt only. The code-enforced verifier was
// considered and cut during the 2026-08-21 CEO review, so the caller's
// before/after diff is the sole check — never apply this result silently.
import { checkRateLimit, getSavedShapes, getCampaignSnippets } from "@/lib/kv";
import { buildRestructurePrompt, blocksToSourceText } from "@/lib/campaign-layout-prompts";
import { runLayoutPass, collectPictures, snippetRefs } from "@/lib/campaign-layout-pass";
import type { CampaignBlock, CampaignImageSlot } from "@/lib/types";
import {
  resolveShapeGuidance,
  isSavedShapeId,
  savedShapeIdOf,
  deriveShapeGuidance,
} from "@/lib/campaign-shapes";

// One thinking call over a whole email, plus at most one fast fix pass when
// the design review blocks. The flow-level batch is one request per email, so
// this budget never has to cover a whole flow.
export const maxDuration = 300;

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
    // Image slots, so a picture placed by a kind "image" block can be reused.
    // Optional: older clients send blocks only.
    const images: CampaignImageSlot[] = Array.isArray(body.images) ? body.images : [];
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

    const pictures = collectPictures(blocks, images);
    // Snippets are a nice-to-have; a storage hiccup must not cost the layout.
    const snippets = snippetRefs(await getCampaignSnippets().catch(() => []));

    const result = await runLayoutPass({
      prompt: buildRestructurePrompt(blocks, subject, topic, guidance, { pictures, snippets }),
      sourceText: source,
      pictures,
      snippets,
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: 422 });

    return Response.json({
      droppedForSchema: result.droppedForSchema,
      droppedForTokens: result.droppedForTokens,
      topBanner: result.meta.topBanner,
      promoBand: result.meta.promoBand,
      ctaLabel: result.meta.ctaLabel,
      blocks: result.blocks,
      sourceBlockCount: blocks.length,
      review: result.review,
    });
  } catch (err) {
    console.error("[api/campaign/restructure]", err);
    return Response.json({ error: "Restructure failed" }, { status: 500 });
  }
}
