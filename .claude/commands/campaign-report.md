---
description: Generate a detailed campaign analytics report. Pass campaign name/ID as argument, or omit for all campaigns.
---

# Campaign Report

Generate a detailed analytics report for a specific campaign or all campaigns.

**Usage:** `/campaign-report [campaign name or ID]`

## Steps

### 1. Identify Target
- If `$ARGUMENTS` is provided, look up that specific campaign
- Otherwise, report on all active campaigns

### 2. Pull Campaign Data
For each campaign in scope:
- Impressions / reach (if available)
- Clicks / sessions attributed
- Orders attributed
- Revenue attributed (gross and net)
- Ad spend (if tracked)
- ROAS = revenue / spend
- Conversion rate = orders / sessions

### 3. Attribution Check
- Verify data isn't stale (check meta cache freshness)
- Flag any campaigns with missing attribution data

### 4. Output Report

```
## Campaign Report — [CAMPAIGN NAME / ALL]
Generated: [DATE]

### Overview
| Campaign | Sessions | Orders | Revenue | ROAS | Conv% |
|----------|----------|--------|---------|------|-------|
| | | | | | |

### Top Performer
[Name] — [key metric highlight]

### Underperformer / Flag
[Name] — [issue]

### Recommendations
- [1-3 specific actions]
```
