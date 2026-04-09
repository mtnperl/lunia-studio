import type { BrandStyle } from '@/lib/types';

interface Props {
  value?: string;
  label?: string;
  sublabel?: string;
  brandStyle?: BrandStyle;
}

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function RadialProgress({ value = '87%', label = 'OF ADULTS DEFICIENT', sublabel, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const numeric = parseFloat(value.replace(/[^0-9.]/g, ''));
  const pct = isNaN(numeric) ? 0.87 : Math.min(numeric, 100) / 100;

  const W = 936, H = 460, cx = W / 2, cy = 205, r = 150, sw = 28;
  const START = 225, SWEEP = 270;

  const ts = polarToCart(cx, cy, r, START);
  const te = polarToCart(cx, cy, r, 135); // 225+270=495 mod 360 = 135

  const fillEndDeg = (START + pct * SWEEP) % 360;
  const fe = polarToCart(cx, cy, r, fillEndDeg);
  const fillLarge = pct * SWEEP > 180 ? 1 : 0;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {/* Track */}
      <path
        d={`M ${ts.x.toFixed(1)} ${ts.y.toFixed(1)} A ${r} ${r} 0 1 1 ${te.x.toFixed(1)} ${te.y.toFixed(1)}`}
        fill="none" stroke={`${bodyColor}18`} strokeWidth={sw} strokeLinecap="round"
      />
      {/* Filled arc */}
      {pct > 0.02 && (
        <path
          d={`M ${ts.x.toFixed(1)} ${ts.y.toFixed(1)} A ${r} ${r} 0 ${fillLarge} 1 ${fe.x.toFixed(1)} ${fe.y.toFixed(1)}`}
          fill="none" stroke={accent} strokeWidth={sw} strokeLinecap="round"
        />
      )}
      {/* Accent dot at tip */}
      {pct > 0.02 && (
        <circle cx={fe.x.toFixed(1)} cy={fe.y.toFixed(1)} r={sw / 2 + 4} fill={accent} opacity={0.25} />
      )}
      {/* Value */}
      <text x={cx} y={cy + 24} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="110" fontWeight="800" fill={accent}>
        {value}
      </text>
      {/* Label */}
      <text x={cx} y={cy + r + sw / 2 + 46} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="26" fontWeight="700" letterSpacing="0.1em" fill={bodyColor}>
        {label}
      </text>
      {sublabel && (
        <text x={cx} y={cy + r + sw / 2 + 80} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="20" fill={secondary}>
          {sublabel}
        </text>
      )}
    </svg>
  );
}

export default RadialProgress;
