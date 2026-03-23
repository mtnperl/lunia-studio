import type { BrandStyle } from '@/lib/types';

interface Props {
  headers?: string[];
  rows?: string[][];
  brandStyle?: BrandStyle;
}

export function ComparisonTable({
  headers = ['', 'Oxide', 'Glycinate'],
  rows    = [
    ['Bioavailability', '4%',   '85%'],
    ['Effect on sleep', 'None', 'Significant'],
    ['Absorption',      'Poor', 'Superior'],
  ],
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const bodyColor = brandStyle?.body     ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const w = 936;
  const cols = headers.length;
  const rowH = 58;
  const headH = 52;
  const h = headH + rows.length * rowH + 8;
  const colW = w / cols;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Header row background */}
      <rect x={0} y={0} width={w} height={headH} rx={10} fill={`${accent}18`} />

      {/* Header labels */}
      {headers.map((hdr, c) => (
        <text key={c} x={colW * c + colW / 2} y={headH / 2 + 8}
          textAnchor="middle" fontFamily="Outfit, sans-serif"
          fontSize="22" fontWeight="700" letterSpacing="0.06em"
          fill={c === 0 ? bodyColor : accent}
        >
          {hdr.toUpperCase()}
        </text>
      ))}

      {/* Data rows */}
      {rows.map((row, r) => {
        const y = headH + r * rowH;
        const isEven = r % 2 === 0;
        return (
          <g key={r}>
            {isEven && <rect x={0} y={y} width={w} height={rowH} rx={0} fill={`${bodyColor}06`} />}
            {/* Row bottom border */}
            <line x1={0} y1={y + rowH} x2={w} y2={y + rowH} stroke={`${bodyColor}15`} strokeWidth="1" />
            {row.map((cell, c) => (
              <text key={c}
                x={colW * c + colW / 2} y={y + rowH / 2 + 8}
                textAnchor="middle" fontFamily="Outfit, sans-serif"
                fontSize={c === 0 ? "22" : "24"}
                fontWeight={c === cols - 1 ? "700" : "400"}
                fill={c === cols - 1 ? accent : bodyColor}
              >
                {cell}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default ComparisonTable;
