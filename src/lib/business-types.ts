import { z } from "zod";

// ── Assumptions ───────────────────────────────────────────────────────────
// Mirrors the Assumptions tab of Lunia_Life_Pricing_Financial_Model.
// Sections C (Unit Economics), E (LTV), and F (Acquisition Economics) are
// DERIVED from these inputs + live Meta/Shopify data, so they aren't stored.

export const BusinessAssumptionsSchema = z.object({
  // A — Product & Pricing
  servingsPerBottle: z.number().min(1).max(500),
  otpPriceUsd: z.number().min(0),
  subPriceUsd: z.number().min(0),
  subDiscountPct: z.number().min(0).max(100),

  // B — Cost of Goods
  cogsPerUnit: z.number().min(0),
  fulfilmentPerOrder: z.number().min(0),
  paymentProcessingPct: z.number().min(0).max(100),
  paymentProcessingFlat: z.number().min(0),
  returnsRate: z.number().min(0).max(100),

  // D — Customer Mix & Retention
  subMixPct: z.number().min(0).max(100),
  monthlySubChurnPct: z.number().min(0).max(100),
  avgSubLifetimeMonths: z.number().min(0),
  otpRepeatRatePct: z.number().min(0).max(100),
});

export type BusinessAssumptions = z.infer<typeof BusinessAssumptionsSchema>;

export const DEFAULT_ASSUMPTIONS: BusinessAssumptions = {
  servingsPerBottle: 30,
  otpPriceUsd: 39,
  subPriceUsd: 33,
  subDiscountPct: 15,

  cogsPerUnit: 8,
  fulfilmentPerOrder: 5,
  paymentProcessingPct: 2.9,
  paymentProcessingFlat: 0.3,
  returnsRate: 4,

  subMixPct: 40,
  monthlySubChurnPct: 6,
  avgSubLifetimeMonths: 8,
  otpRepeatRatePct: 25,
};

export const ASSUMPTIONS_KV_KEY = "business:assumptions:v1";

// ── SimpleFIN ────────────────────────────────────────────────────────────
// Filled out in Phase 3.

export type SimpleFinAccount = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  availableBalance?: number;
  balanceDate: number; // unix seconds
  org: { name: string; domain?: string };
};

export type SimpleFinTxn = {
  id: string;
  accountId: string;
  posted: number;     // unix seconds
  amount: number;     // signed; negative = money leaving the account
  description: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
};

// ── Categorization ───────────────────────────────────────────────────────
// Filled out in Phase 4.

export const EXPENSE_CATEGORIES = [
  "saas",
  "inventory",
  "packaging",
  "lab-testing",
  "fulfilment",
  "payroll",
  "marketing",
  "influencer",
  "content",
  "events",
  "office",
  "travel",
  "professional",
  "other",
  "uncategorized",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  saas: "SaaS",
  inventory: "Inventory",
  packaging: "Packaging",
  "lab-testing": "Lab & Testing",
  fulfilment: "Fulfilment",
  payroll: "Payroll",
  marketing: "Marketing (Ads)",
  influencer: "Influencer / UGC",
  content: "Content",
  events: "Events / PR",
  office: "Office",
  travel: "Travel",
  professional: "Professional",
  other: "Other",
  uncategorized: "Uncategorized",
};

export type Categorization = {
  txnId: string;
  category: ExpenseCategory;
  confidence: number;     // 0–1
  reasoning: string;      // 1-line, surfaced on hover
  override?: boolean;     // true if user manually set the category
};

// ── P&L (Phase 5) ────────────────────────────────────────────────────────
// Composed shape returned by /api/business/pnl.

export type PnLLine = {
  label: string;
  amount: number;
  delta?: { pct: number; absolute: number }; // vs prior period
  note?: string;
};

export type PnL = {
  range: { since: string; until: string };
  priorRange?: { since: string; until: string };
  revenue: {
    gross: PnLLine;
    refunds: PnLLine;
    net: PnLLine;
  };
  cogs: {
    product: PnLLine;
    fulfilment: PnLLine;
    paymentProcessing: PnLLine;
    total: PnLLine;
  };
  grossProfit: PnLLine;
  grossMarginPct: number;
  opex: {
    adSpend: PnLLine;
    fixedExpenses: PnLLine;
    fixedByCategory: Record<ExpenseCategory, number>;
    total: PnLLine;
  };
  contributionMargin: PnLLine;
  netIncome: PnLLine;
  netMarginPct: number;
  unitEconomics: {
    cac: number;
    blendedLtv: number;
    subLtv: number;
    otpLtv: number;
    ltvToCac: number;
    paybackMonths: number;
  };
  /** Sources that failed or are unconnected — UI surfaces a warning per item. */
  missing: string[];
};
