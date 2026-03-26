import { kv } from '@/lib/kv';
import { calcROAS, computeDateRange } from '@/lib/analytics-utils';
import type { MetaData, MetaCampaign, MetaAdInsight } from '@/lib/types';

export const maxDuration = 30;

// ── Mock data ─────────────────────────────────────────────────────────────────

function buildMockData(days: number): MetaData {
  const campaigns: MetaCampaign[] = [
    { campaignId: 'c1', campaignName: 'Sleep Formula | Prospecting', spend: 4200, revenue: 17640, roas: 4.2, impressions: 310000, clicks: 4800, ctr: 1.55 },
    { campaignId: 'c2', campaignName: 'Retargeting — 30d',           spend: 1800, revenue: 6120,  roas: 3.4, impressions: 95000,  clicks: 2100, ctr: 2.21 },
    { campaignId: 'c3', campaignName: 'Lookalike 3% — Sleep',        spend: 2100, revenue: 5040,  roas: 2.4, impressions: 180000, clicks: 2900, ctr: 1.61 },
    { campaignId: 'c4', campaignName: 'Broad — Wellness',            spend: 950,  revenue: 1330,  roas: 1.4, impressions: 120000, clicks: 1400, ctr: 1.17 },
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

    // Fetch campaign-level insights with daily breakdown
    const params = new URLSearchParams({
      fields: 'campaign_id,campaign_name,spend,impressions,clicks,action_values,actions',
      level: 'campaign',
      time_range: JSON.stringify({ since: start, until: end }),
      time_increment: '1',
      access_token: META_ACCESS_TOKEN,
      limit: '500',
    });

    const baseUrl = `https://graph.facebook.com/v21.0/act_${META_AD_ACCOUNT_ID}/insights`;

    // Campaign-level aggregation maps
    const campaignMap = new Map<string, { name: string; spend: number; revenue: number; impressions: number; clicks: number }>();
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

        // Campaign aggregation
        const existing = campaignMap.get(row.campaign_id);
        if (existing) {
          existing.spend += spend;
          existing.revenue += revenue;
          existing.impressions += impressions;
          existing.clicks += clicks;
        } else {
          campaignMap.set(row.campaign_id, { name: row.campaign_name, spend, revenue, impressions, clicks });
        }

        // Day aggregation
        const day = dayMap.get(row.date_start) ?? { spend: 0, revenue: 0 };
        day.spend += spend;
        day.revenue += revenue;
        dayMap.set(row.date_start, day);
      }

      nextUrl = json.paging?.next ?? null;
    }

    // Build response
    const campaigns: MetaCampaign[] = Array.from(campaignMap.entries()).map(([id, c]) => ({
      campaignId: id,
      campaignName: c.name,
      spend: c.spend,
      revenue: c.revenue,
      roas: calcROAS(c.spend, c.revenue),
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    }));

    const by_day: MetaAdInsight[] = Array.from(dayMap.entries())
      .map(([date, d]) => ({ date, spend: d.spend, revenue: d.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalSpend   = campaigns.reduce((s, c) => s + c.spend,   0);
    const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);

    const data: MetaData = {
      summary: {
        spend: totalSpend,
        revenue: totalRevenue,
        roas: calcROAS(totalSpend, totalRevenue),
        impressions: campaigns.reduce((s, c) => s + c.impressions, 0),
        clicks: campaigns.reduce((s, c) => s + c.clicks, 0),
      },
      campaigns,
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
