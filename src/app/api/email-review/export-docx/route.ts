// Builds a Word doc that mirrors the framework's "Deliverable format" — Arial
// throughout, #102635 H1, #1A1A1A body, compliance flags in #B0413E, image
// prompt blocks in mono with cream background. Mirrors result to Vercel Blob
// so the download URL stays valid past the Function response.

import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ShadingType,
  BorderStyle,
  Footer,
  PageNumber,
} from "docx";
import { getFlowReviewById, saveFlowReview } from "@/lib/kv";
import type { FlowReviewSection, SavedFlowReview } from "@/lib/types";

export const maxDuration = 60;

const COLOR_DEEP_NAVY = "102635";
const COLOR_SLATE_BLUE = "2C3F51";
const COLOR_BODY = "1A1A1A";
const COLOR_COMPLIANCE = "B0413E";
const COLOR_CREAM = "F5F2EC";
const COLOR_MUTED = "676879";

function h1(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, bold: true, size: 36 /* half-points: 18pt */, font: "Arial", color: COLOR_DEEP_NAVY })],
    heading: HeadingLevel.HEADING_1,
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, bold: true, size: 28 /* 14pt */, font: "Arial", color: COLOR_DEEP_NAVY })],
    heading: HeadingLevel.HEADING_2,
  });
}

function h3(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 /* 12pt */, font: "Arial", color: COLOR_SLATE_BLUE })],
    heading: HeadingLevel.HEADING_3,
  });
}

function body(text: string, opts: { bold?: boolean } = {}): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 320 },
    children: [new TextRun({ text, size: 22 /* 11pt */, font: "Arial", color: COLOR_BODY, bold: opts.bold })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 22, font: "Arial", color: COLOR_BODY })],
  });
}

function complianceFlag(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.SOLID, color: "FBE9E8", fill: "FBE9E8" },
    children: [new TextRun({ text: `[COMPLIANCE] ${text}`, bold: true, size: 22, font: "Arial", color: COLOR_COMPLIANCE })],
  });
}

function warningFlag(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    shading: { type: ShadingType.SOLID, color: "FFF7E6", fill: "FFF7E6" },
    children: [new TextRun({ text: `[WARN] ${text}`, bold: true, size: 22, font: "Arial", color: "9A6B00" })],
  });
}

function imagePromptBlock(label: string, prompt: string, engine: string, aspect: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 80 },
      children: [
        new TextRun({ text: `${label} · ${engine} · ${aspect}`, bold: true, size: 22, font: "Arial", color: COLOR_DEEP_NAVY }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      shading: { type: ShadingType.SOLID, color: COLOR_CREAM, fill: COLOR_CREAM },
      border: {
        left: { style: BorderStyle.SINGLE, size: 18, color: COLOR_DEEP_NAVY, space: 6 },
      },
      children: [
        new TextRun({ text: prompt, size: 20, font: "Consolas", color: COLOR_BODY }),
      ],
    }),
  ];
}

