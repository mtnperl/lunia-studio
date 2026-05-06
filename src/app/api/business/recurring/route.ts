import { z } from "zod";
import { kv } from "@/lib/kv";
import { fetchSimpleFin } from "@/lib/simplefin-client";
import { detectRecurring, type RecurringExpense, type RecurringFlag } from "@/lib/recurring-detector";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import {
  EXPENSE_CATEGORY_LABELS,
  type Categorization,
} from "@/lib/business-types";

export const maxDuration = 300;

const WINDOW_DAYS = 180;
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour
const FLAG_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days — flags are stable

const FlagSchema = z.object({
  results: z.array(
    z.object({
      payeeKey: z.string(),
      flag: z.enum(["essential", "review", "cuttable"]),
      reason: z.string().min(1).max(180),
    })
  ),
});

const FLAG_SYSTEM_PROMPT = `You evaluate recurring business expenses for Lunia Life, a DTC sleep supplement brand. For each vendor on the list, assign exactly one flag:

- essential — critical to operate. Cutting would break the business. Examples: Shopify, payment processors (Stripe, Shop Pay), 3PL/fulfilment, payroll providers, business insurance, primary email/marketing automation if proven driver.
- review — worth a periodic look but not obviously cuttable. Mid-tier SaaS the team uses, design tools, analytics platforms, accounting software at the brand's scale.
- cuttable — likely candidate to cancel, downgrade, or replace with a free/cheaper alternative. Signals: redundant tools (multiple analytics/email platforms), trial-converted-to-paid that no one uses, expensive add-ons, low-cadence services, anything where amount × usage ≤ value.

Bias toward "review" when uncertain. Only flag "cuttable" when there's a defensible reason (redundancy, cheap alternative, low-impact service for a small DTC).

Reason field: ONE short sentence (under 140 chars) — what to verify or why it's classified that way. No fluff, no hedging like "may be" or "could potentially". Direct.

Return STRICT JSON only:
{
  "results": [
    { "payeeKey": "<key from input>", "flag": "essential" | "review" | "cuttable", "reason": "<1 sentence>" }
  ]
}

Order and payeeKeys must match the input exactly.`;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bust = url.searchParams.get("bust") === "1";

  const accessUrl = process.env.SIMPLEFIN_ACCESS_URL;
  if (!accessUrl) {
    return Response.json({
      recurring: [],
      monthlyTotal: 0,
      windowDays: WINDOW_DAYS,
      reason: "simplefin_not_connected",
    });
  }

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const since = new Date(todayUtc.getTime() - (WINDOW_DAYS - 1) * 86_400_000).toISOString().slice(0, 10);
  const until = todayUtc.toISOString().slice(0, 10);

  const cacheKey = `business:recurring:v1:${since}_${until}`;
  if (!bust) {
    try {
      const cached = await kv.get<{
        recurring: RecurringExpense[];
        monthlyTotal: number;
        windowDays: number;
        computedAt: string;
      }>(cacheKey);
      if (cached) {
        // Merge fresh notes onto the cached payload — note edits should never
        // wait an hour for the cache to roll over.
        const recurring = await mergeNotes(cached.recurring);
        return Response.json({ ...cached, recurring });
      }
    } catch {
      /* KV unavailable — fall through */
    }
  }

  try {
    const data = await fetchSimpleFin(accessUrl, since, until);
    const txns = data.transactions;

    // Pull every cached categorization for the window so detected groups can
    // tag themselves with a category. Missing → uncategorized.
    const categorizations = new Map<string, Categorization>();
    await Promise.all(
      txns.map(async (t) => {
        try {
          const cat = await kv.get<Categorization>(`simplefin:cat:v2:${t.id}`);
          if (cat) categorizations.set(t.id, cat);
        } catch {
          /* ignore */
        }
      })
    );

    const recurring = detectRecurring(txns, categorizations);

    // Enrich each item with an AI-assigned essential / review / cuttable flag.
    const enriched = await enrichWithFlags(recurring);
    const monthlyTotal = enriched.reduce((s, r) => s + r.monthlyImpact, 0);

    const payload = {
      recurring: enriched,
      monthlyTotal,
      windowDays: WINDOW_DAYS,
      computedAt: new Date().toISOString(),
    };

    try {
      await kv.set(cacheKey, payload, { ex: CACHE_TTL_SECONDS });
    } catch {
      /* skip cache write */
    }

    // Always merge user-authored notes onto the response — kept out of the cache so
    // edits show up immediately without busting flags or detection.
    const withNotes = {
      ...payload,
      recurring: await mergeNotes(payload.recurring),
    };

    console.log(
      "[api/business/recurring] window=%dd txns=%d detected=%d monthly_total=$%.0f cuttable=%d",
      WINDOW_DAYS,
      txns.length,
      enriched.length,
      monthlyTotal,
      enriched.filter((r) => r.flag === "cuttable").length,
    );

    return Response.json(withNotes);
  } catch (err) {
    console.error("[api/business/recurring] error", err);
    return Response.json(
      { error: "Could not detect recurring expenses" },
      { status: 502 }
    );
  }
}

