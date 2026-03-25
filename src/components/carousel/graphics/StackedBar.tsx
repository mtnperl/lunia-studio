import type { BrandStyle } from '@/lib/types';

interface Segment { label: string; percent: number; value?: string }
interface Props {
  segments?: Segment[];
  title?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS: Segment[] = [
  { label: 'LIGHT SLEEP', percent: 55, value: '4 hrs' },
  { label: 'DEEP SLEEP', percent: 22, value: '1.5 hrs' },
  { label: 'REM SLEEP', percent: 23, value: '1.5 hrs' },
];

export function StackedBar({ segments = DEFAULTS, title, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const barX = 60, barY = 100, barW = 816, barH = 52, rx = 26;
  const colors = [
    `${accent}50`, accent, `${accent}CC`, secondary,
  ];

  // Normalize percents to 100
  const total = segments.reduce((s, seg) => s + seg.percent, 0);
  let cumX = barX;

  return (
    <svg width={936} height={240} viewBox="0 0 936 240" overflow="visible">
      {title && (
        <text x={468} y={40} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="700"
          letterSpacing="0.1em" fill={bodyColor}>
          {title}
        </text>
      )}

      {/* Bar background */}
      <rect x={barX} y={barY} width={barW} height={barH} rx={rx} fill={`${bodyColor}08`} />

      {segments.map((seg, i) => {
        const segW = (seg.percent / total) * barW;
        const segX = cumX;
        cumX += segW;
        const isFirst = i === 0;
        const isLast = i === segments.length - 1;
        const segCx = segX + segW / 2;
        return (
          <g key={i}>
            <rect
              x={segX} y={barY} width={segW} height={barH}
              rx={isFirst || isLast ? rx : 0}
              fill={colors[i % colors.length]}
            />
            {/* Label above */}
            <text x={segCx} y={barY - 14} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="700"
              letterSpacing="0.06em" fill={bodyColor}>
              {seg.label}
            </text>
            {/* Tick */}
            <line x1={segCx} y1={barY - 6} x2={segCx} y2={barY + 2}
              stroke={`${bodyColor}40`} strokeWidth={1} />
            {/* Percent below */}
            <text x={segCx} y={barY + barH + 26} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="800" fill={accent}>
              {seg.percent}%
            </text>
            {/* Value below percent */}
            {seg.value && (
              <text x={segCx} y={barY + barH + 50} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="17" fill={secondary}>
                {seg.value}
              </text>
            )}
          </g>
        );
      })}

    </svg>
  );
}

export default StackedBar;
