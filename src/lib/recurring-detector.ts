import type { Categorization, ExpenseCategory, SimpleFinTxn } from "./business-types";

export type RecurringCadence = "weekly" | "monthly" | "quarterly" | "annual" | "irregular";

export type RecurringExpense = {
  payeeKey: string;            // canonical key used for grouping
  payeeLabel: string;          // human-readable label (the most common original payee string)
  category: ExpenseCategory;   // most-common category across the matched txns
  cadence: RecurringCadence;
  monthlyImpact: number;       // normalized monthly run-rate in USD
  avgAmount: number;           // average per-charge amount in USD
  amountStability: number;     // 1 - coefficient of variation, clamped to [0, 1]
  occurrences: number;
  firstSeen: number;           // unix seconds
  lastSeen: number;            // unix seconds
  nextExpected?: number;       // unix seconds (estimate)
  txnIds: string[];
};

const MIN_OCCURRENCES = 3;
const MAX_AMOUNT_CV = 0.20;     // up to 20% variance still counts as recurring
const MONTHS_PER_WEEK = 4.345;

/**
 * Detect recurring expenses from a categorized transaction window.
 *
 * Algorithm:
 *  1. Drop inbound deposits + uncategorized txns + obvious one-offs.
 *  2. Group by canonical payee key.
 *  3. For each group with >= MIN_OCCURRENCES, compute amount stability + cadence
 *     from the median gap between consecutive charges.
 *  4. Keep only groups whose amounts are stable (CV <= MAX_AMOUNT_CV) AND
 *     whose cadence is one of the recognized buckets (weekly/monthly/quarterly/annual).
 *  5. Project next expected charge from the last-seen date + median gap.
 */
