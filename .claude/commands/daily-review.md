---
description: Review today's Shopify metrics, flag anomalies, and produce a summary
---

# Daily Review

Pull today's Shopify metrics and produce a concise health check.

## Steps

### 1. Fetch Today's Data
Read the relevant API routes and data sources to get:
- Today's revenue (gross and net)
- Order count
- Conversion rate (sessions → purchased)
- Refund rate
- Top-performing campaigns

### 2. Compare to Baseline
- Compare to the 7-day rolling average
- Flag any metric that is >20% above or below baseline
- Note any campaigns with unusual spend vs revenue ratio

### 3. Check for Errors
- Look at recent server logs or error boundaries for any failed Shopify API calls
- Check for null/undefined data in CampaignTable or analytics components

### 4. Produce Summary
Output a concise daily review in this format:

```
## Daily Review — [DATE]

### Headline Metrics
| Metric | Today | 7d Avg | Delta |
|--------|-------|--------|-------|
| Gross Revenue | | | |
| Net Revenue | | | |
| Orders | | | |
| Refund Rate | | | |
| Conv. Rate | | | |

### Anomalies
- [list any flags]

### Errors / Issues
- [list any errors found]

### Recommendations
- [1-3 action items]
```
