import { describe, test, expect } from 'vitest';
import { GraphicSpecSchema } from '@/lib/types';

describe('GraphicSpecSchema — iconLayout', () => {
  test('valid single icon row layout', () => {
    const result = GraphicSpecSchema.safeParse({
      component: 'iconLayout',
      data: { icons: [{ id: 'moon' }], layout: 'row' },
    });
    expect(result.success).toBe(true);
  });

  test('valid 4-icon grid layout', () => {
    const result = GraphicSpecSchema.safeParse({
      component: 'iconLayout',
      data: {
        icons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
        layout: 'grid',
      },
    });
    expect(result.success).toBe(true);
  });

  test('all layout variants accepted', () => {
    const layouts = ['row', 'column', 'grid', 'scattered'] as const;
    for (const layout of layouts) {
      const result = GraphicSpecSchema.safeParse({
        component: 'iconLayout',
        data: { icons: [{ id: 'moon' }, { id: 'sun' }], layout },
      });
      expect(result.success, `layout "${layout}" should be valid`).toBe(true);
    }
  });

  test('rejects more than 4 icons', () => {
    const result = GraphicSpecSchema.safeParse({
      component: 'iconLayout',
      data: {
        icons: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
        layout: 'row',
      },
    });
    expect(result.success).toBe(false);
  });

  test('rejects empty icons array', () => {
    const result = GraphicSpecSchema.safeParse({
      component: 'iconLayout',
      data: { icons: [], layout: 'row' },
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid layout value', () => {
    const result = GraphicSpecSchema.safeParse({
      component: 'iconLayout',
      data: { icons: [{ id: 'moon' }], layout: 'diagonal' },
    });
    expect(result.success).toBe(false);
  });
});
