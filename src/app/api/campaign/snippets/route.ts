import { getCampaignSnippets, saveCampaignSnippet } from "@/lib/kv";
import type { CampaignBlock } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const snippets = await getCampaignSnippets();
    return Response.json(snippets);
  } catch (err) {
    console.error("[api/campaign/snippets]", err);
    return Response.json({ error: "Failed to load snippets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = (body.name ?? "").trim();
    const block: Omit<CampaignBlock, "id"> | undefined = body.block;
    if (!name || !block || typeof block.body !== "string") {
      return Response.json({ error: "Missing name or block" }, { status: 400 });
    }
    const snippet = {
      id: randomUUID(),
      name,
      block,
      createdAt: new Date().toISOString(),
    };
    await saveCampaignSnippet(snippet);
    return Response.json(snippet);
  } catch (err) {
    console.error("[api/campaign/snippets]", err);
    return Response.json({ error: "Failed to save snippet" }, { status: 500 });
  }
}
