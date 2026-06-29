import type { BrandStyle } from '@/lib/types';

interface Props {
  items?: { label: string; value: string }[];
  brandStyle?: BrandStyle;
}

/** Parse the first numeric value from strings like "4%", "85%", "2.3x", "42mg" */
function parseNumeric(v: string): number {
  const match = v.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function ComparisonBars({
  items = [
    { label: 'Magnesium Glycinate', value: '85%' },
    { label: 'Magnesium Citrate', value: '42%' },
    { label: 'Magnesium Oxide', value: '4%' },
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body ?? '#4a5568';

  const numerics = items.map(i => parseNumeric(i.value));
  const maxVal = Math.max(...numerics, 1);
  // Fewer rows → bigger hero number; more rows → keep it compact so it fits.
  const valueSize = items.length <= 2 ? 68 : items.length === 3 ? 54 : 44;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: items.length <= 2 ? 36 : 26,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {items.map((item, i) => {
        const pct = Math.max((numerics[i] / maxVal) * 100, 3);
        // Highlight the MAX-value bar (the meaningful comparison) in accent.
        const isTop = numerics[i] === maxVal;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Label + the value as a big hero number */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
              <span style={{
                fontSize: 25,
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: isTop ? bodyColor : `${bodyColor}99`,
                paddingBottom: 12,
                lineHeight: 1.15,
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: valueSize,
                fontWeight: 700,
                lineHeight: 0.82,
                letterSpacing: '-0.02em',
                color: isTop ? accent : bodyColor,
                whiteSpace: 'nowrap',
              }}>
                {item.value}
              </span>
            </div>
            {/* Thin elegant bar */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: 14,
              borderRadius: 7,
              background: `${bodyColor}14`,
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 7,
                background: isTop ? accent : `${secondary}bb`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ComparisonBars;
