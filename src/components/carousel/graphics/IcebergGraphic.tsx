import type { BrandStyle } from '@/lib/types';

interface Props {
  surface?: string[];
  hidden?: string[];
  surfaceLabel?: string;
  hiddenLabel?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS = {
  surface: ['You feel tired'],
  hidden: ['Cortisol too high', 'Adenosine blocked', 'Blue light exposure'],
  surfaceLabel: 'WHAT YOU NOTICE',
  hiddenLabel: 'THE REAL CAUSE',
};

export function IcebergGraphic({
  surface = DEFAULTS.surface,
  hidden = DEFAULTS.hidden,
  surfaceLabel = DEFAULTS.surfaceLabel,
  hiddenLabel = DEFAULTS.hiddenLabel,
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg = brandStyle?.background ?? '#f0ece6';

  const W = 936, H = 320;
  const waterlineY = 122;
  const padding = 32;
  const sItems = surface.slice(0, 3);
  const hItems = hidden.slice(0, 4);

  // Surface items — evenly spaced above waterline
  const sBoxW = Math.min(220, (W - padding * 2) / Math.max(sItems.length, 1) - 12);
  const sTotal = sItems.length * sBoxW + (sItems.length - 1) * 12;
  const sStartX = (W - sTotal) / 2;

  // Hidden items — evenly spaced below waterline
  const hBoxW = Math.min(200, (W - padding * 2) / Math.max(hItems.length, 1) - 12);
  const hTotal = hItems.length * hBoxW + (hItems.length - 1) * 12;
  const hStartX = (W - hTotal) / 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {/* Surface label */}
      <text x={W / 2} y={18} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="14" fontWeight="700"
        fill={secondary} letterSpacing="0.1em">
        {(surfaceLabel ?? '').toUpperCase()}
      </text>

      {/* Surface items */}
      {sItems.map((item, i) => {
        const x = sStartX + i * (sBoxW + 12);
        const words = item.split(' ');
        const mid = Math.ceil(words.length / 2);
        const ln1 = words.slice(0, mid).join(' ');
        const ln2 = words.length > 2 ? words.slice(mid).join(' ') : null;
        return (
          <g key={i}>
            <rect x={x} y={30} width={sBoxW} height={68} rx={8}
              fill={`${accent}15`} stroke={`${accent}50`} strokeWidth={1.5} />
            <text x={x + sBoxW / 2} y={ln2 ? 62 : 69} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="17" fontWeight="600" fill={accent}>
              {ln1}
            </text>
            {ln2 && (
              <text x={x + sBoxW / 2} y={84} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="17" fontWeight="600" fill={accent}>
                {ln2}
              </text>
            )}
          </g>
        );
      })}

      {/* Waterline */}
      <line x1={padding} y1={waterlineY} x2={W - padding} y2={waterlineY}
        stroke={accent} strokeWidth={2.5} strokeDasharray="8 5" opacity={0.6} />
      {/* Waterline triangle indicator */}
      <polygon
        points={`${W / 2 - 10},${waterlineY + 1} ${W / 2 + 10},${waterlineY + 1} ${W / 2},${waterlineY + 12}`}
        fill={accent} opacity={0.5}
      />

      {/* Hidden label */}
      <text x={W / 2} y={waterlineY + 28} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="14" fontWeight="700"
        fill={secondary} letterSpacing="0.1em">
        {(hiddenLabel ?? '').toUpperCase()}
      </text>

      {/* Hidden section background */}
      <rect x={padding} y={waterlineY + 36} width={W - padding * 2} height={H - waterlineY - 48}
        rx={8} fill={`${accent}08`} />

      {/* Hidden items */}
      {hItems.map((item, i) => {
        const x = hStartX + i * (hBoxW + 12);
        const y = waterlineY + 46;
        const words = item.split(' ');
        const mid = Math.ceil(words.length / 2);
        const ln1 = words.slice(0, mid).join(' ');
        const ln2 = words.length > 2 ? words.slice(mid).join(' ') : null;
        return (
          <g key={i}>
            <rect x={x} y={y} width={hBoxW} height={70} rx={8}
              fill={bg} stroke={accent} strokeWidth={2} />
            <circle cx={x + hBoxW / 2} cy={y} r={8} fill={accent} />
            <text x={x + hBoxW / 2} y={ln2 ? y + 28 : y + 35} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="600" fill={bodyColor}>
              {ln1}
            </text>
            {ln2 && (
              <text x={x + hBoxW / 2} y={y + 50} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="600" fill={bodyColor}>
                {ln2}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default IcebergGraphic;
