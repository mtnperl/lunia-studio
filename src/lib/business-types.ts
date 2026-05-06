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

// ── Customer Cohort ──────────────────────────────────────────────────────
// 365d Shopify rollup that backs the Unit Economics tab. Computes real LTV /
// repeat rate / sub mix from observed customer behavior instead of leaning on
// the assumption form. Range-aware new-customer counts let the consumer pick
// their CAC window.

/**
 * Per-customer summary used by the Existing Customers tab. One row per
 * unique customer observed in the 365d window (email-deduped for guest
 * checkouts).
 */
export type CustomerSummary = {
  /** Stable key — `id:<shopify-id>` when available, else `email:<lowercased>`, else `order:<id>`. */
  key: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  firstOrderDate: string; // YYYY-MM-DD
  lastOrderDate: string;  // YYYY-MM-DD
  orderCount: number;
  totalRevenue: number;
  /** Has at least one Shopify Subscription product order (selling_plan_allocation). */
  hasSubscriptionOrder: boolean;
  /** Repeat-customer flag — the new "subscriber" definition: ordered more than once. */
  isRepeatCustomer: boolean;
};

export type CustomerCohort = {
  /** Always 365 — the trailing-twelve-months window the LTV calc is based on. */
  windowDays: number;
  /** Total paid orders processed. Useful as a sanity check vs the existing dashboard. */
  windowOrders: number;
  /** Total unique customers observed in the 365d window. Email is used as fallback when customer.id is missing (guest checkouts). */
  totalCustomers: number;
  /**
   * Customers with > 1 orders in the window — the user-facing "Subscribers" definition.
   * Distinct from `subscriptionProductCustomers` below which tracks Shopify Subscriptions specifically.
   */
  repeatCustomers: number;
  /** Customers with exactly 1 order in the window. */
  oneTimeCustomers: number;
  /** Customers with at least one Shopify Subscription product order (selling_plan_allocation). Tracked separately from the new repeat-customer definition. */
  subscriptionProductCustomers: number;
  /** Mean lifetime revenue per customer over the 365d window — gross of margin. */
  avgLifetimeRevenue: { blended: number; repeat: number; oneTime: number };
  /** Mean order count per customer over the 365d window. */
  avgOrdersPerCustomer: { blended: number; repeat: number; oneTime: number };
  /** Share of orders (not customers) that are subscription-product orders. */
  subscriptionProductOrderMixPct: number;
  /** Share of customers with more than one order in the window — same as repeatCustomers / totalCustomers. */
  repeatRatePct: number;
  /** New customers in the requested range (driven by the since/until query params). */
  newCustomersInRange: number;
  /** Convenience windows. */
  newCustomersLast30d: number;
  newCustomersLast90d: number;
  /** Range-aware request echo so the consumer can verify what was scoped. */
  range: { since: string; until: string };
  /** True when Shopify pagination capped — totals may be understated. */
  truncated: boolean;
  /** ISO timestamp the rollup was computed at. */
  computedAt: string;
  /** Per-customer summaries for the Existing Customers tab. Sorted by totalRevenue desc. */
  customers: CustomerSummary[];
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
    /** All non-COGS, non-marketing categorized SimpleFIN spend. Sum of recurring + variable. */
    fixedExpenses: PnLLine;
    /** The portion of fixedExpenses that comes from detected recurring vendors (subscriptions, payroll, rent, etc). */
    recurringFixed: PnLLine;
    /** The remainder — one-off, irregular, or below the recurrence-detection threshold. */
    variableOpex: PnLLine;
    fixedByCategory: Record<ExpenseCategory, number>;
    total: PnLLine;
    /** Monthly run-rate of all detected recurring vendors. Stable across periods, useful for runway math. */
    recurringMonthlyRunRate: number;
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
    /**
     * "shopify-cohort" = computed from real 12-month customer data (preferred).
     * "assumptions"    = derived from the static assumption form (fallback).
     */
    source: "shopify-cohort" | "assumptions";
    /** Real customer-level signal when source = shopify-cohort. */
    cohort?: {
      totalCustomers: number;
      repeatCustomers: number;
      oneTimeCustomers: number;
      newCustomersInRange: number;
      repeatRatePct: number;
      avgOrdersPerCustomer: number;
    };
  };
  /** Sources that failed or are unconnected — UI surfaces a warning per item. */
  missing: string[];
};
