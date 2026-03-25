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
  const W = 936, H = 320, cy = 150, r = 78;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {items.slice(0, n).map((item, i) => {
        const cxI = (W / (n + 1)) * (i + 1);
        return (
          <g key={i}>
            {/* Glow fill */}
            <circle cx={cxI} cy={cy} r={r} fill={`${accent}10`} />
            {/* Ring */}
            <circle cx={cxI} cy={cy} r={r} fill="none" stroke={accent} strokeWidth={3} />
            {/* Value */}
            <text x={cxI} y={item.sublabel ? cy - 10 : cy + 18} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize={item.value.length > 4 ? '36' : '52'}
              fontWeight="800" fill={accent}>
              {item.value}
            </text>
            {/* Sublabel (unit) */}
            {item.sublabel && (
              <text x={cxI} y={cy + 24} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="20" fill={secondary}>
                {item.sublabel}
              </text>
            )}
            {/* Label below circle */}
            <text x={cxI} y={cy + r + 32} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="19" fontWeight="700"
              letterSpacing="0.06em" fill={bodyColor}>
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default CircleStats;
