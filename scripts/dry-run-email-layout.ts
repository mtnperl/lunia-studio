/**
 * Dry-run the email layout prompts locally before shipping a prompt change.
 *
 *   npx tsx scripts/dry-run-email-layout.ts
 *
 * Runs the same layout pass /api/campaign/restructure and /api/campaign/generate
 * use (model call, design review, one fix pass) on three cases, and prints the
 * block sequence, what the review caught, and any number in the output that is
 * in neither the source nor the verified facts. Nothing is written anywhere.
 *
 * Reads keys from the working directory, or from the main checkout when run
 * inside a worktree under .claude/worktrees/.
 */
import path from "node:path";
import fs from "node:fs";

for (const dir of [process.cwd(), path.resolve(process.cwd(), "../../..")]) {
  const f = path.join(dir, ".env.local");
  if (fs.existsSync(f)) { process.loadEnvFile(f); break; }
}

const LONG_EMAIL = [
  "Most people blame the night before when they wake up tired. Usually it is not the hours in bed that went wrong, it is the two hours before them. Light, a late meal, and a racing mind all push against the wind-down window, and by the time you lie down the night is mostly decided.",
  "That is why we built Lunia Restore the way we did. Magnesium bisglycinate calms an over-excited nervous system, L-theanine takes the edge off a busy mind without sedating you, and apigenin, the compound in chamomile, helps you drift off. Every dose is printed on the label, and there is no melatonin, so there is no grogginess and nothing to taper off.",
  "Take up to two capsules thirty to sixty minutes before bed. Keep the last hour dim. Give it a full week before you judge it, because the first night is rarely the one that tells you anything.",
  "Thousands of people have made it part of their evening. If you have been lying awake planning tomorrow, tonight is a good night to start.",
].join("\n\n");

async function main(): Promise<void> {
  const { runLayoutPass, collectPictures } = await import("../src/lib/campaign-layout-pass");
  const P = await import("../src/lib/campaign-layout-prompts");
  const { getShape } = await import("../src/lib/campaign-shapes");
  type Block = import("../src/lib/types").CampaignBlock;

  const facts = P.verifiedFactsText();
  const numbersIn = (s: string) => new Set((s.match(/\$?\d[\d,.]*%?/g) ?? []).map((n) => n.replace(/[.,]$/, "")));

  function report(name: string, source: string, r: Awaited<ReturnType<typeof runLayoutPass>>, t0: number) {
    console.log(`\n━━ ${name}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    if (!r.ok) { console.log("FAILED:", r.error); return; }
    console.log("kinds:", r.blocks.map((b) => b.kind ?? "text").join(" → "));
    const e = (xs: { severity: string }[]) => xs.filter((x) => x.severity === "error").length;
    console.log(`review: ${e(r.review.before)} error(s) before, ${e(r.review.after)} after, fixed=${r.review.fixed}`);
    for (const f of r.review.after) console.log(`  ${f.severity}: ${f.message}`);
    const allowed = new Set([...numbersIn(source), ...numbersIn(facts)]);
    const out = r.blocks.map(P.blockToSourceText).join("\n");
    const invented = [...numbersIn(out)].filter((n) => !allowed.has(n));
    console.log(invented.length ? `NUMBERS NOT IN SOURCE OR FACTS: ${invented.join(", ")}` : "numbers: all sourced");
    const pics = r.blocks.filter((b) => b.imageUrl || b.gridCells?.some((c) => c.imageUrl)).length;
    console.log(`blocks reusing an existing picture: ${pics}`);
    for (const b of r.blocks) console.log(`  [${b.kind}] ${P.blockToSourceText(b).replace(/\s+/g, " ").slice(0, 110)}`);
  }

  // 1. A text-only email, the shape people actually import.
  const textOnly: Block[] = LONG_EMAIL.split("\n\n").map((body, i) => ({ id: `t${i}`, body, align: "left", kind: "text" }));
  let t0 = Date.now();
  report("text-only email, auto", LONG_EMAIL,
    await runLayoutPass({ prompt: P.buildRestructurePrompt(textOnly, "Your evening decides your night", ""), sourceText: P.blocksToSourceText(textOnly) }), t0);

  // 2. An email that already has picture blocks: their copy must survive and
  //    their pictures should be reused.
  const mixed: Block[] = [
    { id: "m0", kind: "imagetext", body: "Magnesium bisglycinate is chelated for absorption and gentler on the stomach.", imageHeading: "The mineral", align: "left", imageUrl: "https://example.com/magnesium.jpg" },
    ...textOnly.slice(0, 3),
    { id: "m4", kind: "grid", body: "", align: "left", gridCells: [
      { heading: "Melatonin-free", caption: "Nothing to taper off.", imageUrl: "https://example.com/bed.jpg" },
      { heading: "Every dose printed", caption: "No proprietary blend.", imageUrl: "https://example.com/label.jpg" },
    ] },
  ];
  const pictures = collectPictures(mixed);
  t0 = Date.now();
  report("mixed email with pictures, editorial", P.blocksToSourceText(mixed),
    await runLayoutPass({ prompt: P.buildRestructurePrompt(mixed, "Three ingredients, three jobs", "", getShape("editorial")!.guidance, { pictures }), sourceText: P.blocksToSourceText(mixed), pictures }), t0);
  console.log("  source kept:", ["chelated", "gentler on the stomach", "Nothing to taper off", "No proprietary blend"].map((w) => `${w}=${P.blocksToSourceText(mixed).includes(w)}`).join(" "));

  // 3. A new email from a brief, the path that used to return three paragraphs.
  t0 = Date.now();
  const brief = { topic: "Why the two hours before bed decide your night", tone: "calm, editorial" };
  report("new email from a brief", brief.topic,
    await runLayoutPass({ prompt: P.buildGeneratePrompt(brief), sourceText: (d) => `Brief: ${brief.topic}\n\n${P.blocksToSourceText(d)}` }), t0);
}

main().catch((err) => { console.error(err); process.exit(1); });
