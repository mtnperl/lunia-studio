import type { BrandStyle } from '@/lib/types';

interface Props {
  icon?: string;
  value?: string;
  unit?: string;
  label?: string;
  sublabel?: string;
  brandStyle?: BrandStyle;
}

export function IconStat({ icon = '🧠', value = '23%', unit, label = 'INCREASE IN ALPHA BRAIN WAVES', sublabel, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const valFontSize = value.length <= 4 ? 110 : value.length <= 6 ? 80 : 64;

  return (
    <svg width={936} height={360} viewBox="0 0 936 360" overflow="visible">
      {/* Icon */}
      <text x={468} y={100} textAnchor="middle"
        fontFamily="'Segoe UI Emoji', 'Apple Color Emoji', sans-serif" fontSize="80">
        {icon}
      </text>
      {/* Thin separator */}
      <line x1={340} y1={118} x2={596} y2={118} stroke={`${accent}40`} strokeWidth={1.5} />
      {/* Value */}
      {unit ? (
        <>
          <text x={440} y={242} textAnchor="end"
            fontFamily="Outfit, sans-serif" fontSize={valFontSize} fontWeight="800" fill={accent}>
            {value}
          </text>
          <text x={452} y={216} textAnchor="start"
            fontFamily="Outfit, sans-serif" fontSize="32" fontWeight="700" fill={secondary}>
            {unit}
          </text>
        </>
      ) : (
        <text x={468} y={242} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize={valFontSize} fontWeight="800" fill={accent}>
          {value}
        </text>
      )}
      {/* Label */}
      <text x={468} y={290} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="24" fontWeight="700"
        letterSpacing="0.1em" fill={bodyColor}>
        {label}
      </text>
      {sublabel && (
        <text x={468} y={326} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="19" fill={secondary}>
          {sublabel}
        </text>
      )}
    </svg>
  );
}

export default IconStat;
