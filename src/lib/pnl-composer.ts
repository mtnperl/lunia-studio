import type { MetaData, ShopifyData } from "./types";
import {
  EXPENSE_CATEGORIES,
  type BusinessAssumptions,
  type Categorization,
  type CustomerCohort,
  type ExpenseCategory,
  type PnL,
  type PnLLine,
  type SimpleFinTxn,
} from "./business-types";

/**
 * Pure function — composes a `PnL` from the four upstream sources.
 *
 * Mental model:
 * - Revenue comes from Shopify (gross + estimated refunds via assumption).
 * - COGS / fulfilment / payment processing are assumption-based per-order math.
 * - Marketing spend is Meta only (the bank-side "marketing" category is excluded
 *   to avoid double-counting).
 * - Fixed Expenses come from SimpleFIN, EXCLUDING categories that overlap with
 *   what we already booked above (marketing, inventory, fulfilment). The bank
 *   shows everything else: SaaS, payroll, office, travel, professional, other.
 *
 * The function NEVER throws — partial inputs produce a partial P&L with a
 * `missing: string[]` field so the UI can degrade gracefully.
 */
export function composePnL(input: {
  range: { since: string; until: string };
  priorRange?: { since: string; until: string };
  meta?: MetaData | null;
  shopify?: ShopifyData | null;
  simplefin?: { transactions: SimpleFinTxn[] } | null;
  categorizations?: Map<string, Categorization>;
  /** Txn ids belonging to detected recurring vendors. Used to split Fixed Expenses. */
  recurringTxnIds?: Set<string>;
  /** Steady-state monthly run-rate of all recurring vendors. Period-independent. */
  recurringMonthlyRunRate?: number;
  /** When provided, unit economics are derived from real customer behaviour over the past 365d. */
  cohort?: CustomerCohort | null;
  assumptions: BusinessAssumptions;
  prior?: {
    meta?: MetaData | null;
    shopify?: ShopifyData | null;
    simplefin?: { transactions: SimpleFinTxn[] } | null;
    categorizations?: Map<string, Categorization>;
  };
}): PnL {
  const {
    range, priorRange, meta, shopify, simplefin, categorizations, recurringTxnIds,
    recurringMonthlyRunRate = 0, cohort, assumptions, prior,
  } = input;

  const missing: string[] = [];
  if (!meta) missing.push("meta");
  if (!shopify) missing.push("shopify");
  if (!simplefin) missing.push("simplefin");

  const current = computeStatement({
    meta, shopify, simplefin, categorizations, recurringTxnIds, cohort, assumptions,
  });

  const priorStatement = prior
    ? computeStatement({
        meta: prior.meta, shopify: prior.shopify, simplefin: prior.simplefin,
        categorizations: prior.categorizations,
        // Use the same recurringTxnIds set — recurring vendors are stable across the prior window too.
        recurringTxnIds,
        assumptions,
      })
    : null;

  function lineWithDelta(label: string, key: keyof typeof current, note?: string): PnLLine {
    const amount = current[key] as number;
    if (!priorStatement) return { label, amount, note };
    const priorAmount = priorStatement[key] as number;
    const absolute = amount - priorAmount;
    const pct = priorAmount === 0 ? 0 : (absolute / Math.abs(priorAmount)) * 100;
    return { label, amount, note, delta: { pct, absolute } };
  }

  const fixedByCategory: Record<ExpenseCategory, number> = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, current.fixedByCategory[c] ?? 0])
  ) as Record<ExpenseCategory, number>;

  return {
    range,
    priorRange,
    revenue: {
      gross:     lineWithDelta("Gross sales",  "grossRevenue"),
      discounts: lineWithDelta("Discounts",    "discounts"),
      refunds:   lineWithDelta("Returns",      "refunds"),
      net:       lineWithDelta("Net sales",    "netRevenue"),
    },
    cogs: {
      product:           lineWithDelta("Product cost",       "cogsProduct", "orders × COGS/unit"),
      fulfilment:        lineWithDelta("Fulfilment",         "cogsFulfilment", "orders × fulfilment/order"),
      paymentProcessing: lineWithDelta("Payment processing", "cogsPayments", "revenue × % + flat × orders"),
      total:             lineWithDelta("Total COGS",         "cogsTotal"),
    },
    grossProfit:    lineWithDelta("Gross profit",     "grossProfit"),
    grossMarginPct: current.grossMarginPct,
    opex: {
      adSpend:        lineWithDelta("Ad spend (Meta)", "adSpend"),
      fixedExpenses:  lineWithDelta("Fixed expenses",  "fixedExpenses", "all categorized non-COGS, non-marketing spend"),
      recurringFixed: lineWithDelta("Recurring fixed", "recurringFixed", "subscriptions, payroll, rent — stable monthly costs"),
      variableOpex:   lineWithDelta("Variable / one-off", "variableOpex", "everything else not on a regular cadence"),
      fixedByCategory,
      total:          lineWithDelta("Total OpEx",      "opexTotal"),
      recurringMonthlyRunRate,
    },
    contributionMargin: lineWithDelta("Contribution margin", "contributionMargin"),
    netIncome:          lineWithDelta("Net income",          "netIncome"),
    netMarginPct:       current.netMarginPct,
    unitEconomics: {
      cac:        current.cac,
      blendedLtv: current.blendedLtv,
      subLtv:     current.subLtv,
      otpLtv:     current.otpLtv,
      roas:       current.roas,
      source:     current.unitEconomicsSource,
      cohort:     current.cohortSummary,
    },
    missing,
  };
}

