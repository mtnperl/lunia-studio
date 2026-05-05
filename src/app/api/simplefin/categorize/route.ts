import { z } from "zod";
import { kv } from "@/lib/kv";
import {
  createContentMessage,
  extractText,
  CONTENT_MODEL,
  CONTENT_THINKING,
  CONTENT_MAX_TOKENS_LONG,
} from "@/lib/anthropic";
import {
  EXPENSE_CATEGORIES,
  type Categorization,
  type ExpenseCategory,
} from "@/lib/business-types";

export const maxDuration = 300;

const TxnSchema = z.object({
  id: z.string(),
  amount: z.number(),
  description: z.string(),
  payee: z.string().optional(),
  memo: z.string().optional(),
});

const BodySchema = z.object({
  transactions: z.array(TxnSchema),
  forceRefresh: z.boolean().optional(),
});

type IncomingTxn = z.infer<typeof TxnSchema>;

const SYSTEM_PROMPT = `You categorize business bank transactions for Lunia Life, a DTC sleep supplement brand.

Categorize each transaction into ONE of these categories:
- saas         — software subscriptions (Shopify, Klaviyo, AWS, Notion, Figma, Zoom, Vercel, GitHub, Adobe, etc.)
- inventory    — raw materials, packaging, ingredients, contract manufacturing for the supplement product itself
- fulfilment   — outbound shipping, 3PLs, freight, postage, ShipStation, fulfilment centers, courier services
- payroll      — wages, contractors, freelancers, agencies-as-staff, payroll providers (Gusto, Justworks)
- marketing    — paid ads (Meta, Google, TikTok), influencer payments, agencies, PR, paid email lists, sponsorships
- office       — rent, utilities, internet, office supplies, coworking memberships
- travel       — hotels, flights, rideshare during travel, meals while traveling
- professional — accounting, legal, tax, financial services, consulting fees
- other        — bank fees, interest, transfers, refunds, anything legitimately none of the above

Rules:
- If the payee is missing/cryptic and confidence < 0.6, return "other" with low confidence — do NOT guess wildly.
- Inbound deposits (positive amounts) are usually customer revenue or transfers — those are "other" with a note in reasoning.
- Reasoning must be ONE short sentence (under 100 chars), explaining the choice.

Return STRICT JSON only — no markdown, no preamble:
{
  "results": [
    { "id": "<txn id>", "category": "<one of the categories>", "confidence": <0..1>, "reasoning": "<short>" },
    ...
  ]
}

The order and ids in "results" must match the input order and ids exactly.`;

const ResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      category: z.enum(EXPENSE_CATEGORIES as readonly [ExpenseCategory, ...ExpenseCategory[]]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    })
  ),
});

const BATCH_SIZE = 50;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    );
  }

  const { transactions, forceRefresh } = parsed.data;
  const out = new Map<string, Categorization>();
  const toClassify: IncomingTxn[] = [];

  // 1) Pull cached overrides + cached AI results from KV.
  for (const txn of transactions) {
    const key = `simplefin:cat:v1:${txn.id}`;
    if (forceRefresh) {
      toClassify.push(txn);
      continue;
    }
    try {
      const cached = await kv.get<Categorization>(key);
      if (cached) {
        out.set(txn.id, cached);
        continue;
      }
    } catch {
      /* KV unavailable — fall through and classify */
    }
    toClassify.push(txn);
  }

  // 2) Inbound deposits are always "other" with low confidence — skip the LLM call.
  const realToClassify: IncomingTxn[] = [];
  for (const t of toClassify) {
    if (t.amount > 0) {
      const cat: Categorization = {
        txnId: t.id,
        category: "other",
        confidence: 0.5,
        reasoning: "Inbound deposit — not a business expense.",
      };
      out.set(t.id, cat);
      try {
        await kv.set(`simplefin:cat:v1:${t.id}`, cat);
      } catch {
        /* skip cache */
      }
      continue;
    }
    realToClassify.push(t);
  }

  // 3) Classify the remaining outflows in batches.
  for (let i = 0; i < realToClassify.length; i += BATCH_SIZE) {
    const batch = realToClassify.slice(i, i + BATCH_SIZE);
    try {
      const results = await classifyBatch(batch);
      for (const r of results) {
        const cat: Categorization = {
          txnId: r.id,
          category: r.confidence < 0.6 ? "uncategorized" : r.category,
          confidence: r.confidence,
          reasoning: r.reasoning.slice(0, 200),
        };
        out.set(r.id, cat);
        try {
          await kv.set(`simplefin:cat:v1:${r.id}`, cat);
        } catch {
          /* skip cache */
        }
      }

      // Any txn that didn't come back in the response — mark uncategorized so the UI
      // doesn't get stuck on a spinner.
      for (const t of batch) {
        if (!out.has(t.id)) {
          out.set(t.id, {
            txnId: t.id,
            category: "uncategorized",
            confidence: 0,
            reasoning: "Model omitted this transaction from the batch.",
          });
        }
      }
    } catch (err) {
      console.error("[api/simplefin/categorize] batch failed", err);
      // Don't fail the whole call — mark just this batch as uncategorized so the rest
      // (including cached results) still come through.
      for (const t of batch) {
        if (!out.has(t.id)) {
          out.set(t.id, {
            txnId: t.id,
            category: "uncategorized",
            confidence: 0,
            reasoning: "Categorization service unavailable.",
          });
        }
      }
    }
  }

  return Response.json({
    categorizations: transactions.map((t) => out.get(t.id)).filter(Boolean),
  });
}

// ── PUT — manual override for a single txn ───────────────────────────────
const OverrideSchema = z.object({
  txnId: z.string(),
  category: z.enum(EXPENSE_CATEGORIES as readonly [ExpenseCategory, ...ExpenseCategory[]]),
});

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid override" }, { status: 400 });
  }
  const cat: Categorization = {
    txnId: parsed.data.txnId,
    category: parsed.data.category,
    confidence: 1,
    reasoning: "Manual override.",
    override: true,
  };
  try {
    await kv.set(`simplefin:cat:v1:${parsed.data.txnId}`, cat);
    return Response.json(cat);
  } catch {
    return Response.json({ error: "Could not save override" }, { status: 503 });
  }
}

// ── helpers ──────────────────────────────────────────────────────────────

async function classifyBatch(batch: IncomingTxn[]) {
  const userMessage = batch
    .map((t, idx) => {
      const parts: string[] = [`#${idx + 1} id=${t.id} amount=$${Math.abs(t.amount).toFixed(2)}`];
      parts.push(`payee=${t.payee ?? "(none)"}`);
      parts.push(`description=${t.description}`);
      if (t.memo) parts.push(`memo=${t.memo}`);
      return parts.join(" | ");
    })
    .join("\n");

  const message = await createContentMessage({
    model: CONTENT_MODEL,
    max_tokens: CONTENT_MAX_TOKENS_LONG,
    thinking: CONTENT_THINKING,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Classify these ${batch.length} transactions:\n\n${userMessage}\n\nRespond with strict JSON: {"results":[...]}.`,
      },
    ],
  });

  const raw = extractText(message).trim();
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const json = JSON.parse(cleaned);
  const validated = ResponseSchema.parse(json);
  return validated.results;
}
