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

  const width = 936;
  const barHeight = 36;
  const gap = 52;
  const labelW = 230;
  const valueW = 70;
  const maxBarW = width - labelW - valueW - 16;

  const numerics = items.map(i => parseNumeric(i.value));
  const maxVal = Math.max(...numerics, 1);

  const totalH = (barHeight + gap) * items.length - gap + 8;

  return (
    <svg width={width} height={totalH} viewBox={`0 0 ${width} ${totalH}`}>
      {items.map((item, i) => {
        const y = i * (barHeight + gap);
        const barW = Math.max((numerics[i] / maxVal) * maxBarW, 6);
        // Gradient: first bar = accent, rest get progressively more muted
        const fill = i === 0 ? accent : i === 1 ? secondary : `${secondary}99`;
        return (
          <g key={i}>
            {/* Label */}
            <text
              x={0} y={y + barHeight / 2 + 6}
              fontFamily="Outfit, sans-serif" fontSize="24" fill={bodyColor}
            >
              {item.label}
            </text>
            {/* Track */}
            <rect
              x={labelW} y={y}
              width={maxBarW} height={barHeight}
              rx={barHeight / 2}
              fill={`${bodyColor}15`}
            />
            {/* Value bar */}
            <rect
              x={labelW} y={y}
              width={barW} height={barHeight}
              rx={barHeight / 2}
              fill={fill}
            />
            {/* Value label */}
            <text
              x={labelW + maxBarW + 12} y={y + barHeight / 2 + 7}
              fontFamily="Outfit, sans-serif" fontSize="24" fontWeight="700"
              fill={i === 0 ? accent : bodyColor}
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default ComparisonBars;
