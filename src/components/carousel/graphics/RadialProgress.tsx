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
  const te = polarToCart(cx, cy, r, 135);

  const fillEndDeg = (START + pct * SWEEP) % 360;
  const fe = polarToCart(cx, cy, r, fillEndDeg);
  const fillLarge = pct * SWEEP > 180 ? 1 : 0;

  // Dynamic font size for center value
  const valueSize = value.length <= 4 ? 110 : value.length <= 6 ? 80 : 60;

  return (
    <div style={{ width: '100%', aspectRatio: `${W} / ${H}`, position: 'relative' }}>
      {/* SVG for arcs only */}
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" overflow="visible" style={{ position: 'absolute', top: 0, left: 0 }}>
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
      </svg>

      {/* CSS text overlays — centered in the arc */}
      <div style={{
        position: 'absolute',
        top: `${((cy - r) / H) * 100}%`,
        left: `${((cx - r) / W) * 100}%`,
        width: `${((r * 2) / W) * 100}%`,
        height: `${((r * 2) / H) * 100}%`,
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

      {/* Label below arc */}
      <div style={{
        position: 'absolute',
        top: `${((cy + r + sw / 2 + 16) / H) * 100}%`,
        left: 0,
        width: '100%',
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

export default RadialProgress;
