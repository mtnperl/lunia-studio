import { GraphicStyle } from "./types";

// ─── Graphic data shapes ──────────────────────────────────────────────────────

export type StatData   = { stat: string; label: string };
export type BarsData   = { items: { label: string; value: string }[] };
export type StepsData  = { steps: string[] };
export type ChainData  = { labels: string[] };

export type GraphicData =
  | { style: "stat";      data: StatData }
  | { style: "bars";      data: BarsData }
  | { style: "steps";     data: StepsData }
  | { style: "dotchain";  data: ChainData }
  | { style: "wave" }
  | { style: "iconGrid" }
  | { style: "textOnly" };

// ─── Style inference ──────────────────────────────────────────────────────────

/**
 * Infer the best graphic style from slide content.
 *
 * Checks run in priority order. Each check uses both headline and body,
 * but body gets higher weight. Citations are stripped before matching
 * so stray numbers in references don't trigger stat mode.
 */
export function inferGraphicStyle(headline: string, body: string): GraphicStyle {
  // Strip citation suffix before matching (everything after "Research:" or after the last full-stop pattern)
  const bodyClean = body.replace(/Research:.*$/i, "").replace(/^\s*\[.*?\]\s*/gm, "").trim();
  const h = headline.toLowerCase();
  const b = bodyClean.toLowerCase();
  const all = h + " " + b;

  // WAVE — sleep stage / circadian biology
  // Wins if the slide is fundamentally about sleep architecture
  if (
    /sleep (stage|cycle|architecture|phase|depth)|circadian (rhythm|clock|signal)|rem (sleep|phase)|nrem|slow.?wave sleep|delta wave|sleep oscillat|brainwave|hypnogram/.test(all)
  ) return "wave";

  // BARS — explicit numeric comparisons between two things
  if (
    /\bvs\.?\b|versus|\bplacebo\b|control group|compared (to|with)|outperform|reduction of .+? (vs|versus|compared)|twice as|three times as|(higher|lower|faster|better) than/.test(all)
  ) return "bars";

  // STAT — a meaningful % or ×-multiplier claim is the KEY point of the slide
  // Must be in the cleaned body, not just a citation year
  if (/%/.test(bodyClean) || /\b\d+x\b/.test(bodyClean)) return "stat";

  // STEPS — routines, protocols, sequential advice
  if (
    /\bprotocol\b|routine\b|checklist\b|\bstep \d|nightly habit|wind.?down|how to |bedtime ritual/.test(all) ||
    /\b(first[,.]|second[,.]|then[,.]|next[,.]|finally[,.])/.test(b) ||
    /\b[1-4]\.\s/.test(body)
  ) return "steps";

  // DOTCHAIN — biological mechanisms, absorption, pathways
  if (
    /blood.?brain barrier|absorb(ed|tion)|pathway|mechanism of|receptor|crosses into|converted to|cascade|metabol|synthes|release(s|d)|gaba|glutamate|neurotransmit|aminobutyric|transporter/.test(all)
  ) return "dotchain";

  // ICONGRIP — multiple distinct named compounds or benefit pillars
  if (
    /(?:magnesium|bisglycinate|l.?theanine|apigenin|chamomile|ashwagandha|valerian).{1,60}(?:magnesium|bisglycinate|l.?theanine|apigenin|chamomile|ashwagandha|valerian)/i.test(all) ||
    /three ingredients|formula contains|each ingredient|combination of|stack/.test(all)
  ) return "iconGrid";

  // Second stat pass: any % left after stripping
  if (/%/.test(b)) return "stat";

  return "textOnly";
}

// ─── Data extraction ──────────────────────────────────────────────────────────

/**
 * Extract data from slide text to populate graphic components.
 * Returns a GraphicData union — pass to GraphicZone in ContentSlide.
 */
export function extractGraphicData(
  style: GraphicStyle,
  headline: string,
  body: string
): GraphicData {
  switch (style) {
    case "stat":   return { style, data: extractStat(headline, body) };
    case "bars":   return { style, data: extractBars(body) };
    case "steps":  return { style, data: extractSteps(body) };
    case "dotchain": return { style, data: extractChain(body) };
    default:       return { style } as GraphicData;
  }
}

// ── Stat extractor ────────────────────────────────────────────────────────────