// ── Flag enrichment ──────────────────────────────────────────────────────

async function enrichWithFlags(items: RecurringExpense[]): Promise<RecurringExpense[]> {
  if (items.length === 0) return items;

  // Pull cached flags first.
  type FlagRecord = { flag: RecurringFlag; reason: string };
  const cached = new Map<string, FlagRecord>();
  await Promise.all(
    items.map(async (r) => {
      try {
        const hit = await kv.get<FlagRecord>(`business:recurring:flag:v1:${r.payeeKey}`);
        if (hit) cached.set(r.payeeKey, hit);
      } catch {
        /* ignore */
      }
    }),
  );

  const toClassify = items.filter((r) => !cached.has(r.payeeKey));

  if (toClassify.length > 0) {
    try {
      const classified = await classifyFlags(toClassify);
      for (const c of classified) {
        cached.set(c.payeeKey, { flag: c.flag, reason: c.reason });
        try {
          await kv.set(`business:recurring:flag:v1:${c.payeeKey}`, { flag: c.flag, reason: c.reason }, {
            ex: FLAG_CACHE_TTL_SECONDS,
          });
        } catch {
          /* skip cache write */
        }
      }
    } catch (err) {
      console.warn("[api/business/recurring] flag classification failed — returning unflagged", err);
    }
  }

  return items.map((r) => {
    const f = cached.get(r.payeeKey);
    return f ? { ...r, flag: f.flag, reason: undefined, flagReason: f.reason } : r;
  });
}

async function classifyFlags(items: RecurringExpense[]): Promise<Array<{ payeeKey: string; flag: RecurringFlag; reason: string }>> {
  const userMessage = items
    .map((r, idx) =>
      `#${idx + 1} payeeKey=${r.payeeKey} | vendor=${r.payeeLabel} | category=${EXPENSE_CATEGORY_LABELS[r.category]} | cadence=${r.cadence} | monthly=$${r.monthlyImpact.toFixed(0)} | annualized=$${(r.monthlyImpact * 12).toFixed(0)}`
    )
    .join("\n");

  const message = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_LONG,
    thinking: CONTENT_THINKING,
    system: FLAG_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Classify these ${items.length} recurring vendors:\n\n${userMessage}\n\nReturn strict JSON: {"results":[...]}`,
      },
    ],
  });

  const raw = extractText(message).trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = FlagSchema.parse(JSON.parse(cleaned));
  return parsed.results;
}

// ── Manual notes ─────────────────────────────────────────────────────────

const NoteSchema = z.object({
  payeeKey: z.string().min(1),
  note: z.string().max(500),
});

const NOTE_KEY = (payeeKey: string) => `business:recurring:note:v1:${payeeKey}`;

async function mergeNotes(items: RecurringExpense[]): Promise<RecurringExpense[]> {
  if (items.length === 0) return items;
  const notes = await Promise.all(
    items.map(async (r) => {
      try {
        return await kv.get<string>(NOTE_KEY(r.payeeKey));
      } catch {
        return null;
      }
    }),
  );
  return items.map((r, i) => (notes[i] ? { ...r, note: notes[i] ?? undefined } : r));
}

/** PUT { payeeKey, note } — save or clear (empty string clears) the note for one vendor. */
export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = NoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "payeeKey + note required (note ≤ 500 chars)" }, { status: 400 });
  }
  const { payeeKey, note } = parsed.data;
  try {
    if (note.trim().length === 0) {
      // Empty = clear. Set to empty string with no TTL — KV will eventually expire if unused.
      await kv.set(NOTE_KEY(payeeKey), "");
    } else {
      await kv.set(NOTE_KEY(payeeKey), note.trim());
    }
    return Response.json({ ok: true, payeeKey, note: note.trim() });
  } catch (err) {
    console.error("[api/business/recurring PUT note]", err);
    return Response.json({ error: "Could not save note" }, { status: 503 });
  }
}
