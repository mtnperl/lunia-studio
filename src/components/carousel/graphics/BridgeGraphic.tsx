import type { BrandStyle } from '@/lib/types';

interface Props {
  from?: string;
  to?: string;
  label?: string;
  brandStyle?: BrandStyle;
}

export function BridgeGraphic({
  from = 'Poor sleep',
  to = 'More cortisol',
  label = 'disrupts recovery',
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg = brandStyle?.background ?? '#f0ece6';

  const W = 936, H = 420;
  const blockW = 300, blockH = 160, blockY = 120;
  const leftX = 60, rightX = W - 60 - blockW;
  const cx = W / 2;

  // Arc path: starts from right edge of left block, arcs up, lands at left edge of right block
  const x1 = leftX + blockW + 8;
  const x2 = rightX - 8;
  const y1 = blockY + blockH / 2;
  const y2 = blockY + blockH / 2;
  const arcCpY = blockY - 90; // control point height

  const arcPath = `M ${x1} ${y1} C ${x1 + 80} ${arcCpY}, ${x2 - 80} ${arcCpY}, ${x2} ${y2}`;

  // Wrap long text
  function wrapText(text: string, maxChars: number): [string, string | null] {
    if (text.length <= maxChars) return [text, null];
    const words = text.split(' ');
    let line1 = '', line2 = '';
    for (const w of words) {
      if ((line1 + ' ' + w).trim().length <= maxChars) line1 = (line1 + ' ' + w).trim();
      else line2 = (line2 + ' ' + w).trim();
    }
    return [line1, line2 || null];
  }

  const [fl1, fl2] = wrapText(from, 18);
  const [tl1, tl2] = wrapText(to, 18);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {/* Left block (from) */}
      <rect x={leftX} y={blockY} width={blockW} height={blockH} rx={12}
        fill={`${accent}15`} stroke={accent} strokeWidth={2.5} />
      <text x={leftX + blockW / 2} y={fl2 ? blockY + 48 : blockY + 60} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="28" fontWeight="700" fill={accent}>
        {fl1}
      </text>
      {fl2 && (
        <text x={leftX + blockW / 2} y={blockY + 80} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="28" fontWeight="700" fill={accent}>
          {fl2}
        </text>
      )}

      {/* Arc */}
      <path d={arcPath} fill="none" stroke={accent} strokeWidth={2.5}
        strokeDasharray="6 4" opacity={0.6} />
      {/* Arrowhead at arc end */}
      <polygon
        points={`${x2 + 2},${y2} ${x2 - 8},${y2 - 7} ${x2 - 6},${y2 + 7}`}
        fill={accent} opacity={0.8}
      />

      {/* Bridge label */}
      {label && (
        <text x={cx} y={arcCpY - 14} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="600"
          fontStyle="italic" fill={secondary}>
          {label}
        </text>
      )}

      {/* Right block (to) */}
      <rect x={rightX} y={blockY} width={blockW} height={blockH} rx={12}
        fill={accent} />
      <text x={rightX + blockW / 2} y={tl2 ? blockY + 48 : blockY + 60} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="28" fontWeight="700" fill="#fff">
        {tl1}
      </text>
      {tl2 && (
        <text x={rightX + blockW / 2} y={blockY + 80} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="28" fontWeight="700" fill="#fff">
          {tl2}
        </text>
      )}

      {/* Bottom labels */}
      <text x={leftX + blockW / 2} y={blockY + blockH + 24} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="15" fontWeight="700"
        fill={secondary} letterSpacing="0.08em">
        THE PROBLEM
      </text>
      <text x={rightX + blockW / 2} y={blockY + blockH + 24} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="15" fontWeight="700"
        fill={secondary} letterSpacing="0.08em">
        THE RESULT
      </text>
    </svg>
  );
}

export default BridgeGraphic;
