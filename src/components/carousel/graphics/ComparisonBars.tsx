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

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {items.map((item, i) => {
        const pct = Math.max((numerics[i] / maxVal) * 100, 2);
        // Highlight the MAX-value bar (the meaningful comparison) in accent;
        // the rest stay muted. Was always the first bar, which mis-emphasized
        // cases like "BASELINE 100%" vs "REBOUND 130%".
        const isTop = numerics[i] === maxVal;
        const fill = isTop ? accent : `${secondary}cc`;

        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Label row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingLeft: 2,
              paddingRight: 2,
            }}>
              <span style={{
                fontSize: 24,
                fontWeight: 400,
                color: bodyColor,
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 24,
                fontWeight: 700,
                color: isTop ? accent : bodyColor,
                lineHeight: 1.2,
              }}>
                {item.value}
              </span>
            </div>
            {/* Bar track */}
            <div style={{
              position: 'relative',
              height: 36,
              borderRadius: 18,
              background: `${bodyColor}15`,
              overflow: 'hidden',
            }}>
              {/* Glow halo on top bar */}
              {isTop && (
                <div style={{
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 20,
                  background: `${accent}20`,
                }} />
              )}
              {/* Value bar */}
              <div style={{
                position: 'relative',
                width: `${pct}%`,
                height: '100%',
                borderRadius: 18,
                background: fill,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ComparisonBars;
