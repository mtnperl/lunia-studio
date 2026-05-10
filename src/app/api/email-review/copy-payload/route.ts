import { getFlowReviewById } from "@/lib/kv";
import type { FlowReviewSection } from "@/lib/types";

export const maxDuration = 30;

function sectionsToMarkdown(sections: FlowReviewSection[]): string {
  return sections.map((s) => {
    const flagsBlock = s.flags?.length
      ? "\n\n" + s.flags.map((f) => `> ${f.severity === "compliance" ? "[COMPLIANCE]" : "[WARN]"} ${f.text}`).join("\n")
      : "";
    return `## ${s.title}\n\n${s.bodyMarkdown}${flagsBlock}`;
  }).join("\n\n---\n\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    const format = (body.format as string | undefined) ?? "markdown";
    if (!reviewId) return Response.json({ error: "missing reviewId" }, { status: 400 });
    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const header = `# ${review.flow.flowName}\n\n_Lunia Email Flow Review · framework ${review.frameworkVersion} · ${new Date(review.createdAt).toLocaleString()}_\n\n## If you only do three things\n\n${review.ifYouOnlyDoThree.map((t) => `- ${t}`).join("\n")}\n`;
    const body_md = sectionsToMarkdown(review.sections);
    const imageBlock = review.imagePrompts.length
      ? `\n\n---\n\n## Image prompts\n\n${review.imagePrompts.map((p) => `### ${p.placement} · ${p.aspect} · ${p.engine}\n\n\`\`\`\n${p.prompt}\n\`\`\`${p.imageUrl ? `\n\n[Rendered image](${p.imageUrl})` : ""}`).join("\n\n")}`
      : "";
    const md = `${header}\n\n---\n\n${body_md}${imageBlock}`;

    if (format === "plain") {
      const plain = md
        .replace(/^#+\s+/gm, "")
        .replace(/```[\s\S]*?```/g, (m) => m.replace(/```[a-z]*\n?/g, "").replace(/```/g, ""))
        .replace(/\*\*/g, "")
        .replace(/`/g, "");
      return Response.json({ payload: plain, format: "plain" });
    }
    if (format === "html") {
      const html = `<article><h1>${review.flow.flowName}</h1><pre>${md.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] ?? c))}</pre></article>`;
      return Response.json({ payload: html, format: "html" });
    }
    return Response.json({ payload: md, format: "markdown" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/copy-payload]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
