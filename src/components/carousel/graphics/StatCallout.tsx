import type { BrandStyle } from '@/lib/types';

interface Props {
  stat?: string;
  label?: string;
  unit?: string;
  trend?: 'up' | 'down' | null;
  brandStyle?: BrandStyle;
}

export function StatCallout({
  stat = '87%',
  label = 'OF ADULTS ARE MAGNESIUM DEFICIENT',
  unit,
  trend,
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : null;

  // Hero number — bigger, length-aware so it never overflows.
  const statSize = stat.length <= 4 ? 168 : stat.length <= 6 ? 120 : 84;
  const unitSize = Math.round(statSize * 0.26);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* Hero stat */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: unit ? 14 : 12 }}>
        <span style={{ fontSize: statSize, fontWeight: 700, color: accent, lineHeight: 0.9, letterSpacing: '-0.03em' }}>
          {stat}
        </span>
        {unit && (
          <span style={{ fontSize: unitSize, fontWeight: 500, color: secondary, lineHeight: 1, letterSpacing: '0.02em', textTransform: 'lowercase' }}>
            {unit}
          </span>
        )}
        {trend && trendColor && (
          <span style={{ fontSize: 72, fontWeight: 700, color: trendColor, lineHeight: 1 }}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Thin accent underline (replaces the old top/bottom rules) */}
      <div style={{ width: 64, height: 3, borderRadius: 2, background: accent, marginTop: 26, marginBottom: 24 }} />

      {/* Label */}
      <div style={{
        fontSize: 27,
        fontWeight: 600,
        color: bodyColor,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.35,
        paddingLeft: 40,
        paddingRight: 40,
        opacity: 0.85,
      }}>
        {label}
      </div>
    </div>
  );
}

export default StatCallout;
