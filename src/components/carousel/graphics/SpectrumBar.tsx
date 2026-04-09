import type { BrandStyle } from '@/lib/types';

interface Props {
  min?: number;
  max?: number;
  from?: number;
  to?: number;
  label?: string;
  unit?: string;
  brandStyle?: BrandStyle;
}

export function SpectrumBar({ min = 0, max = 12, from = 7, to = 9, label = 'OPTIMAL SLEEP RANGE', unit = 'hrs', brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const trackX = 60, trackW = 816, trackY = 200, trackH = 40, rx = 20;
  const range = max - min;
  const hlX = trackX + ((from - min) / range) * trackW;
  const hlW = ((to - from) / range) * trackW;
  const hlCx = hlX + hlW / 2;

  const fullLabel = unit ? `${label} (${unit})` : label;

  return (
    <svg width={936} height={460} viewBox="0 0 936 460" overflow="visible">
      {/* Highlight range label — big, above track */}
      <text x={hlCx} y={trackY - 52} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="72" fontWeight="800" fill={accent}>
        {from}–{to}
      </text>
      {/* Unit */}
      {unit && (
        <text x={hlCx} y={trackY - 10} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="600" letterSpacing="0.08em" fill={`${accent}99`}>
          {unit}
        </text>
      )}
      {/* Track background */}
      <rect x={trackX} y={trackY} width={trackW} height={trackH} rx={rx} fill={`${bodyColor}12`} />
      {/* Highlight zone */}
      <rect x={hlX} y={trackY} width={hlW} height={trackH} rx={rx} fill={accent} />
      {/* Tick marks */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t}
          x1={trackX + t * trackW} y1={trackY + trackH + 4}
          x2={trackX + t * trackW} y2={trackY + trackH + 18}
          stroke={`${bodyColor}40`} strokeWidth={1.5}
        />
      ))}
      {/* Min / max labels */}
      <text x={trackX} y={trackY + trackH + 44} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="22" fill={secondary}>
        {min}{unit ? ` ${unit}` : ''}
      </text>
      <text x={trackX + trackW} y={trackY + trackH + 44} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="22" fill={secondary}>
        {max}{unit ? ` ${unit}` : ''}
      </text>
      {/* Bracket lines above highlight */}
      <line x1={hlX + 2} y1={trackY - 6} x2={hlX + 2} y2={trackY} stroke={accent} strokeWidth={2} />
      <line x1={hlX + hlW - 2} y1={trackY - 6} x2={hlX + hlW - 2} y2={trackY} stroke={accent} strokeWidth={2} />
      {/* Main label at bottom */}
      <text x={468} y={420} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="24" fontWeight="700"
        letterSpacing="0.1em" fill={bodyColor}>
        {fullLabel}
      </text>
    </svg>
  );
}

export default SpectrumBar;
