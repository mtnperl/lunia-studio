/**
 * Prove the design review's fix pass works against the real model.
 *
 *   npx tsx scripts/dry-run-email-fix-pass.ts
 *
 * Forces a bad first answer (the old generate shape: three long paragraphs),
 * then lets runLayoutPass review it and ask for a fix. Prints the error count
 * before and after and the final block sequence. Nothing is written anywhere.
 */
import path from "node:path";
import fs from "node:fs";

for (const dir of [process.cwd(), path.resolve(process.cwd(), "../../..")]) {
  const f = path.join(dir, ".env.local");
  if (fs.existsSync(f)) { process.loadEnvFile(f); break; }
}

async function main(): Promise<void> {
  const { runLayoutPass } = await import("../src/lib/campaign-layout-pass");
  const P = await import("../src/lib/campaign-layout-prompts");
  const prompt = `${P.buildGeneratePrompt({ topic: "Why the two hours before bed decide your night" })}

OVERRIDE FOR THIS TEST ONLY: ignore the design rules and return exactly three "text" blocks of about 70 words each, nothing else.`;
  const t0 = Date.now();
  const r = await runLayoutPass({ prompt, sourceText: (d) => P.blocksToSourceText(d) });
  if (!r.ok) { console.log("FAILED", r.error); return; }
  const e = (xs: { severity: string }[]) => xs.filter((x) => x.severity === "error").length;
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s  before=${e(r.review.before)} errors  after=${e(r.review.after)}  fixed=${r.review.fixed}`);
  console.log("kinds:", r.blocks.map((b) => b.kind ?? "text").join(" → "));
  for (const f of r.review.after) console.log(`  ${f.severity}: ${f.message}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
