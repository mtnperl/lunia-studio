import { kv } from '@/lib/kv';
import { calcROAS, computeDateRange } from '@/lib/analytics-utils';
import type { MetaData, MetaCampaign, MetaAdInsight, MetaAd } from '@/lib/types';

export const maxDuration = 30;

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockData(days: number): MetaData {
  const campaigns: MetaCampaign[] = [
    { campaignId: 'c1', campaignName: 'Sleep Formula | Prospecting', campaignObjective: 'OUTCOME_SALES',       spend: 4200, revenue: 17640, roas: 4.2, impressions: 310000, clicks: 4800, ctr: 1.55, linkClicks: 3900, cpm: 13.55, purchases: 42 },
    { campaignId: 'c2', campaignName: 'Retargeting — 30d',           campaignObjective: 'OUTCOME_SALES',       spend: 1800, revenue: 6120,  roas: 3.4, impressions: 95000,  clicks: 2100, ctr: 2.21, linkClicks: 1800, cpm: 18.95, purchases: 18 },
    { campaignId: 'c3', campaignName: 'Lookalike 3% — Sleep',        campaignObjective: 'OUTCOME_TRAFFIC',     spend: 2100, revenue: 5040,  roas: 2.4, impressions: 180000, clicks: 2900, ctr: 1.61, linkClicks: 2400, cpm: 11.67, purchases: 21 },
    { campaignId: 'c4', campaignName: 'Broad — Wellness',            campaignObjective: 'OUTCOME_AWARENESS',   spend: 950,  revenue: 1330,  roas: 1.4, impressions: 120000, clicks: 1400, ctr: 1.17, linkClicks: 1100, cpm: 7.92,  purchases: 5  },
  ];

  const totalSpend   = campaigns.reduce((s, c) => s + c.spend,   0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);

  // Generate ramp-up → peak → slight-decline day pattern
  const by_day: MetaAdInsight[] = [];
  const end = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    const t = (days - i) / days; // 0→1 over time
    const wave = 0.6 + 0.4 * Math.sin(t * Math.PI); // ramp up then down
    const daySpend   = Math.round((totalSpend   / days) * wave * 10) / 10;
    const dayRevenue = Math.round((totalRevenue / days) * wave * 10) / 10;
    by_day.push({ date, spend: daySpend, revenue: dayRevenue });
  }

  return {
    summary: {
      spend: totalSpend,
      revenue: totalRevenue,
      roas: calcROAS(totalSpend, totalRevenue),
      impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
      clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
    },
    campaigns,
    ads: [],
    by_day,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const daysParam = url.searchParams.get('days') ?? '30';
  const days = parseInt(daysParam, 10);

  if (![7, 14, 30].includes(days)) {
    return Response.json({ error: 'days must be 7, 14, or 30' }, { status: 400 });
  }

  const isMock = url.searchParams.get('mock') === 'true';
  if (isMock) {
    return Response.json(buildMockData(days));
  }

  const META_ACCESS_TOKEN  = process.env.META_ACCESS_TOKEN;
  const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
    return Response.json({ error: 'Meta credentials not configured' }, { status: 503 });
  }

  const cacheKey = `analytics:meta:${days}`;
  const bust = url.searchParams.get('bust') === '1';

  if (!bust) {
    try {
      const cached = await kv.get<MetaData>(cacheKey);
      if (cached) return Response.json(cached);
    } catch { /* Redis unavailable — fetch live */ }
  }

  try {
    const { start, end } = computeDateRange(days);

    const graphBase = `https://graph.facebook.com/v21.0`;

    // ── 1. Fetch campaign objectives from /campaigns endpoint ──────────────────
    // campaign_objective is a Campaign field, not an Insights field — separate call required
    const objectiveMap = new Map<string, string>();
    try {
      const campParams = new URLSearchParams({
        fields: 'id,objective',
        limit: '500',
        access_token: META_ACCESS_TOKEN,
      });
      const campRes = await fetch(`${graphBase}/act_${META_AD_ACCOUNT_ID}/campaigns?${campParams}`);
      if (campRes.ok) {
        const campJson = await campRes.json() as { data: Array<{ id: string; objective?: string }> };
        for (const c of campJson.data ?? []) {
          if (c.objective) objectiveMap.set(c.id, c.objective);
        }
      }
    } catch { /* non-fatal — objectives will be undefined */ }

    // ── 2. Fetch insights ──────────────────────────────────────────────────────
    const params = new URLSearchParams({
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,action_values,actions',
      level: 'campaign',
      time_range: JSON.stringify({ since: start, until: end }),
      time_increment: '1',
      access_token: META_ACCESS_TOKEN,
      limit: '500',
    });

    const baseUrl = `${graphBase}/act_${META_AD_ACCOUNT_ID}/insights`;

    // Campaign-level aggregation maps
    const campaignMap = new Map<string, { name: string; spend: number; revenue: number; impressions: number; clicks: number; linkClicks: number; purchases: number }>();
    const dayMap = new Map<string, { spend: number; revenue: number }>();

    let nextUrl: string | null = `${baseUrl}?${params}`;
    let pages = 0;

    while (nextUrl && pages < 3) {
      const res = await fetch(nextUrl);
      pages++;

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const status = res.status;
        if (status === 401 || status === 403) {
          return Response.json({ error: 'Meta access denied — check your token' }, { status: 502 });
        }
        if (status === 429) {
          return Response.json({ error: 'Meta rate limit — try again in a few minutes' }, { status: 502 });
        }
        console.error('[api/meta] Meta API error', status, errBody);
        return Response.json({ error: 'Meta data unavailable — try refreshing' }, { status: 502 });
      }

      const json = await res.json() as {
        data: Array<{
          campaign_id: string;
          campaign_name: string;
          spend: string;
          impressions: string;
          clicks: string;
          date_start: string;
          action_values?: Array<{ action_type: string; value: string }>;
        }>;
        paging?: { next?: string };
      };

      for (const row of json.data) {
        const spend = parseFloat(row.spend ?? '0');
        const revenue = (row.action_values ?? [])
          .filter(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')
          .reduce((s, a) => s + parseFloat(a.value), 0);
        const impressions = parseInt(row.impressions ?? '0', 10);
        const clicks = parseInt(row.clicks ?? '0', 10);
        const linkClicks = parseInt((row as any).inline_link_clicks ?? '0', 10);
        const purchases = ((row as any).actions ?? [])
          .filter((a: { action_type: string }) => a.action_type === 'offsite_conversion.fb_pixel_purchase')
          .reduce((s: number, a: { value: string }) => s + parseFloat(a.value), 0);

        // Campaign aggregation
        const existing = campaignMap.get(row.campaign_id);
        if (existing) {
          existing.spend += spend;
          existing.revenue += revenue;
          existing.impressions += impressions;
          existing.clicks += clicks;
          existing.linkClicks += linkClicks;
          existing.purchases += purchases;
        } else {
          campaignMap.set(row.campaign_id, { name: row.campaign_name, spend, revenue, impressions, clicks, linkClicks, purchases });
        }

        // Day aggregation
        const day = dayMap.get(row.date_start) ?? { spend: 0, revenue: 0 };
        day.spend += spend;
        day.revenue += revenue;
        dayMap.set(row.date_start, day);
      }

      nextUrl = json.paging?.next ?? null;
    }

    // Build response — join objectives from the separate campaigns call
    const campaigns: MetaCampaign[] = Array.from(campaignMap.entries()).map(([id, c]) => ({
      campaignId: id,
      campaignName: c.name,
      campaignObjective: objectiveMap.get(id),
      spend: c.spend,
      revenue: c.revenue,
      roas: calcROAS(c.spend, c.revenue),
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      linkClicks: c.linkClicks,
      purchases: c.purchases,
    }));

    const by_day: MetaAdInsight[] = Array.from(dayMap.entries())
      .map(([date, d]) => ({ date, spend: d.spend, revenue: d.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSpend   = campaigns.reduce((s, c) => s + c.spend,   0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);

    // ── Ad-level fetch (single page, non-fatal) ────────────────────────────────
    let ads: MetaAd[] = [];
    try {
      const adParams = new URLSearchParams({
        fields: 'ad_id,ad_name,adset_name,campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,action_values,actions',
        level: 'ad',
        time_range: JSON.stringify({ since: start, until: end }),
        access_token: META_ACCESS_TOKEN,
        limit: '500',
      });
      const adRes = await fetch(`${graphBase}/act_${META_AD_ACCOUNT_ID}/insights?${adParams}`);
      if (adRes.ok) {
        const adJson = await adRes.json() as { data: any[] };
        ads = (adJson.data ?? []).map((row: any) => {
          const adSpend = parseFloat(row.spend ?? '0');
          const adRevenue = (row.action_values ?? [])
            .filter((a: { action_type: string }) => a.action_type === 'offsite_conversion.fb_pixel_purchase')
            .reduce((s: number, a: { value: string }) => s + parseFloat(a.value), 0);
          const adImpressions = parseInt(row.impressions ?? '0', 10);
          const adClicks = parseInt(row.clicks ?? '0', 10);
          const adLinkClicks = parseInt(row.inline_link_clicks ?? '0', 10);
          const adPurchases = (row.actions ?? [])
            .filter((a: { action_type: string }) => a.action_type === 'offsite_conversion.fb_pixel_purchase')
            .reduce((s: number, a: { value: string }) => s + parseFloat(a.value), 0);
          return {
            adId: row.ad_id,
            adName: row.ad_name,
            adsetName: row.adset_name,
            campaignId: row.campaign_id,
            campaignName: row.campaign_name,
            spend: adSpend,
            revenue: adRevenue,
            roas: calcROAS(adSpend, adRevenue),
            impressions: adImpressions,
            clicks: adClicks,
            linkClicks: adLinkClicks,
            ctr: adImpressions > 0 ? (adLinkClicks / adImpressions) * 100 : 0,
            cpm: adImpressions > 0 ? (adSpend / adImpressions) * 1000 : 0,
            purchases: adPurchases,
          } as MetaAd;
        });
      }
    } catch (err) {
      console.warn('[api/meta] ad-level fetch failed (non-fatal):', err);
    }

    const data: MetaData = {
      summary: {
        spend: totalSpend,
        revenue: totalRevenue,
        roas: calcROAS(totalSpend, totalRevenue),
        impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
        clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      },
      campaigns,
      ads,
      by_day,
    };

    console.log('[api/meta] days=%d spend=%f roas=%f pages=%d', days, totalSpend, data.summary.roas, pages);

    try {
      await kv.set(cacheKey, data, { ex: 7200 });
    } catch { /* silently skip cache write */ }

    return Response.json(data);
  } catch (err) {
    console.error('[api/meta] error', err);
    return Response.json({ error: 'Meta data unavailable — try refreshing' }, { status: 502 });
  }
}
