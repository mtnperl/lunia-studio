// Diagnostic endpoint for the Meta Ads integration. Hit this when the
// dashboard shows $0 / "couldn't pull Meta data" — it returns a structured
// report naming exactly which check failed: env vars, token validity, ad
// account access, or zero-spend window.
//
// Never returns the access token itself — only whether it's present + the
// first / last few characters so the user can verify it's the right one
// without leaking the full secret.
export const maxDuration = 20;

type CheckStatus = "ok" | "fail" | "skip";
type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

function masked(s: string | undefined): string | undefined {
  if (!s) return undefined;
  if (s.length <= 12) return `${s.slice(0, 2)}…${s.slice(-2)}`;
  return `${s.slice(0, 6)}…${s.slice(-4)} (len ${s.length})`;
}

export async function GET() {
  const checks: Check[] = [];
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  // 1. Env vars present
  checks.push({
    name: "META_ACCESS_TOKEN env var present",
    status: token ? "ok" : "fail",
    detail: token ? `Set: ${masked(token)}` : "Missing. Add it in Vercel → Project → Settings → Environment Variables.",
  });
  checks.push({
    name: "META_AD_ACCOUNT_ID env var present",
    status: accountId ? "ok" : "fail",
    detail: accountId
      ? `Set: ${accountId}${accountId.startsWith("act_") ? "  ⚠ remove the 'act_' prefix" : ""}`
      : "Missing. The route prefixes act_ automatically — supply just the numeric account id.",
  });

  if (!token || !accountId) {
    return Response.json({ ok: false, checks, summary: "Env vars not configured" });
  }

  const cleanAccount = accountId.startsWith("act_") ? accountId.slice(4) : accountId;
  const graphBase = "https://graph.facebook.com/v21.0";

  // 2. Token is valid + has access (call /me which works on any valid token).
  try {
    const meRes = await fetch(`${graphBase}/me?access_token=${encodeURIComponent(token)}`);
    const meJson = await meRes.json().catch(() => ({}));
    if (meRes.ok) {
      checks.push({
        name: "Token is valid",
        status: "ok",
        detail: `Authenticated as ${meJson.name ?? meJson.id ?? "(unknown user)"}`,
      });
    } else {
      const message = meJson?.error?.message ?? `HTTP ${meRes.status}`;
      checks.push({
        name: "Token is valid",
        status: "fail",
        detail: `Token rejected: ${message}. Likely expired or revoked — regenerate it in Meta Business Manager.`,
      });
      return Response.json({ ok: false, checks, summary: "Token invalid" });
    }
  } catch (err) {
    checks.push({
      name: "Token is valid",
      status: "fail",
      detail: `Could not reach Meta Graph API: ${err instanceof Error ? err.message : String(err)}`,
    });
    return Response.json({ ok: false, checks, summary: "Network error" });
  }

  // 3. Ad account is reachable with this token.
  try {
    const acctRes = await fetch(
      `${graphBase}/act_${cleanAccount}?fields=id,name,account_status&access_token=${encodeURIComponent(token)}`,
    );
    const acctJson = await acctRes.json().catch(() => ({}));
    if (acctRes.ok) {
      const status = acctJson?.account_status;
      const statusLabel =
        status === 1 ? "ACTIVE" : status === 2 ? "DISABLED" : status === 3 ? "UNSETTLED" : status === 7 ? "PENDING_REVIEW" : status === 8 ? "PENDING_CLOSURE" : status === 9 ? "IN_GRACE_PERIOD" : `code ${status}`;
      checks.push({
        name: "Ad account is accessible",
        status: "ok",
        detail: `${acctJson?.name ?? "(no name)"} — status: ${statusLabel}`,
      });
      if (status && status !== 1) {
        checks.push({
          name: "Ad account is active",
          status: "fail",
          detail: `Ad account status is "${statusLabel}". Insights may return empty until this is resolved in Meta Business Manager.`,
        });
      }
    } else {
      const message = acctJson?.error?.message ?? `HTTP ${acctRes.status}`;
      checks.push({
        name: "Ad account is accessible",
        status: "fail",
        detail: `Could not access act_${cleanAccount}: ${message}. Common causes: wrong account id, token doesn't have ads_read scope, or token's user lacks access to this ad account.`,
      });
      return Response.json({ ok: false, checks, summary: "Ad account access denied" });
    }
  } catch (err) {
    checks.push({
      name: "Ad account is accessible",
      status: "fail",
      detail: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return Response.json({ ok: false, checks, summary: "Network error" });
  }

  // 4. There's at least some recent spend (last 30 days).
  try {
    const params = new URLSearchParams({
      fields: "spend",
      level: "account",
      date_preset: "last_30d",
      access_token: token,
    });
    const insightsRes = await fetch(`${graphBase}/act_${cleanAccount}/insights?${params}`);
    const insightsJson = await insightsRes.json().catch(() => ({}));
    if (insightsRes.ok) {
      const spend = parseFloat(insightsJson?.data?.[0]?.spend ?? "0");
      if (spend > 0) {
        checks.push({
          name: "Spend in the last 30 days",
          status: "ok",
          detail: `~$${spend.toFixed(2)} reported by Meta`,
        });
      } else {
        checks.push({
          name: "Spend in the last 30 days",
          status: "fail",
          detail: "No ad spend reported by Meta for this account in the last 30 days. Pick a window that includes spend, or verify campaigns are active in Ads Manager.",
        });
      }
    } else {
      const message = insightsJson?.error?.message ?? `HTTP ${insightsRes.status}`;
      checks.push({
        name: "Spend in the last 30 days",
        status: "fail",
        detail: `Insights query failed: ${message}`,
      });
    }
  } catch (err) {
    checks.push({
      name: "Spend in the last 30 days",
      status: "skip",
      detail: `Could not test: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const ok = checks.every((c) => c.status !== "fail");
  return Response.json({
    ok,
    checks,
    summary: ok ? "All checks passed" : "One or more checks failed — see details",
  });
}
