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
  const fontSize = score.length <= 2 ? 180 : score.length <= 4 ? 120 : 80;

  return (
    <svg width={936} height={460} viewBox="0 0 936 460" overflow="visible">
      {/* Corner accent lines */}
      <line x1={240} y1={30} x2={300} y2={30} stroke={accent} strokeWidth={3} />
      <line x1={240} y1={30} x2={240} y2={82} stroke={accent} strokeWidth={3} />
      <line x1={696} y1={30} x2={636} y2={30} stroke={accent} strokeWidth={3} />
      <line x1={696} y1={30} x2={696} y2={82} stroke={accent} strokeWidth={3} />
      <line x1={240} y1={353} x2={300} y2={353} stroke={accent} strokeWidth={3} />
      <line x1={240} y1={353} x2={240} y2={302} stroke={accent} strokeWidth={3} />
      <line x1={696} y1={353} x2={636} y2={353} stroke={accent} strokeWidth={3} />
      <line x1={696} y1={353} x2={696} y2={302} stroke={accent} strokeWidth={3} />
      {/* Inner fill */}
      <rect x={250} y={38} width={436} height={320} rx={4} fill={`${accent}08`} />
      {/* Score */}
      <text x={468} y={270} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize={fontSize} fontWeight="800" fill={accent}>
        {score}
      </text>
      {/* Divider */}
      <line x1={320} y1={378} x2={616} y2={378} stroke={`${bodyColor}25`} strokeWidth={1} />
      {/* Label */}
      <text x={468} y={413} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="26" fontWeight="700"
        letterSpacing="0.12em" fill={bodyColor}>
        {label}
      </text>
      {sublabel && (
        <text x={468} y={444} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="18" fill={secondary}>
          {sublabel}
        </text>
      )}
    </svg>
  );
}

export default ScoreCard;
