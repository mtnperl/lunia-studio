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

  // Hero grade — length-aware so long scores still fit.
  const scoreSize = score.length <= 2 ? 200 : score.length <= 4 ? 130 : 88;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* Hero score (clean — no heavy frame / corner ticks) */}
      <span style={{ fontSize: scoreSize, fontWeight: 700, color: accent, lineHeight: 0.9, letterSpacing: '-0.03em' }}>
        {score}
      </span>

      {/* Thin accent underline */}
      <div style={{ width: 64, height: 3, borderRadius: 2, background: accent, marginTop: 24, marginBottom: 22 }} />

      <span style={{ fontSize: 27, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: bodyColor, textAlign: 'center', opacity: 0.85 }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 20, color: secondary, marginTop: 8, textAlign: 'center' }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

export default ScoreCard;
