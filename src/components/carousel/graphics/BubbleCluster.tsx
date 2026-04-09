import type { BrandStyle } from '@/lib/types';

interface Bubble { label: string; size?: 1 | 2 | 3; sublabel?: string }
interface Props {
  items?: Bubble[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Bubble[] = [
  { label: 'Magnesium', size: 3 },
  { label: 'L-Theanine', size: 2 },
  { label: 'GABA', size: 1 },
];

export function BubbleCluster({ items = DEFAULTS, brandStyle }: Props) {
  const accent    = brandStyle?.accent    ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#6b7280';

  const n = Math.min(Math.max((items ?? []).length, 2), 5);
  const list = (items ?? []).slice(0, n);

  // Base diameter shrinks as count grows so they all fit in 936px wide container
  const baseDiam = n <= 2 ? 220 : n <= 3 ? 190 : n <= 4 ? 165 : 145;
  const labelSize = n <= 2 ? 24 : n <= 3 ? 21 : n <= 4 ? 18 : 16;
  const subSize   = Math.max(labelSize - 5, 12);
  const gap       = n <= 3 ? 36 : n <= 4 ? 20 : 14;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap,
      padding: '36px 48px',
      minHeight: 340,
      boxSizing: 'border-box',
    }}>
      {list.map((item, i) => {
        const sizeMulti = (item.size ?? 2) === 3 ? 1 : (item.size ?? 2) === 2 ? 0.82 : 0.66;
        const d = Math.round(baseDiam * sizeMulti);
        const isFeatured = i === 0;

        return (
          <div
            key={i}
            style={{
              width: d,
              height: d,
              borderRadius: '50%',
              background: isFeatured ? `${accent}22` : `${accent}10`,
              border: `${isFeatured ? 3 : 2}px solid ${accent}${isFeatured ? 'cc' : '55'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              boxSizing: 'border-box',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: labelSize,
              fontWeight: 700,
              color: accent,
              lineHeight: 1.25,
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}>
              {item.label}
            </div>
            {item.sublabel && (
              <div style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: subSize,
                color: secondary,
                marginTop: 6,
                lineHeight: 1.2,
                wordBreak: 'break-word',
              }}>
                {item.sublabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default BubbleCluster;