function extractStat(headline: string, body: string): StatData {
  const bodyClean = body.replace(/Research:.*$/i, "");

  // Prefer the FIRST % figure in the body (not just in citations)
  const pctMatch = bodyClean.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const stat = pctMatch[1] + "%";
    // Grab the phrase following the % as the label
    const after = bodyClean.slice(bodyClean.indexOf(pctMatch[0]) + pctMatch[0].length);
    const phrase = after.match(/^[^.!?]{8,55}/)?.[0]?.trim() ?? "";
    const label = phrase
      ? phrase.replace(/^[\s,of]+/i, "").replace(/[,;].*$/, "").toUpperCase().trim()
      : headline.toUpperCase().slice(0, 45);
    return { stat, label: label.slice(0, 45) };
  }

  // × multiplier
  const xMatch = bodyClean.match(/(\d+(?:\.\d+)?)\s*x\b/);
  if (xMatch) {
    return { stat: xMatch[1] + "×", label: headline.toUpperCase().slice(0, 45) };
  }

  // Specific number + unit (e.g. "27 minutes", "400 mg")
  const unitMatch = bodyClean.match(/(\d+(?:\.\d+)?)\s*(minutes?|hours?|mg|mcg|iu)\b/i);
  if (unitMatch) {
    return {
      stat: unitMatch[1] + " " + unitMatch[2].toLowerCase(),
      label: headline.toUpperCase().slice(0, 45),
    };
  }

  return { stat: "—", label: headline.toUpperCase().slice(0, 45) };
}

// ── Bars extractor ────────────────────────────────────────────────────────────

function extractBars(body: string): BarsData {
  const bodyClean = body.replace(/Research:.*$/i, "");

  // Match "Label ... X%" patterns — grab up to 3
  const pctRe = /([A-Za-z][A-Za-z\s\-]{2,20})\b[^%\n]{0,50}(\d+(?:\.\d+)?%)/g;
  const hits: { label: string; value: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pctRe.exec(bodyClean)) !== null && hits.length < 3) {
    const label = m[1].trim().replace(/\b(in|a|the|that|of|with|for|by|at|to|and)\b/gi, "").trim();
    if (label.length >= 3) hits.push({ label: label.slice(0, 16), value: m[2] });
  }
  if (hits.length >= 2) return { items: hits };

  // vs / compared-to pair without explicit % — extract the two terms
  const vsMatch = bodyClean.match(
    /([A-Za-z][A-Za-z\s\-]{2,20})\s+(?:vs\.?|versus|compared to|over placebo)\s+([A-Za-z][A-Za-z\s\-]{2,20})/i
  );
  if (vsMatch) {
    return {
      items: [
        { label: vsMatch[1].trim().slice(0, 16), value: "▲" },
        { label: vsMatch[2].trim().slice(0, 16), value: "▼" },
      ],
    };
  }

  // Generic fallback
  return {
    items: [
      { label: "Treatment",  value: "↑" },
      { label: "Placebo",    value: "→" },
    ],
  };
}

// ── Steps extractor ───────────────────────────────────────────────────────────

function extractSteps(body: string): StepsData {
  // 1. Numbered list: "1. ...", "2. ..."
  const numbered = [...body.matchAll(/\b[1-4]\.\s+([^.!?\n]{15,80})/g)].map(m => m[1].trim());
  if (numbered.length >= 2) return { steps: numbered.slice(0, 4) };

  // 2. Sequential connectors at sentence start
  const seqRe = /(?:^|\.\s+)(First|Second|Third|Then|Next|Finally|Also|Start by|Begin by)[,\s]+([^.!?]{15,80})/gi;
  const seqHits: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = seqRe.exec(body)) !== null && seqHits.length < 4) {
    seqHits.push(sm[2].trim());
  }
  if (seqHits.length >= 2) return { steps: seqHits };

  // 3. Split into short sentences as fallback
  const sentences = body
    .split(/[.!?]+/)
    .map(s => s.replace(/Research:.*/i, "").trim())
    .filter(s => s.length >= 20 && s.length <= 80);
  if (sentences.length >= 2) return { steps: sentences.slice(0, 4) };

  return { steps: ["Take Lunia 30 min before bed", "Dim lights", "Avoid screens", "Set room to 18°C"] };
}

// ── Chain extractor ───────────────────────────────────────────────────────────

function extractChain(body: string): ChainData {
  const b = body.toLowerCase();

  // "without X ... with Y" or "before ... after"
  if (/without\b/.test(b) && /with\b/.test(b))
    return { labels: ["Without Lunia", "With Lunia"] };
  if (/before\b/.test(b) && /after\b/.test(b))
    return { labels: ["Before", "After Lunia"] };

  // Phase / stage labels
  const stages = [...body.matchAll(/\b(stage \w+|phase \d+|[A-Z][a-z]+ phase|[A-Z][a-z]+ stage)\b/g)];
  if (stages.length >= 2)
    return { labels: [stages[0][1], stages[1][1]] };

  return { labels: ["Baseline", "With Lunia"] };
}
