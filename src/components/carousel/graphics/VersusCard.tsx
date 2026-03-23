import type { BrandStyle } from '@/lib/types';

interface Side {
  label: string;
  value: string;
  note?: string;
}

interface Props {
  left?: Side;
  right?: Side;
  brandStyle?: BrandStyle;
}

export function VersusCard({
  left  = { label: 'Magnesium Oxide',    value: '4%',  note: 'barely absorbed' },
  right = { label: 'Magnesium Glycinate', value: '85%', note: 'highly bioavailable' },
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body     ?? '#4a5568';

  const w = 936;
  const h = 300;
  const panelW = 400;
  const panelH = 260;
  const gap = w - panelW * 2;
  const leftX = 0;
  const rightX = panelW + gap;
  const ry = 16;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Left panel — muted / bad */}
      <rect x={leftX} y={20} width={panelW} height={panelH} rx={ry} fill={`${bodyColor}12`} />
      <text x={leftX + panelW / 2} y={76} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="22" fill={bodyColor} fontWeight="600" letterSpacing="0.05em">
        {left.label.toUpperCase()}
      </text>
      <text x={leftX + panelW / 2} y={172} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="80" fontWeight="800" fill={`${bodyColor}55`}>
        {left.value}
      </text>
      {left.note && (
        <text x={leftX + panelW / 2} y={232} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="19" fill={bodyColor} opacity="0.6">
          {left.note}
        </text>
      )}

      {/* VS divider */}
      <text x={w / 2} y={h / 2 + 10} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="700" fill={secondary} letterSpacing="0.12em">
        VS
      </text>

      {/* Right panel — good / accent */}
      <rect x={rightX} y={20} width={panelW} height={panelH} rx={ry} fill={`${accent}18`} />
      <rect x={rightX} y={20} width={panelW} height={panelH} rx={ry} fill="none" stroke={accent} strokeWidth="2" opacity="0.5" />
      <text x={rightX + panelW / 2} y={76} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="22" fill={accent} fontWeight="600" letterSpacing="0.05em">
        {right.label.toUpperCase()}
      </text>
      <text x={rightX + panelW / 2} y={172} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="80" fontWeight="800" fill={accent}>
        {right.value}
      </text>
      {right.note && (
        <text x={rightX + panelW / 2} y={232} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="19" fill={accent} opacity="0.75">
          {right.note}
        </text>
      )}
    </svg>
  );
}

export default VersusCard;
