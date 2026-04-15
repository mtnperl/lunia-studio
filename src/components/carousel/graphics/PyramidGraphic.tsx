import type { BrandStyle } from '@/lib/types';

interface Props {
  levels?: string[];
  brandStyle?: BrandStyle;
}

export function PyramidGraphic({
  levels = ['REM Sleep', 'Deep Sleep (N3)', 'Core Sleep (N2)', 'Light Sleep (N1)'],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const n = Math.min(levels.length, 5);
  const list = levels.slice(0, n);

  return (
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {list.map((label, i) => {
        const widthPct = 20 + ((i + 1) / n) * 70;
        const opacity = 1 - (i / n) * 0.55;
        const isApex = i === 0;

        return (
          <div key={i} style={{
            width: `${widthPct}%`,
            padding: '16px 24px',
            background: accent,
            opacity,
            borderRadius: isApex ? '8px 8px 4px 4px' : i === n - 1 ? '4px 4px 8px 8px' : 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 52,
          }}>
            <span style={{
              fontSize: isApex ? 22 : 24,
              fontWeight: isApex ? 700 : 500,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default PyramidGraphic;
