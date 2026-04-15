import type { BrandStyle } from '@/lib/types';

interface Props {
  score?: string;
  label?: string;
  sublabel?: string;
  brandStyle?: BrandStyle;
}

export function ScoreCard({ score = 'A+', label = 'SLEEP QUALITY RATING', sublabel, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  // Scale font size based on score length
  const scoreSize = score.length <= 2 ? 180 : score.length <= 4 ? 120 : 80;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
      position: 'relative',
    }}>
      {/* Score frame */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 456,
        height: 320,
        border: `3px solid ${accent}`,
        borderRadius: 4,
        background: `${accent}08`,
        position: 'relative',
      }}>
        {/* Corner accents */}
        {/* Top-left */}
        <div style={{ position: 'absolute', top: -3, left: -3, width: 60, height: 3, background: accent }} />
        <div style={{ position: 'absolute', top: -3, left: -3, width: 3, height: 52, background: accent }} />
        {/* Top-right */}
        <div style={{ position: 'absolute', top: -3, right: -3, width: 60, height: 3, background: accent }} />
        <div style={{ position: 'absolute', top: -3, right: -3, width: 3, height: 52, background: accent }} />
        {/* Bottom-left */}
        <div style={{ position: 'absolute', bottom: -3, left: -3, width: 60, height: 3, background: accent }} />
        <div style={{ position: 'absolute', bottom: -3, left: -3, width: 3, height: 52, background: accent }} />
        {/* Bottom-right */}
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 60, height: 3, background: accent }} />
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 3, height: 52, background: accent }} />

        {/* Score */}
        <span style={{
          fontSize: scoreSize,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}>
          {score}
        </span>
      </div>

      {/* Divider */}
      <div style={{
        width: 296,
        height: 1,
        background: `${bodyColor}25`,
        marginTop: 20,
        marginBottom: 14,
      }} />

      {/* Label */}
      <span style={{
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: bodyColor,
        textAlign: 'center',
      }}>
        {label}
      </span>

      {sublabel && (
        <span style={{
          fontSize: 18,
          color: secondary,
          marginTop: 6,
          textAlign: 'center',
        }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export default ScoreCard;
