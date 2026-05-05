import { createContentMessage, extractText, CONTENT_MODEL, CONTENT_THINKING, CONTENT_MAX_TOKENS_SHORT } from '@/lib/anthropic';
import type { MetaData, ShopifyData, Insight, MetaCampaign, MetaAd } from '@/lib/types';

export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a DTC performance marketing analyst for Lunia Life, a sleep supplement brand.
You have deep expertise in Meta advertising and Shopify analytics.
Analyze the provided data snapshot and return exactly 4-5 specific, actionable recommendations.
Each recommendation must reference specific numbers from the data.
Classify each as: "positive" (something working well to double down on), "warning" (something needing attention), or "neutral" (context or observation).
Format as a JSON array: [{ "type": "positive"|"warning"|"neutral", "title": string, "body": string }]
Return ONLY the JSON array. No preamble, no markdown fences, no explanation outside the JSON.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Anthropic API key not configured' }, { status: 503 });
  }

  let body: {
    meta?: MetaData;
    shopify?: ShopifyData;
    days?: number;
    campaignId?: string;
    adId?: string;
    campaigns?: MetaCampaign[];
    ads?: MetaAd[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.meta || !body.shopify) {
    return Response.json({ error: 'meta and shopify data are required' }, { status: 400 });
  }

  const { meta, shopify, days = 30, campaignId, adId, campaigns = [], ads = [] } = body;

  // Determine targeted analysis context
  const targetedAd = adId ? ads.find(a => a.adId === adId) ?? meta.ads?.find(a => a.adId === adId) : undefined;
  const targetedCampaign = campaignId
    ? campaigns.find(c => c.campaignId === campaignId) ?? meta.campaigns.find(c => c.campaignId === campaignId)
    : undefined;

  let systemPrompt = SYSTEM_PROMPT;
  let userMessage: string;

  if (adId && targetedAd) {
    systemPrompt = `You are a DTC performance marketing analyst for Lunia Life, a sleep supplement brand.
You are analyzing a specific ad: "${targetedAd.adName}". Focus your 4 recommendations entirely on this ad's performance and what specifically can be done to improve or scale it.
Each recommendation must reference specific numbers from the data.
Classify each as: "positive" (something working well to double down on), "warning" (something needing attention), or "neutral" (context or observation).
Format as a JSON array: [{ "type": "positive"|"warning"|"neutral", "title": string, "body": string }]
Return ONLY the JSON array. No preamble, no markdown fences, no explanation outside the JSON.`;

    userMessage = [
      `Period: last ${days} days`,
      ``,
      `Ad being analyzed: ${targetedAd.adName}`,
      `Campaign: ${targetedAd.campaignName}`,
      `Ad set: ${targetedAd.adsetName ?? 'N/A'}`,
      `Spend: $${targetedAd.spend.toFixed(0)}`,
      `Revenue: $${targetedAd.revenue.toFixed(0)}`,
      `ROAS: ${targetedAd.roas.toFixed(2)}x`,
      `Impressions: ${targetedAd.impressions.toLocaleString()}`,
      `Link Clicks: ${targetedAd.linkClicks.toLocaleString()}`,
      `CTR: ${targetedAd.ctr.toFixed(2)}%`,
      `CPM: $${targetedAd.cpm.toFixed(2)}`,
      `Purchases: ${Math.round(targetedAd.purchases)}`,
      ``,
      `Overall account context: spend $${meta.summary.spend.toFixed(0)}, ROAS ${meta.summary.roas.toFixed(2)}x`,
      `Shopify: ${shopify.summary.orders} orders, $${shopify.summary.revenue.toFixed(0)} revenue, AOV $${shopify.summary.aov.toFixed(0)}`,
    ].join('\n');
  } else if (campaignId && targetedCampaign) {
    systemPrompt = `You are a DTC performance marketing analyst for Lunia Life, a sleep supplement brand.
You are analyzing a specific campaign: "${targetedCampaign.campaignName}". Provide in-depth, specific recommendations for this campaign's performance, budget allocation, audience targeting, and creative strategy.
Each recommendation must reference specific numbers from the data.
Classify each as: "positive" (something working well to double down on), "warning" (something needing attention), or "neutral" (context or observation).
Format as a JSON array: [{ "type": "positive"|"warning"|"neutral", "title": string, "body": string }]
Return ONLY the JSON array. No preamble, no markdown fences, no explanation outside the JSON.`;

    const campaignAds = (meta.ads ?? []).filter(a => a.campaignId === campaignId);

    userMessage = [
      `Period: last ${days} days`,
      ``,
      `Campaign being analyzed: ${targetedCampaign.campaignName}`,
      `Objective: ${targetedCampaign.campaignObjective ?? 'N/A'}`,
      `Spend: $${targetedCampaign.spend.toFixed(0)}`,
      `Revenue: $${targetedCampaign.revenue.toFixed(0)}`,
      `ROAS: ${targetedCampaign.roas.toFixed(2)}x`,
      `Impressions: ${targetedCampaign.impressions.toLocaleString()}`,
      `Link Clicks: ${targetedCampaign.linkClicks.toLocaleString()}`,
      `CTR: ${targetedCampaign.ctr.toFixed(2)}%`,
      `CPM: $${targetedCampaign.cpm.toFixed(2)}`,
      `Purchases: ${Math.round(targetedCampaign.purchases)}`,
      ...(campaignAds.length > 0 ? [
        ``,
        `Ads in this campaign:`,
        ...campaignAds.slice(0, 5).map(a => `  - ${a.adName}: ROAS ${a.roas.toFixed(2)}x, spend $${a.spend.toFixed(0)}, CTR ${a.ctr.toFixed(2)}%, CPM $${a.cpm.toFixed(2)}`),
      ] : []),
      ``,
      `Overall account context: spend $${meta.summary.spend.toFixed(0)}, ROAS ${meta.summary.roas.toFixed(2)}x`,
      `Shopify: ${shopify.summary.orders} orders, $${shopify.summary.revenue.toFixed(0)} revenue, AOV $${shopify.summary.aov.toFixed(0)}`,
    ].join('\n');
  } else {
    // Generic analysis
    userMessage = [
      `Period: last ${days} days`,
      `Meta: spend $${meta.summary.spend.toFixed(0)}, revenue $${meta.summary.revenue.toFixed(0)}, ROAS ${meta.summary.roas.toFixed(2)}x, ${meta.summary.impressions.toLocaleString()} impressions, ${meta.summary.clicks.toLocaleString()} clicks`,
      `Shopify: ${shopify.summary.orders} orders, $${shopify.summary.revenue.toFixed(0)} revenue, AOV $${shopify.summary.aov.toFixed(0)}`,
      `Top campaigns:`,
      ...meta.campaigns.slice(0, 5).map(c => `  - ${c.campaignName}: ROAS ${c.roas.toFixed(2)}x, spend $${c.spend.toFixed(0)}`),
    ].join('\n');
  }

  let raw: string;
  try {
    const message = await createContentMessage({
      model: CONTENT_MODEL,
      max_tokens: CONTENT_MAX_TOKENS_SHORT,
      thinking: CONTENT_THINKING,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    raw = extractText(message).trim();
  } catch (err) {
    const status = (err as { status?: number })?.status;
    console.error('[api/insights] Anthropic API error', { status, err });
    if (status === 401 || status === 403) {
      return Response.json({ error: 'Anthropic API key invalid or revoked' }, { status: 401 });
    }
    if (status === 429) {
      return Response.json({ error: 'Anthropic rate limited — try again in a moment' }, { status: 429 });
    }
    if (status && status >= 500) {
      return Response.json({ error: `Anthropic service error (${status}) — try again` }, { status: 502 });
    }
    return Response.json({ error: `Insights call failed${status ? ` (${status})` : ''}` }, { status: 502 });
  }

  try {
    const insights = parseInsights(raw);
    return Response.json(insights);
  } catch (err) {
    console.error('[api/insights] JSON parse failed', { err, raw });
    return Response.json({ error: 'Claude returned malformed JSON — try again' }, { status: 502 });
  }
}

function parseInsights(raw: string): Insight[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned) as Insight[];
  } catch {
    // Tolerant fallback: extract first [...] array even if the model added prose around it.
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as Insight[];
    throw new Error('No JSON array found in response');
  }
}
