import type { BrandStyle } from '@/lib/types';

interface Props {
  value?: string;        // e.g. "96%" or "85"
  label?: string;        // e.g. "ABSORPTION WASTED"
  sublabel?: string;     // e.g. "with magnesium oxide"
  brandStyle?: BrandStyle;
}

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx: number, cy: number, r: number, pct: number): string {
  if (pct >= 1) pct = 0.9999;
  const end = polarToCart(cx, cy, r, 360 * pct);
  const start = polarToCart(cx, cy, r, 0);
  const large = pct > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function DonutChart({ value = '85%', label = 'EFFECTIVENESS', sublabel, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
  const pct = isNaN(numeric) ? 0.85 : Math.min(numeric / 100, 1);

  const w = 936;
  const h = 360;
  const cx = w / 2;
  const cy = h / 2 - 10;
  const outerR = 130;
  const innerR = 86;
  const trackW = outerR - innerR;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Track ring */}
      <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke={`${bodyColor}18`} strokeWidth={trackW} />
      {/* Filled arc */}
      <path
        d={donutArc(cx, cy, (outerR + innerR) / 2, pct)}
        fill="none"
        stroke={accent}
        strokeWidth={trackW}
        strokeLinecap="round"
      />
      {/* Center value */}
      <text x={cx} y={cy + 16} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="72" fontWeight="800" fill={accent}>
        {value}
      </text>
      {/* Label */}
      <text x={cx} y={cy + outerR + 42} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="26" fontWeight="700" letterSpacing="0.1em" fill={bodyColor}>
        {label}
      </text>
      {sublabel && (
        <text x={cx} y={cy + outerR + 76} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="20" fill={secondary}>
          {sublabel}
        </text>
      )}
    </svg>
  );
}

export default DonutChart;