function paragraphsFromMarkdown(md: string): Paragraph[] {
  // Lightweight markdown → docx paragraph conversion. Handles:
  //   - "## " H2, "### " H3
  //   - "- " or "* " bullets
  //   - "**bold**" inline (just rendered as bold)
  //   - blank lines = spacer
  // Tables and code fences fall through as preformatted body text.
  const lines = md.split(/\r?\n/);
  const out: Paragraph[] = [];
  let inFence = false;
  let fenceBuf: string[] = [];
  for (const raw of lines) {
    const line = raw;
    if (line.trim().startsWith("```")) {
      if (inFence) {
        out.push(new Paragraph({
          spacing: { before: 100, after: 120 },
          shading: { type: ShadingType.SOLID, color: COLOR_CREAM, fill: COLOR_CREAM },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: COLOR_DEEP_NAVY, space: 6 } },
          children: [new TextRun({ text: fenceBuf.join("\n"), size: 20, font: "Consolas", color: COLOR_BODY })],
        }));
        fenceBuf = [];
        inFence = false;
      } else {
        inFence = true;
      }
      continue;
    }
    if (inFence) { fenceBuf.push(line); continue; }
    if (!line.trim()) { out.push(new Paragraph({ spacing: { after: 80 }, children: [] })); continue; }
    if (line.startsWith("### ")) { out.push(h3(line.replace(/^###\s+/, ""))); continue; }
    if (line.startsWith("## ")) { out.push(h2(line.replace(/^##\s+/, ""))); continue; }
    if (line.startsWith("# ")) { out.push(h1(line.replace(/^#\s+/, ""))); continue; }
    if (/^\s*[-*]\s+/.test(line)) { out.push(bullet(line.replace(/^\s*[-*]\s+/, ""))); continue; }
    out.push(body(line));
  }
  if (fenceBuf.length) {
    out.push(new Paragraph({
      spacing: { after: 120 },
      shading: { type: ShadingType.SOLID, color: COLOR_CREAM, fill: COLOR_CREAM },
      children: [new TextRun({ text: fenceBuf.join("\n"), size: 20, font: "Consolas", color: COLOR_BODY })],
    }));
  }
  return out;
}

function sectionToParagraphs(s: FlowReviewSection): Paragraph[] {
  const SECTION_HEADERS: Record<typeof s.key, string> = {
    headline: "Section 1 — Headline",
    timing: "Section 2 — Timing",
    subjects: "Section 3 — Subject lines, preview text, sender",
    rewrites: "Section 4 — Full body rewrites",
    design: "Section 5 — Design, images, copy",
    strategy: "Section 6 — Strategic question + Action checklist",
  };
  const out: Paragraph[] = [h1(SECTION_HEADERS[s.key] ?? s.title)];
  if (s.flags && s.flags.length > 0) {
    for (const f of s.flags) out.push(f.severity === "compliance" ? complianceFlag(f.text) : warningFlag(f.text));
  }
  out.push(...paragraphsFromMarkdown(s.bodyMarkdown));
  return out;
}

function buildDocument(review: SavedFlowReview): Document {
  const SECTION_ORDER: FlowReviewSection["key"][] = ["headline", "timing", "subjects", "rewrites", "design", "strategy"];

  const titlePage: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [new TextRun({ text: "LUNIA LIFE", bold: true, size: 22, font: "Arial", color: COLOR_DEEP_NAVY, characterSpacing: 80 })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [new TextRun({ text: review.flow.flowName, bold: true, size: 56 /* 28pt */, font: "Arial", color: COLOR_DEEP_NAVY })],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [new TextRun({
        text: `${review.flow.flowType.replace(/_/g, " ")} · ${review.flow.source} · ${review.flow.emails.length} email${review.flow.emails.length === 1 ? "" : "s"} · framework ${review.frameworkVersion} · ${new Date(review.createdAt).toLocaleDateString()}`,
        size: 22,
        font: "Arial",
        color: COLOR_MUTED,
      })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_DEEP_NAVY, space: 8 } },
      children: [],
    }),
    h2("If you only do three things"),
    ...review.ifYouOnlyDoThree.map(bullet),
  ];

  const sectionParas: Paragraph[] = [];
  for (const key of SECTION_ORDER) {
    const s = review.sections.find((x) => x.key === key);
    if (s) sectionParas.push(...sectionToParagraphs(s));
  }

  const imageBlock: Paragraph[] = review.imagePrompts.length
    ? [
        h1("Image prompts"),
        ...review.imagePrompts.flatMap((p) =>
          imagePromptBlock(`${p.placement.replace(/_/g, " ")}`, p.prompt, p.engine, p.aspect),
        ),
      ]
    : [];

  return new Document({
    creator: "Lunia Studio · Email Flow Review",
    description: `Review of ${review.flow.flowName}`,
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 18, font: "Arial", color: COLOR_MUTED })],
          })],
        }),
      },
      children: [...titlePage, ...sectionParas, ...imageBlock],
    }],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const reviewId = body.reviewId as string | undefined;
    if (!reviewId) return Response.json({ error: "missing reviewId" }, { status: 400 });
    const review = await getFlowReviewById(reviewId);
    if (!review) return Response.json({ error: "review not found" }, { status: 404 });

    const doc = buildDocument(review);
    const buffer = await Packer.toBuffer(doc);

    // Mirror to Blob for a long-lived download URL
    let downloadUrl: string | undefined;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const safeName = review.flow.flowName.replace(/[^a-z0-9]+/gi, "-").slice(0, 60).toLowerCase() || "lunia-flow-review";
        const fileName = `email-review-docx/${reviewId}-${safeName}.docx`;
        const { url } = await put(fileName, buffer, {
          access: "public",
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        downloadUrl = url;
        review.docxUrl = url;
        await saveFlowReview(review);
      } catch (err) {
        console.warn("[email-review/export-docx] blob upload failed:", err);
      }
    }

    if (downloadUrl) return Response.json({ url: downloadUrl });

    // Fallback: stream the buffer back directly
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="lunia-flow-review-${reviewId}.docx"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-review/export-docx]", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
