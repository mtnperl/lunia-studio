import type { BrandStyle } from '@/lib/types';

interface Item { value: string; label: string; sublabel?: string }
interface Props {
  items?: Item[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Item[] = [
  { value: '7–9', sublabel: 'hrs', label: 'OPTIMAL SLEEP' },
  { value: '23%', label: 'MORE REM SLEEP' },
  { value: '40', sublabel: 'min', label: 'FASTER ONSET' },
];

export function CircleStats({ items = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(items.length, 4);
  const list = items.slice(0, n);
  const circleSize = n <= 3 ? 220 : 180;

  return (
    <div style={{
      width: 936,
      display: 'flex',
      justifyContent: 'space-evenly',
      alignItems: 'flex-start',
      fontFamily: 'Outfit, sans-serif',
      gap: 12,
    }}>
      {list.map((item, i) => {
        const valueSize = item.value.length > 5 ? (n <= 3 ? 44 : 36) : (n <= 3 ? 64 : 52);

        return (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}>
            {/* Circle with value */}
            <div style={{
              width: circleSize,
              height: circleSize,
              borderRadius: '50%',
              border: `3.5px solid ${accent}`,
              background: `${accent}12`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}>
              <span style={{
                fontSize: valueSize,
                fontWeight: 800,
                color: accent,
                lineHeight: 1,
              }}>
                {item.value}
              </span>
              {item.sublabel && (
                <span style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: secondary,
                  lineHeight: 1,
                }}>
                  {item.sublabel}
                </span>
              )}
            </div>

            {/* Label below circle */}
            <span style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: bodyColor,
              textAlign: 'center',
              lineHeight: 1.3,
              maxWidth: circleSize + 20,
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default CircleStats;
