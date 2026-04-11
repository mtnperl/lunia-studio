import { anthropic } from '@/lib/anthropic';
import type { MetaData, ShopifyData, Insight, MetaCampaign, MetaAd } from '@/lib/types';

export const maxDuration = 60;

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

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const insights: Insight[] = JSON.parse(cleaned);
    return Response.json(insights);
  } catch (err) {
    console.error('[api/insights] parse or API error', err);
    const fallback: Insight[] = [{ type: 'neutral', title: 'Analysis unavailable', body: 'Unable to parse insights — check your API key.' }];
    return Response.json(fallback);
  }
}
