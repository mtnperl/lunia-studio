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

  return (
    <svg width={936} height={360} viewBox="0 0 936 360">
      <line x1={120} y1={60} x2={816} y2={60} stroke={accent} strokeWidth="1.5" />
      <text x={468} y={220} textAnchor="middle" fontFamily="Outfit" fontSize="140" fontWeight="700" fill={accent}>
        {stat}
      </text>
      {trend && trendColor && (
        <text x={716} y={140} textAnchor="middle" fontFamily="Outfit" fontSize="64" fontWeight="700" fill={trendColor}>
          {trend === 'up' ? '↑' : '↓'}
        </text>
      )}
      <line x1={120} y1={270} x2={816} y2={270} stroke={accent} strokeWidth="1.5" />
      <text x={468} y={330} textAnchor="middle" fontFamily="Outfit" fontSize="30" fill={bodyColor} letterSpacing="3">
        {label}
      </text>
    </svg>
  );
}

export default StatCallout;