// ── internal ──────────────────────────────────────────────────────────────

type Statement = {
  grossRevenue: number;
  discounts: number;
  refunds: number;
  netRevenue: number;
  cogsProduct: number;
  cogsFulfilment: number;
  cogsPayments: number;
  cogsTotal: number;
  grossProfit: number;
  grossMarginPct: number;
  adSpend: number;
  fixedExpenses: number;
  recurringFixed: number;
  variableOpex: number;
  fixedByCategory: Partial<Record<ExpenseCategory, number>>;
  opexTotal: number;
  contributionMargin: number;
  netIncome: number;
  netMarginPct: number;
  cac: number;
  blendedLtv: number;
  subLtv: number;
  otpLtv: number;
  roas: number;
  unitEconomicsSource: "shopify-cohort" | "unavailable";
  cohortSummary?: {
    totalCustomers: number;
    qualifiedCustomers: number;
    repeatCustomers: number;
    oneTimeCustomers: number;
    trialOnlyCustomers: number;
    newCustomersInRange: number;
    repeatRatePct: number;
    avgOrdersPerCustomer: number;
    minOrderValueForLtv: number;
  };
};

// Categories already covered by other lines — exclude from "Fixed expenses".
const EXCLUDED_FROM_FIXED: Set<ExpenseCategory> = new Set([
  "marketing",  // already in Meta ad spend
  "inventory",  // already in COGS (per-unit assumption)
  "fulfilment", // already in COGS (per-order assumption)
]);

