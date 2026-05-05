# SimpleFIN setup

The Business → Cash & Expenses page reads live bank data through SimpleFIN, a read-only banking aggregator. One-time setup:

## 1. Create a SimpleFIN account

1. Sign up at [simplefin.org](https://www.simplefin.org/).
2. Connect your business bank accounts via the SimpleFIN bridge.
3. From the bridge dashboard, generate a **Setup Token** for a new app.

## 2. Claim an Access URL

The Setup Token can only be used once and expires quickly. Run this immediately after generating it:

```bash
curl -X POST "https://beta-bridge.simplefin.org/simplefin/claim/<SETUP_TOKEN>"
```

You'll get back a long URL like `https://username:password@beta-bridge.simplefin.org/simplefin`. **This is your Access URL.** Treat it like a password — the embedded credentials grant read access to your bank data.

## 3. Add to environment

Set in your local `.env.local` (and Vercel project env if deployed):

```
SIMPLEFIN_ACCESS_URL=https://username:password@beta-bridge.simplefin.org/simplefin

# Optional — filter to specific accounts by last-4 of the account number.
# Comma-separated. Match runs against account name (typically embeds last-4 in
# parens) or the SimpleFIN id suffix. Leave unset to include every connected
# account.
SIMPLEFIN_ACCOUNT_SUFFIXES=3877,6844
```

The app reads both server-side only. They are never sent to the browser.

## 4. Verify

Visit `Business → Cash & Expenses` in the app. You should see:

- Account balance tiles (one per connected account).
- A transaction list for the selected date range.
- A "bank connection warning" banner if any per-account error came back from the bridge.

If you see "SimpleFIN credentials expired", regenerate the Access URL with a new Setup Token and update the env var.

## Refresh cadence

The app caches SimpleFIN responses for 1 hour per date range. Hit the Refresh button on the page to bypass the cache.