export function detectRecurring(
  transactions: SimpleFinTxn[],
  categorizations: Map<string, Categorization>,
): RecurringExpense[] {
  // Group outflows by canonical payee.
  const groups = new Map<string, SimpleFinTxn[]>();
  const groupLabels = new Map<string, Map<string, number>>(); // payeeKey → original label → count
  const groupCategories = new Map<string, Map<ExpenseCategory, number>>(); // payeeKey → category → count

  for (const t of transactions) {
    if (t.amount >= 0) continue; // skip inbound
    const key = canonicalPayeeKey(t);
    if (!key) continue;

    const list = groups.get(key);
    if (list) list.push(t);
    else groups.set(key, [t]);

    // Track original label frequency
    const original = (t.payee ?? t.description ?? "").trim();
    if (original) {
      const labels = groupLabels.get(key) ?? new Map<string, number>();
      labels.set(original, (labels.get(original) ?? 0) + 1);
      groupLabels.set(key, labels);
    }

    // Track category frequency
    const cat = categorizations.get(t.id)?.category;
    if (cat && cat !== "uncategorized") {
      const cats = groupCategories.get(key) ?? new Map<ExpenseCategory, number>();
      cats.set(cat, (cats.get(cat) ?? 0) + 1);
      groupCategories.set(key, cats);
    }
  }

  const out: RecurringExpense[] = [];

  for (const [key, txns] of groups) {
    if (txns.length < MIN_OCCURRENCES) continue;

    // Sort ascending by posted date.
    txns.sort((a, b) => a.posted - b.posted);

    const amounts = txns.map((t) => Math.abs(t.amount));
    const avg = mean(amounts);
    const cv = avg === 0 ? 1 : stdev(amounts) / avg;
    const amountStability = Math.max(0, Math.min(1, 1 - cv));

    if (cv > MAX_AMOUNT_CV) continue;

    // Median gap between consecutive charges in days.
    const gapsDays: number[] = [];
    for (let i = 1; i < txns.length; i++) {
      const gap = (txns[i].posted - txns[i - 1].posted) / 86_400;
      gapsDays.push(gap);
    }
    const medianGap = median(gapsDays);
    const cadence = classifyCadence(medianGap);
    if (cadence === "irregular") continue;

    const monthlyImpact = monthlyRunRate(avg, cadence);
    const nextExpected = txns[txns.length - 1].posted + Math.round(medianGap * 86_400);

    // Pick the most common original label as the display name.
    const labels = groupLabels.get(key);
    const payeeLabel = labels
      ? [...labels.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : key;

    // Pick the most common category, falling back to "uncategorized".
    const cats = groupCategories.get(key);
    const category: ExpenseCategory = cats
      ? [...cats.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : "uncategorized";

    out.push({
      payeeKey: key,
      payeeLabel,
      category,
      cadence,
      monthlyImpact,
      avgAmount: avg,
      amountStability,
      occurrences: txns.length,
      firstSeen: txns[0].posted,
      lastSeen: txns[txns.length - 1].posted,
      nextExpected,
      txnIds: txns.map((t) => t.id),
    });
  }

  return out.sort((a, b) => b.monthlyImpact - a.monthlyImpact);
}

/**
 * Total monthly run-rate for OpEx purposes — sum of every detected recurrence.
 */
export function totalMonthlyRecurring(items: RecurringExpense[]): number {
  return items.reduce((s, i) => s + i.monthlyImpact, 0);
}

/**
 * Set of txnIds covered by detected recurring items — used by the P&L composer
 * to split Fixed Expenses into Recurring vs Variable.
 */
export function recurringTxnIdSet(items: RecurringExpense[]): Set<string> {
  const set = new Set<string>();
  for (const item of items) for (const id of item.txnIds) set.add(id);
  return set;
}

// ── helpers ──────────────────────────────────────────────────────────────

/**
 * Build a stable key per payee.
 * - Use payee field when present; fall back to description.
 * - Lowercase, trim trailing legal suffixes (Inc, LLC, Corp, Ltd), collapse
 *   whitespace, strip the trailing 4-digit reference numbers Amex/Chase add
 *   ("KLAVIYO INC 4567").
 */
function canonicalPayeeKey(t: SimpleFinTxn): string {
  const raw = (t.payee && t.payee.trim()) || (t.description && t.description.trim()) || "";
  if (!raw) return "";

  let s = raw.toLowerCase();

  // Strip trailing reference / authorization numbers (4+ trailing digits).
  s = s.replace(/\s+\d{4,}\s*$/g, "");
  // Strip trailing common store/location suffixes (state codes, store IDs).
  s = s.replace(/\s+[a-z]{2}\s*$/g, ""); // e.g., "amazon ny" → "amazon"
  s = s.replace(/\s+#\d+\s*$/g, "");      // e.g., "store #123" → "store"
  // Strip legal suffixes.
  s = s.replace(/\b(inc|llc|corp|ltd|co|gmbh|sa|sarl|bv|llp)\b\.?$/g, "");
  // Strip generic web/payment prefixes — Klaviyo via Stripe shows up as "stripe klaviyo"
  // sometimes. Don't strip Stripe blindly though; only known noise patterns.
  s = s.replace(/^paypal\s+\*\s+/, "");
  s = s.replace(/^sq\s+\*\s+/, "");
  s = s.replace(/^check\s+\d+\s+/, "");
  // Collapse whitespace + non-alphanumeric.
  s = s.replace(/[^a-z0-9]+/g, " ").trim();

  // If after stripping we have less than 3 chars, fall back to original raw lowercased.
  if (s.length < 3) return raw.toLowerCase().replace(/\s+/g, " ").trim();
  return s;
}

function classifyCadence(medianGapDays: number): RecurringCadence {
  if (medianGapDays >= 5  && medianGapDays <= 9)   return "weekly";
  if (medianGapDays >= 25 && medianGapDays <= 35)  return "monthly";
  if (medianGapDays >= 80 && medianGapDays <= 100) return "quarterly";
  if (medianGapDays >= 350 && medianGapDays <= 400) return "annual";
  return "irregular";
}

function monthlyRunRate(avg: number, cadence: RecurringCadence): number {
  switch (cadence) {
    case "weekly":    return avg * MONTHS_PER_WEEK;
    case "monthly":   return avg;
    case "quarterly": return avg / 3;
    case "annual":    return avg / 12;
    default:          return 0;
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export const __test__ = { canonicalPayeeKey, classifyCadence, monthlyRunRate };
