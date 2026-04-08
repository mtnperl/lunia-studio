import { describe, test, expect } from 'vitest';
import { CAROUSEL_ICONS } from '@/lib/carousel-icons';
import type { IconCategory } from '@/lib/carousel-icons';

describe('CAROUSEL_ICONS', () => {
  test('all icons have required fields', () => {
    for (const icon of CAROUSEL_ICONS) {
      expect(icon.id).toBeTruthy();
      expect(icon.label).toBeTruthy();
      expect(icon.category).toBeTruthy();
      expect(icon.svg).toBeTruthy();
    }
  });

  test('"mind" category exists', () => {
    const mindIcons = CAROUSEL_ICONS.filter(i => i.category === 'mind');
    expect(mindIcons.length).toBeGreaterThan(0);
  });

  test('all 5 categories are represented', () => {
    const categories = new Set(CAROUSEL_ICONS.map(i => i.category));
    const expected: IconCategory[] = ['sleep', 'health', 'lifestyle', 'fitness', 'mind'];
    for (const cat of expected) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  test('no duplicate icon ids', () => {
    const ids = CAROUSEL_ICONS.map(i => i.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('at least 10 icons per category', () => {
    const cats: IconCategory[] = ['sleep', 'health', 'lifestyle', 'fitness', 'mind'];
    for (const cat of cats) {
      const count = CAROUSEL_ICONS.filter(i => i.category === cat).length;
      expect(count, `${cat} should have >= 10 icons`).toBeGreaterThanOrEqual(10);
    }
  });
});
