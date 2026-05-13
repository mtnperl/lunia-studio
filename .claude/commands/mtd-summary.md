---
description: Generate a month-to-date performance summary for the current month
---

# MTD Summary

Generate a full month-to-date performance report for the current calendar month.

## Steps

### 1. Gather MTD Data
Pull from the MTD API routes (server-side computed):
- Gross revenue MTD
- Net revenue MTD (gross − refunds − discounts)
- Total orders MTD
- Refund rate MTD
- Returning customer rate MTD
- Checkout funnel: Sessions → Add to Cart → Checkout Initiated → Purchased

### 2. Compare to Previous Month (same period)
- Same day-range of last month for apples-to-apples comparison
- Calculate % change for each metric

### 3. Campaign Breakdown
- Revenue attributed per campaign
- ROAS per campaign (if data available)
- Top 3 and bottom 3 campaigns by revenue

### 4. Output Summary

```
## MTD Summary — [MONTH YEAR] (through [DATE])

### Revenue
| | MTD | Prior Period | Change |
|--|-----|-------------|--------|
| Gross Revenue | | | |
| Net Revenue | | | |
| Refund Rate | | | |

### Orders & Customers
| | MTD | Prior Period | Change |
|--|-----|-------------|--------|
| Total Orders | | | |
| Returning Customer Rate | | | |

### Checkout Funnel
Sessions → Add to Cart → Checkout → Purchased
[X] → [X] → [X] → [X]  (conv rate: X%)

### Top Campaigns
| Campaign | Revenue | ROAS |
|----------|---------|------|
| | | |

### Key Takeaways
- [2-4 bullet points]
```
