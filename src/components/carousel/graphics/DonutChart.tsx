import type { BrandStyle } from '@/lib/types';

interface Props {
  value?: string;
  label?: string;
  sublabel?: string;
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
  const h = 460;
  const cx = w / 2;
  const cy = h / 2 - 10;
  const outerR = 155;
  const innerR = 103;
  const trackW = outerR - innerR;

  // Dynamic font size for center value
  const valueSize = value.length <= 4 ? 90 : value.length <= 6 ? 70 : 54;

  return (
    <div style={{ width: w, height: h, position: 'relative' }}>
      {/* SVG for arcs only */}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: 0, left: 0 }}>
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke={`${bodyColor}18`} strokeWidth={trackW} />
        <path
          d={donutArc(cx, cy, (outerR + innerR) / 2, pct)}
          fill="none"
          stroke={accent}
          strokeWidth={trackW}
          strokeLinecap="round"
        />
      </svg>

      {/* CSS text overlays */}
      {/* Center value */}
      <div style={{
        position: 'absolute',
        top: cy - outerR,
        left: cx - outerR,
        width: outerR * 2,
        height: outerR * 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: valueSize,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}>
          {value}
        </span>
      </div>

      {/* Label below ring */}
      <div style={{
        position: 'absolute',
        top: cy + outerR + 16,
        left: 0,
        width: w,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: bodyColor,
          textAlign: 'center',
        }}>
          {label}
        </span>
        {sublabel && (
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 20,
            color: secondary,
            textAlign: 'center',
          }}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}

export default DonutChart;
