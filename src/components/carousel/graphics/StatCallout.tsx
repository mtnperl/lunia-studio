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
  trend,
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#ef4444' : null;

  // Dynamic font size based on stat length
  const statSize = stat.length <= 4 ? 140 : stat.length <= 6 ? 100 : 72;

  return (
    <div style={{
      width: 936,
      height: 460,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
      gap: 0,
    }}>
      {/* Top rule */}
      <div style={{
        width: '75%',
        height: 1.5,
        background: accent,
        flexShrink: 0,
      }} />

      {/* Stat + trend container */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        position: 'relative',
      }}>
        <span style={{
          fontSize: statSize,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}>
          {stat}
        </span>
        {trend && trendColor && (
          <span style={{
            fontSize: 64,
            fontWeight: 700,
            color: trendColor,
            lineHeight: 1,
          }}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>

      {/* Bottom rule */}
      <div style={{
        width: '75%',
        height: 1.5,
        background: accent,
        flexShrink: 0,
      }} />

      {/* Label */}
      <div style={{
        marginTop: 28,
        fontSize: 30,
        fontWeight: 400,
        color: bodyColor,
        letterSpacing: '0.1em',
        textAlign: 'center',
        lineHeight: 1.3,
        paddingLeft: 40,
        paddingRight: 40,
      }}>
        {label}
      </div>
    </div>
  );
}

export default StatCallout;
