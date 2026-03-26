import { describe, test, expect } from 'vitest';
import { calcROAS, calcAOV, joinDays, computeDateRange } from '@/lib/analytics-utils';

describe('calcROAS', () => {
  test('normal case', () => expect(calcROAS(1000, 4200)).toBeCloseTo(4.2));
  test('spend = 0 returns 0 (NaN guard)', () => expect(calcROAS(0, 1200)).toBe(0));
});

describe('calcAOV', () => {
  test('normal case', () => expect(calcAOV(10, 1200)).toBeCloseTo(120));
  test('orders = 0 returns 0 (div/0 guard)', () => expect(calcAOV(0, 5000)).toBe(0));
});

describe('joinDays', () => {
  const meta = [
    { date: '2026-03-01', spend: 100, revenue: 400 },
    { date: '2026-03-02', spend: 150, revenue: 600 },
  ];
  const shopify = [
    { date: '2026-03-01', orders: 4, revenue: 480 },
    { date: '2026-03-03', orders: 2, revenue: 240 }, // Shopify-only day
  ];

  test('Meta days are authoritative — Shopify-only day excluded', () => {
    const result = joinDays(meta, shopify);
    expect(result.map(d => d.date)).toEqual(['2026-03-01', '2026-03-02']);
  });

  test('Shopify revenue joined on matching date', () => {
    const result = joinDays(meta, shopify);
    expect(result[0].shopifyRevenue).toBe(480);
  });

  test('Missing Shopify day defaults to 0 revenue and 0 orders', () => {
    const result = joinDays(meta, shopify);
    expect(result[1].shopifyRevenue).toBe(0);
    expect(result[1].shopifyOrders).toBe(0);
  });

  test('Result sorted ascending by date', () => {
    const reversed = [...meta].reverse();
    const result = joinDays(reversed, shopify);
    expect(result[0].date < result[1].date).toBe(true);
  });
});

describe('computeDateRange', () => {
  test('start < end', () => {
    const { start, end } = computeDateRange(30);
    expect(start < end).toBe(true);
  });
  test('YYYY-MM-DD format', () => {
    const { start, end } = computeDateRange(7);
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
