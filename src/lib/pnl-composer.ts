import type { MetaData, ShopifyData } from "./types";
import {
  EXPENSE_CATEGORIES,
  type BusinessAssumptions,
  type Categorization,
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
  assumptions: BusinessAssumptions;
  prior?: {
    meta?: MetaData | null;
    shopify?: ShopifyData | null;
    simplefin?: { transactions: SimpleFinTxn[] } | null;
    categorizations?: Map<string, Categorization>;
  };
}): PnL {
  const {
    range, priorRange, meta, shopify, simplefin, categorizations, assumptions, prior,
  } = input;

  const missing: string[] = [];
  if (!meta) missing.push("meta");
  if (!shopify) missing.push("shopify");
  if (!simplefin) missing.push("simplefin");

  const current = computeStatement({
    meta, shopify, simplefin, categorizations, assumptions,
  });

  const priorStatement = prior
    ? computeStatement({
        meta: prior.meta, shopify: prior.shopify, simplefin: prior.simplefin,
        categorizations: prior.categorizations, assumptions,
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
      gross:   lineWithDelta("Gross revenue",    "grossRevenue"),
      refunds: lineWithDelta("Refunds",          "refunds"),
      net:     lineWithDelta("Net revenue",      "netRevenue"),
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
      fixedExpenses:  lineWithDelta("Fixed expenses",  "fixedExpenses", "from SimpleFIN, excludes marketing/inventory/fulfilment"),
      fixedByCategory,
      total:          lineWithDelta("Total OpEx",      "opexTotal"),
    },
    contributionMargin: lineWithDelta("Contribution margin", "contributionMargin"),
    netIncome:          lineWithDelta("Net income",          "netIncome"),
    netMarginPct:       current.netMarginPct,
    unitEconomics: {
      cac:           current.cac,
      blendedLtv:    current.blendedLtv,
      subLtv:        current.subLtv,
      otpLtv:        current.otpLtv,
      ltvToCac:      current.ltvToCac,
      paybackMonths: current.paybackMonths,
    },
    missing,
  };
}

// ── internal ──────────────────────────────────────────────────────────────

type Statement = {
  grossRevenue: number;
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
  fixedByCategory: Partial<Record<ExpenseCategory, number>>;
  opexTotal: number;
  contributionMargin: number;
  netIncome: number;
  netMarginPct: number;
  cac: number;
  blendedLtv: number;
  subLtv: number;
  otpLtv: number;
  ltvToCac: number;
  paybackMonths: number;
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
  assumptions: BusinessAssumptions;
}): Statement {
  const { meta, shopify, simplefin, categorizations, assumptions } = input;

  // ── Revenue ─────────────────────────────────────────────────────────────
  const grossRevenue = shopify?.summary.revenue ?? 0;
  // Shopify route already excludes refunded orders, so the gross is "post-refund"
  // for orders that exist. We estimate refund $ via assumption to surface it as
  // a line item on the P&L.
  const refunds = grossRevenue * (assumptions.returnsRate / 100);
  const netRevenue = grossRevenue - refunds;
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
  if (simplefin && categorizations) {
    for (const t of simplefin.transactions) {
      if (t.amount >= 0) continue; // skip inbound
      const cat = categorizations.get(t.id)?.category ?? "uncategorized";
      const abs = Math.abs(t.amount);
      fixedByCategory[cat] = (fixedByCategory[cat] ?? 0) + abs;
      if (!EXCLUDED_FROM_FIXED.has(cat)) {
        fixedExpenses += abs;
      }
    }
  }
  const opexTotal = adSpend + fixedExpenses;

  // ── Bottom line ─────────────────────────────────────────────────────────
  const contributionMargin = grossProfit - adSpend;
  const netIncome = grossProfit - opexTotal;
  const netMarginPct = netRevenue === 0 ? 0 : (netIncome / netRevenue) * 100;

  // ── Unit economics ──────────────────────────────────────────────────────
  // Approximation: orders ≈ customers acquired (subs + OTP), so CAC = adSpend / orders.
  // For a single-user founder dashboard this is "good enough" until Shopify's
  // new-vs-returning split is wired in.
  const cac = orders > 0 ? adSpend / orders : 0;

  // Average order values (post-discount).
  const subAovDiscounted = assumptions.subPriceUsd * (1 - assumptions.subDiscountPct / 100);
  const otpAov = assumptions.otpPriceUsd;

  // Per-order contribution = average order value - per-unit COGS - fulfilment - processing fees.
  // (Use a per-order processing approximation: pct of AOV + flat.)
  const procPerSubOrder = subAovDiscounted * (assumptions.paymentProcessingPct / 100) + assumptions.paymentProcessingFlat;
  const procPerOtpOrder = otpAov * (assumptions.paymentProcessingPct / 100) + assumptions.paymentProcessingFlat;
  const subContribPerOrder = subAovDiscounted - assumptions.cogsPerUnit - assumptions.fulfilmentPerOrder - procPerSubOrder;
  const otpContribPerOrder = otpAov - assumptions.cogsPerUnit - assumptions.fulfilmentPerOrder - procPerOtpOrder;

  // Sub LTV ≈ per-order contribution × avg lifetime months × 1 order/month.
  const subLtv = subContribPerOrder * assumptions.avgSubLifetimeMonths;
  // OTP LTV ≈ per-order contribution × (1 + repeat-rate-as-multiplier).
  const otpLtv = otpContribPerOrder * (1 + assumptions.otpRepeatRatePct / 100);

  const subShare = assumptions.subMixPct / 100;
  const blendedLtv = subShare * subLtv + (1 - subShare) * otpLtv;

  const ltvToCac = cac > 0 ? blendedLtv / cac : 0;
  // Payback months: months of contribution to recover CAC. Use blended monthly contribution.
  const blendedMonthlyContrib = subShare * subContribPerOrder + (1 - subShare) * (otpContribPerOrder / Math.max(1, assumptions.avgSubLifetimeMonths));
  const paybackMonths = blendedMonthlyContrib > 0 ? cac / blendedMonthlyContrib : 0;

  return {
    grossRevenue, refunds, netRevenue,
    cogsProduct, cogsFulfilment, cogsPayments, cogsTotal,
    grossProfit, grossMarginPct,
    adSpend, fixedExpenses, fixedByCategory, opexTotal,
    contributionMargin, netIncome, netMarginPct,
    cac, blendedLtv, subLtv, otpLtv, ltvToCac, paybackMonths,
  };
}