function computeStatement(input: {
  meta?: MetaData | null;
  shopify?: ShopifyData | null;
  simplefin?: { transactions: SimpleFinTxn[] } | null;
  categorizations?: Map<string, Categorization>;
  recurringTxnIds?: Set<string>;
  cohort?: CustomerCohort | null;
  assumptions: BusinessAssumptions;
}): Statement {
  const { meta, shopify, simplefin, categorizations, recurringTxnIds, cohort, assumptions } = input;

  // ── Revenue ─────────────────────────────────────────────────────────────
  // Mirrors Shopify "Total sales breakdown": Gross sales − Discounts − Returns = Net sales.
  // Real numbers from the Shopify endpoint, no assumption-based estimates.
  const grossRevenue = shopify?.summary.revenue ?? 0;
  const discounts = shopify?.summary.discounts ?? 0;
  const refunds = shopify?.summary.returns ?? 0;
  const netRevenue = shopify?.summary.netRevenue ?? (grossRevenue - discounts - refunds);
  const orders = shopify?.summary.orders ?? 0;

  // ── COGS ────────────────────────────────────────────────────────────────
  const cogsProduct = orders * assumptions.cogsPerUnit;
  const cogsFulfilment = orders * assumptions.fulfilmentPerOrder;
  const cogsPayments =
    grossRevenue * (assumptions.paymentProcessingPct / 100) +
    orders * assumptions.paymentProcessingFlat;
  const cogsTotal = cogsProduct + cogsFulfilment + cogsPayments;

  const grossProfit = netRevenue - cogsTotal;
  const grossMarginPct = netRevenue === 0 ? 0 : (grossProfit / netRevenue) * 100;

  // ── OpEx ────────────────────────────────────────────────────────────────
  const adSpend = meta?.summary.spend ?? 0;

  const fixedByCategory: Partial<Record<ExpenseCategory, number>> = {};
  let fixedExpenses = 0;
  let recurringFixed = 0;
  let variableOpex = 0;
  if (simplefin && categorizations) {
    for (const t of simplefin.transactions) {
      if (t.amount >= 0) continue; // skip inbound
      const cat = categorizations.get(t.id)?.category ?? "uncategorized";
      const abs = Math.abs(t.amount);
      fixedByCategory[cat] = (fixedByCategory[cat] ?? 0) + abs;
      if (!EXCLUDED_FROM_FIXED.has(cat)) {
        fixedExpenses += abs;
        if (recurringTxnIds && recurringTxnIds.has(t.id)) {
          recurringFixed += abs;
        } else {
          variableOpex += abs;
        }
      }
    }
  }
  // If detection wasn't run, leave the split unset (recurring=0, variable=fixed) so
  // the UI can fall back to the simpler single-line presentation.
  if (!recurringTxnIds) {
    recurringFixed = 0;
    variableOpex = fixedExpenses;
  }
  const opexTotal = adSpend + fixedExpenses;

  // ── Bottom line ─────────────────────────────────────────────────────────
  const contributionMargin = grossProfit - adSpend;
  const netIncome = grossProfit - opexTotal;
  const netMarginPct = netRevenue === 0 ? 0 : (netIncome / netRevenue) * 100;

  // ── Unit economics ──────────────────────────────────────────────────────
  // Real-data only. Per the founder's spec:
  //   LTV  = qualified revenue ÷ qualified customers (gross of margin).
  //   ROAS = total Shopify revenue ÷ Meta ad spend (period-blended).
  //   CAC  = ad spend ÷ new qualified customers in period.
  // No assumption-based fallback — without cohort, all UE values are 0 and the
  // UI shows "data unavailable".
  let cac = 0;
  let subLtv = 0;
  let otpLtv = 0;
  let blendedLtv = 0;
  const roas = adSpend > 0 ? grossRevenue / adSpend : 0;
  let unitEconomicsSource: "shopify-cohort" | "unavailable" = "unavailable";
  let cohortSummary: Statement["cohortSummary"];

  if (cohort && cohort.qualifiedCustomers > 0) {
    unitEconomicsSource = "shopify-cohort";

    cac = cohort.newCustomersInRange > 0 ? adSpend / cohort.newCustomersInRange : 0;

    subLtv     = cohort.avgLifetimeRevenue.repeat;
    otpLtv     = cohort.avgLifetimeRevenue.oneTime;
    blendedLtv = cohort.avgLifetimeRevenue.blended;

    cohortSummary = {
      totalCustomers: cohort.totalCustomers,
      qualifiedCustomers: cohort.qualifiedCustomers,
      repeatCustomers: cohort.repeatCustomers,
      oneTimeCustomers: cohort.oneTimeCustomers,
      trialOnlyCustomers: cohort.trialOnlyCustomers,
      newCustomersInRange: cohort.newCustomersInRange,
      repeatRatePct: cohort.repeatRatePct,
      avgOrdersPerCustomer: cohort.avgOrdersPerCustomer.blended,
      minOrderValueForLtv: cohort.minOrderValueForLtv,
    };
  }

  return {
    grossRevenue, discounts, refunds, netRevenue,
    cogsProduct, cogsFulfilment, cogsPayments, cogsTotal,
    grossProfit, grossMarginPct,
    adSpend, fixedExpenses, recurringFixed, variableOpex, fixedByCategory, opexTotal,
    contributionMargin, netIncome, netMarginPct,
    cac, blendedLtv, subLtv, otpLtv, roas,
    unitEconomicsSource, cohortSummary,
  };
}
