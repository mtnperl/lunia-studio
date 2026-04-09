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
  const W = 936, H = 460, cy = 215, r = n <= 3 ? 110 : 90;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {items.slice(0, n).map((item, i) => {
        const cxI = (W / (n + 1)) * (i + 1);
        const valueSize = item.value.length > 5 ? (n <= 3 ? '44' : '36') : (n <= 3 ? '64' : '52');
        return (
          <g key={i}>
            {/* Glow fill */}
            <circle cx={cxI} cy={cy} r={r} fill={`${accent}12`} />
            {/* Ring */}
            <circle cx={cxI} cy={cy} r={r} fill="none" stroke={accent} strokeWidth={3.5} />
            {/* Value */}
            <text x={cxI} y={item.sublabel ? cy - 8 : cy + 22} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize={valueSize}
              fontWeight="800" fill={accent}>
              {item.value}
            </text>
            {/* Sublabel (unit) */}
            {item.sublabel && (
              <text x={cxI} y={cy + 28} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="600" fill={secondary}>
                {item.sublabel}
              </text>
            )}
            {/* Label below circle */}
            <text x={cxI} y={cy + r + 38} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="20" fontWeight="700"
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
