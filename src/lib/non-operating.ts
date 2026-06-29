import type { SimpleFinTxn } from "./business-types";

/**
 * Credit-card payments and internal account transfers are money *movement*, not
 * operating expenses:
 *  - A card payment settles charges already made on the card (e.g. ads, which
 *    are ALREADY counted in the P&L via Meta `adSpend`). Booking the lump
 *    payment too double-counts those charges.
 *  - Because the payment repeats monthly, the recurring detector was averaging
 *    it into a phantom constant run-rate (the "$13k that isn't in any statement").
 *
 * These transactions are excluded from BOTH the OpEx total (pnl-composer) and
 * recurring detection (recurring-detector).
 *
 * Matching is conservative — it requires a clear card-payment / transfer signal
 * (a settlement word plus a card context, or an explicit memo) so it never hides
 * a legitimate vendor, including a SaaS on autopay (which has no card context).
 */

// Unambiguous card-payment / settlement memos.
const EXPLICIT_CARD_PAYMENT =
  /\b(credit\s*c(ar|r)?d\s*(payment|pymt|bill)|card\s*(payment|pymt)|cc\s*payment|cardmember\s*serv|online\s*payment,?\s*thank\s*you|payment\s*to\s*(credit\s*)?card)\b/i;

// "credit card" / "credit crd" appearing anywhere (a card context).
const CREDIT_CARD = /\bcredit\s*c(ar|r)?d\b/i;

// Brand card issuers. Deliberately NOT the network words "visa"/"mastercard"
// alone — those appear on ordinary card purchases, not just payments.
const CARD_ISSUER =
  /\b(amex|american\s*express|chase\s*(card|credit)|citi(bank)?\s*card|discover|capital\s*one|capitalone|barclay(card)?|synchrony|comenity|bankamericard|us\s*bank\s*card|wells\s*fargo\s*card)\b/i;

// Settlement / payment words.
const SETTLEMENT =
  /\b(epayment|e-?payment|autopay|auto-?pay|ach\s*pmt|pymt|payment|bill\s*pay|crcardpmt|cardpmt|des:?\s*pmt)\b/i;

// Clear internal money movement (not a vendor expense).
const INTERNAL_TRANSFER =
  /\b(transfer\s*to|online\s*transfer\s*(to|from)|internal\s*transfer|to\s*(savings|checking|brokerage)|owner'?s?\s*(draw|distribution)|book\s*transfer)\b/i;

/** True when the transaction is a credit-card payment or an internal transfer. */
export function isCardPaymentOrTransfer(t: SimpleFinTxn): boolean {
  const s = `${t.payee ?? ""} ${t.description ?? ""} ${t.memo ?? ""}`.trim();
  if (!s) return false;
  if (EXPLICIT_CARD_PAYMENT.test(s)) return true;
  if (INTERNAL_TRANSFER.test(s)) return true;
  // A settlement word together with a card context = a card payment.
  if (SETTLEMENT.test(s) && (CARD_ISSUER.test(s) || CREDIT_CARD.test(s))) return true;
  return false;
}
