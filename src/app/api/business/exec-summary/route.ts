import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_SHORT,
} from "@/lib/anthropic";
import type { PnL } from "@/lib/business-types";

export const maxDuration = 300;

const SYSTEM_PROMPT = `You are the in-house CFO advisor for Lunia Life, a DTC sleep supplement brand run by a single founder.

You are given a live P&L snapshot (current period + prior period deltas, unit economics, and any missing data sources).

Your job:
- Write 2 to 3 short sentences (max ~80 words total) that surface what is ACTUALLY moving in the business right now and one specific next move.
- Lead with the biggest material change (revenue, margin, ad spend, or a fixed-expense category that shifted).
- Cite specific numbers from the data — do NOT speak generically.
- If unit economics are concerning (LTV:CAC < 3, payback > 6 months, net margin < 5%), name it and recommend a concrete action.
- If the P&L has \`missing\` sources, do not pretend they're zero — note the caveat briefly.

Tone: direct, plainspoken, founder-to-founder. No fluff, no hedging, no filler. No emoji. No headers or bullet points — pure prose.

Return ONLY the prose. No JSON, no markdown, no preamble.`;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pnl } = body as { pnl?: PnL };
  if (!pnl) {
    return Response.json({ error: "pnl is required" }, { status: 400 });
  }

  // Don't write a summary if there's no real revenue to talk about — protects
  // against awkward "Your business made $0 this period" output during onboarding.
  if (pnl.revenue.gross.amount < 100) {
    return Response.json({ summary: null, reason: "Not enough revenue this period." });
  }

  const userMessage = formatPnlForPrompt(pnl);

  try {
    const message = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
    const summary = extractText(message).trim();
    if (!summary) {
      return Response.json({ summary: null, reason: "Empty response." });
    }
    return Response.json({ summary });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    console.error("[api/business/exec-summary] Anthropic error", { status, err });
    if (status === 401 || status === 403) {
      return Response.json({ error: "Anthropic API key invalid or revoked" }, { status: 401 });
    }
    if (status === 429) {
      return Response.json({ error: "Anthropic rate limited" }, { status: 429 });
    }
    return Response.json({ error: "Could not generate summary" }, { status: 502 });
  }
}

function formatPnlForPrompt(pnl: PnL): string {
  const lines: string[] = [];
  lines.push(`Period: ${pnl.range.since} to ${pnl.range.until}`);
  if (pnl.priorRange) {
    lines.push(`Prior period for comparison: ${pnl.priorRange.since} to ${pnl.priorRange.until}`);
  }
  if (pnl.missing.length > 0) {
    lines.push(`Missing data sources: ${pnl.missing.join(", ")}`);
  }
  lines.push("");

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const deltaStr = (l: PnL["revenue"]["gross"]) =>
    l.delta ? ` (${l.delta.pct >= 0 ? "+" : ""}${l.delta.pct.toFixed(1)}% vs prior)` : "";

  lines.push(`Revenue:`);
  lines.push(`  Gross: ${fmt(pnl.revenue.gross.amount)}${deltaStr(pnl.revenue.gross)}`);
  lines.push(`  Refunds: ${fmt(pnl.revenue.refunds.amount)}`);
  lines.push(`  Net: ${fmt(pnl.revenue.net.amount)}${deltaStr(pnl.revenue.net)}`);
  lines.push("");

  lines.push(`COGS total: ${fmt(pnl.cogs.total.amount)}${deltaStr(pnl.cogs.total)}`);
  lines.push(`Gross profit: ${fmt(pnl.grossProfit.amount)}${deltaStr(pnl.grossProfit)} — gross margin ${pnl.grossMarginPct.toFixed(1)}%`);
  lines.push("");

  lines.push(`OpEx:`);
  lines.push(`  Ad spend (Meta): ${fmt(pnl.opex.adSpend.amount)}${deltaStr(pnl.opex.adSpend)}`);
  lines.push(`  Fixed (SimpleFIN): ${fmt(pnl.opex.fixedExpenses.amount)}${deltaStr(pnl.opex.fixedExpenses)}`);
  for (const [cat, amt] of Object.entries(pnl.opex.fixedByCategory)) {
    if (amt > 0) lines.push(`    ${cat}: ${fmt(amt)}`);
  }
  lines.push("");

  lines.push(`Net income: ${fmt(pnl.netIncome.amount)}${deltaStr(pnl.netIncome)} — net margin ${pnl.netMarginPct.toFixed(1)}%`);
  lines.push("");

  lines.push(`Unit economics (gross-revenue LTV per customer):`);
  lines.push(`  CAC: ${fmt(pnl.unitEconomics.cac)}`);
  lines.push(`  LTV blended: ${fmt(pnl.unitEconomics.blendedLtv)}  (subscriber ${fmt(pnl.unitEconomics.subLtv)} / one-time ${fmt(pnl.unitEconomics.otpLtv)})`);
  lines.push(`  ROAS (period-blended): ${pnl.unitEconomics.roas.toFixed(2)}x`);

  return lines.join("\n");
}
