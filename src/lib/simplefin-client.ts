import type { SimpleFinAccount, SimpleFinTxn } from "./business-types";

// Wire format from SimpleFIN — amounts are strings, dates are unix seconds,
// keys are kebab-case. We normalize into our domain types before returning.

type WireAccount = {
  id: string;
  name: string;
  currency: string;
  balance: string;
  "balance-date": number;
  "available-balance"?: string;
  org: { name: string; domain?: string; url?: string };
  transactions?: Array<{
    id: string;
    posted: number;
    amount: string;
    description: string;
    payee?: string;
    memo?: string;
    pending?: boolean;
  }>;
};

type WireResponse = {
  errlist?: Array<{ severity?: string; description?: string }>;
  accounts: WireAccount[];
};

export type SimpleFinFetchResult = {
  accounts: SimpleFinAccount[];
  transactions: SimpleFinTxn[];
  errlist: Array<{ severity?: string; description?: string }>;
};

export class SimpleFinError extends Error {
  constructor(public status: number, public body: string) {
    super(`SimpleFIN error ${status}: ${body.slice(0, 200)}`);
    this.name = "SimpleFinError";
  }
}

/**
 * Pull accounts + transactions from SimpleFIN.
 * `accessUrl` is the credentialed URL returned by /claim — embeds user:pass@host.
 * `since` / `until` are YYYY-MM-DD (UTC).
 */
export async function fetchSimpleFin(
  accessUrl: string,
  since: string,
  until: string
): Promise<SimpleFinFetchResult> {
  const url = new URL(accessUrl);
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  if (!username || !password) {
    throw new SimpleFinError(0, "Access URL is missing embedded credentials");
  }
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  // Strip credentials before reusing the URL.
  url.username = "";
  url.password = "";
  const base = url.toString().replace(/\/$/, "");

  const start = Math.floor(Date.parse(`${since}T00:00:00Z`) / 1000);
  const end   = Math.floor(Date.parse(`${until}T23:59:59Z`) / 1000);

  const endpoint = `${base}/accounts?start-date=${start}&end-date=${end}&pending=0`;
  const res = await fetch(endpoint, {
    headers: { Authorization: `Basic ${auth}` },
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new SimpleFinError(res.status, bodyText);
  }

  let json: WireResponse;
  try {
    json = JSON.parse(bodyText) as WireResponse;
  } catch {
    throw new SimpleFinError(res.status, `Malformed JSON: ${bodyText.slice(0, 200)}`);
  }

  // Optional account filter — comma-separated last-4 suffixes via SIMPLEFIN_ACCOUNT_SUFFIXES.
  // SimpleFIN account names typically embed the masked last-4 in parens (e.g. "BUS COMPLETE CHK (3877)").
  // If unset, every connected account flows through.
  const suffixFilter = (process.env.SIMPLEFIN_ACCOUNT_SUFFIXES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const matchesFilter = (a: WireAccount): boolean => {
    if (suffixFilter.length === 0) return true;
    return suffixFilter.some((suffix) => a.name.includes(suffix) || a.id.endsWith(suffix));
  };

  const filteredWireAccounts = (json.accounts ?? []).filter(matchesFilter);

  const accounts: SimpleFinAccount[] = filteredWireAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    balance: parseFloat(a.balance),
    availableBalance: a["available-balance"] != null ? parseFloat(a["available-balance"]) : undefined,
    balanceDate: a["balance-date"],
    org: { name: a.org?.name ?? "Unknown", domain: a.org?.domain },
  }));

  const transactions: SimpleFinTxn[] = filteredWireAccounts.flatMap((a) =>
    (a.transactions ?? []).map((t) => ({
      id: t.id,
      accountId: a.id,
      posted: t.posted,
      amount: parseFloat(t.amount),
      description: t.description,
      payee: t.payee,
      memo: t.memo,
      pending: t.pending,
    }))
  );

  return {
    accounts,
    transactions,
    errlist: json.errlist ?? [],
  };
}
