import { z } from "zod";

// ── Assumptions ───────────────────────────────────────────────────────────
// Mirrors the Assumptions tab of Lunia_Life_Pricing_Financial_Model.
// Sections C (Unit Economics), E (LTV), and F (Acquisition Economics) are
// DERIVED from these inputs + live Meta/Shopify data, so they aren't stored.

// Cost-side inputs only. Customer economics (price, sub mix, churn, repeat) used
// to live here too, but are now derived from real Shopify data via the cohort
// endpoint, so those fields have been removed.
export const BusinessAssumptionsSchema = z.object({
  cogsPerUnit: z.number().min(0),
  fulfilmentPerOrder: z.number().min(0),
  paymentProcessingPct: z.number().min(0).max(100),
  paymentProcessingFlat: z.number().min(0),
  returnsRate: z.number().min(0).max(100),
});

export type BusinessAssumptions = z.infer<typeof BusinessAssumptionsSchema>;

export const DEFAULT_ASSUMPTIONS: BusinessAssumptions = {
  cogsPerUnit: 8,
  fulfilmentPerOrder: 5,
  paymentProcessingPct: 2.9,
  paymentProcessingFlat: 0.3,
  returnsRate: 4,
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
 *
 * Two parallel order-count + revenue numbers are tracked:
 *  - `orderCount` / `totalRevenue` — every order, including $0 promo/comp
 *    orders. Matches the Shopify admin dashboard.
 *  - `qualifiedOrderCount` / `qualifiedRevenue` — only orders ≥ $5. Used for
 *    LTV / CAC / payback math so $0 freebies don't dilute averages.
 */
export type CustomerSummary = {
  /** Stable key — `id:<shopify-id>` when available, else `email:<lowercased>`, else `order:<id>`. */
  key: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  firstOrderDate: string;       // YYYY-MM-DD (any order)
  lastOrderDate: string;        // YYYY-MM-DD (any order)
  /** First date the customer placed an order ≥ $5. Empty string if none. */
  firstQualifiedOrderDate: string;
  orderCount: number;
  totalRevenue: number;
  qualifiedOrderCount: number;
  qualifiedRevenue: number;
  /** Has at least one Shopify Subscription product order (selling_plan_allocation). */
  hasSubscriptionOrder: boolean;
  /** Subscriber = ≥ 2 qualified orders. The user-facing definition for the Existing Customers tab. */
  isRepeatCustomer: boolean;
  /** True when this customer's full history is $0 / sub-$5 — excluded from LTV math. */
  trialOnly: boolean;
};

export type CustomerCohort = {
  /** Always 365 — the trailing-twelve-months window the LTV calc is based on. */
  windowDays: number;
  /** Minimum order value used to qualify orders into LTV/CAC math. */
  minOrderValueForLtv: number;

  // ── Raw — every order, matches Shopify admin reporting ─────────────────
  /** Total paid orders processed (incl. $0 promo/comp). Sanity-check vs Shopify dash. */
  windowOrders: number;
  /** Total unique customers observed (incl. trial-only). */
  totalCustomers: number;

  // ── Qualified ($5+ only) — basis for unit economics ────────────────────
  /** Orders with total_price ≥ minOrderValueForLtv. */
  qualifiedOrders: number;
  /** Customers with at least 1 qualified order. */
  qualifiedCustomers: number;
  /** Customers with > 1 qualified order — "Subscribers" under the new definition. */
  repeatCustomers: number;
  /** Customers with exactly 1 qualified order. */
  oneTimeCustomers: number;
  /** Customers with 0 qualified orders (trial / $0-only). Excluded from LTV math. */
  trialOnlyCustomers: number;
  /** Mean qualified revenue per qualified customer — gross of margin. */
  avgLifetimeRevenue: { blended: number; repeat: number; oneTime: number };
  /** Mean qualified-order count per qualified customer. */
  avgOrdersPerCustomer: { blended: number; repeat: number; oneTime: number };
  /** % of qualified orders that include a Shopify Subscription line item. */
  subscriptionProductOrderMixPct: number;
  /** Subscribers (≥2 qualified orders) ÷ qualified customers. */
  repeatRatePct: number;
  /** New customers (first qualified order) in the requested range. Used for CAC. */
  newCustomersInRange: number;
  newCustomersLast30d: number;
  newCustomersLast90d: number;

  /** Customers with at least one Shopify Subscription product order (selling_plan_allocation). */
  subscriptionProductCustomers: number;
  range: { since: string; until: string };
  truncated: boolean;
  computedAt: string;
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
    /** Total qualified revenue ÷ qualified customers (gross of margin). */
    blendedLtv: number;
    /** Subscriber qualified revenue ÷ subscriber count. */
    subLtv: number;
    /** One-time qualified revenue ÷ one-time customer count. */
    otpLtv: number;
    /** Period-blended ROAS = total Shopify revenue ÷ Meta ad spend (this period). */
    roas: number;
    /**
     * "shopify-cohort" = computed from real 12-month customer data.
     * "unavailable"    = no cohort loaded — UE values are 0/null and the UI hides them.
     */
    source: "shopify-cohort" | "unavailable";
    /** Real customer-level signal when source = shopify-cohort. */
    cohort?: {
      /** All customers in the 365d window (incl. $0 trial-only). */
      totalCustomers: number;
      /** Customers with ≥1 qualified ($5+) order — basis for LTV. */
      qualifiedCustomers: number;
      /** ≥2 qualified orders. */
      repeatCustomers: number;
      oneTimeCustomers: number;
      /** Excluded from LTV math. */
      trialOnlyCustomers: number;
      /** New qualified customers in the request range — basis for CAC. */
      newCustomersInRange: number;
      /** Subscribers / qualified customers. */
      repeatRatePct: number;
      /** Mean qualified orders per qualified customer. */
      avgOrdersPerCustomer: number;
      /** Min order value used to qualify orders into LTV math. */
      minOrderValueForLtv: number;
    };
  };
  /** Sources that failed or are unconnected — UI surfaces a warning per item. */
  missing: string[];
};
