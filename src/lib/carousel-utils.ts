import { GraphicStyle } from "./types";

/**
 * Infer the best graphic style for a content slide based on its text.
 *
 * Priority order (first match wins):
 *  stat      — specific % / numeric claims
 *  wave      — sleep cycles, circadian, REM, brainwave rhythm
 *  bars      — comparisons, vs, placebo, before/after
 *  steps     — routines, protocols, numbered/sequential advice
 *  dotchain  — biological pathways, mechanisms, processes over time
 *  iconGrid  — multiple distinct ingredients, benefits, or concepts
 *  textOnly  — fallback
 */
export function inferGraphicStyle(headline: string, body: string): GraphicStyle {
  const t = (headline + " " + body).toLowerCase();

  // Stat: percentages, specific quantified claims
  if (
    /%/.test(t) ||
    /\b\d+\s*(mg|mcg|iu|percent|out of|people|adults|participants|subjects)\b/.test(t) ||
    /\bone in \d+\b/.test(t) ||
    /\d+x (more|less|faster|better|higher|lower)\b/.test(t) ||
    /\bstatistic|clinical trial|study found|research show/.test(t)
  ) {
    return "stat";
  }

  // Wave: sleep cycles, circadian biology, brainwave / EEG rhythm
  if (
    /sleep (cycle|stage|architecture|depth)|circadian|rem (sleep|phase)|nrem|slow.wave|deep sleep|light sleep|brainwave|sleep oscillat|delta wave/.test(t)
  ) {
    return "wave";
  }

  // Bars: explicit comparisons between two things
  if (
    /\bvs\b|versus|compar(ed|ison)|placebo|control group|outperform|better than|worse than|difference between|rather than|instead of|unlike/.test(t)
  ) {
    return "bars";
  }

  // Steps: routines, protocols, numbered / sequential advice
  if (
    /\bstep\b|routine|protocol|how to|habit|practice|nightly|wind.down|schedule|checklist/.test(t) ||
    /\b(first|second|third|finally|next step|start with|follow with|end with)\b/.test(t) ||
    /\b(1\.|2\.|3\.|①|②|③)\b/.test(t)
  ) {
    return "steps";
  }

  // Dotchain: biological pathways, mechanisms, cascade processes over time
  if (
    /pathway|mechanism|cascade|signal(ing)?|receptor|convert|trigger|release|absorb(ed|tion)|cross(es)? the|blood.brain|metabol|synthes(is|ize)|activate|upregulat/.test(t) ||
    /\bover (time|weeks|days|hours|minutes)\b/.test(t) ||
    /\bwithin \d+ (hours?|minutes?|days?)\b/.test(t)
  ) {
    return "dotchain";
  }

  // IconGrid: multiple distinct ingredients, benefits, or parallel concepts
  if (
    /magnesium.*(theanine|apigenin)|theanine.*(magnesium|apigenin)|apigenin.*(magnesium|theanine)/.test(t) ||
    /\bingredient|compound|formula|stack|combination|(three|four|five|six) (benefits?|reason|key|thing|factor|way)/.test(t) ||
    /benefits? include|include.*include|components? are/.test(t)
  ) {
    return "iconGrid";
  }

  return "textOnly";
}
