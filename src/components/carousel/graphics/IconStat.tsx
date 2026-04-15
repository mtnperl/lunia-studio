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
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      fontFamily: 'Outfit, sans-serif',
      minHeight: 340,
    }}>
      {/* Icon */}
      <span style={{ fontSize: 80, lineHeight: 1 }}>{icon}</span>

      {/* Separator */}
      <div style={{
        width: 256,
        height: 1.5,
        background: `${accent}40`,
        marginTop: 4,
        marginBottom: 4,
      }} />

      {/* Value + optional unit */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}>
        <span style={{
          fontSize: valFontSize,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{
            fontSize: 32,
            fontWeight: 700,
            color: secondary,
            lineHeight: 1,
          }}>
            {unit}
          </span>
        )}
      </div>

      {/* Label */}
      <span style={{
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: bodyColor,
        textAlign: 'center',
        lineHeight: 1.3,
        maxWidth: 700,
      }}>
        {label}
      </span>

      {sublabel && (
        <span style={{
          fontSize: 19,
          color: secondary,
          textAlign: 'center',
        }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export default IconStat;
