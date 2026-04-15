import type { BrandStyle } from '@/lib/types';

interface Props {
  headers?: string[];
  rows?: string[][];
  brandStyle?: BrandStyle;
}

export function ComparisonTable({
  headers = ['', 'Oxide', 'Glycinate'],
  rows = [
    ['Bioavailability', '4%', '85%'],
    ['Effect on sleep', 'None', 'Significant'],
    ['Absorption', 'Poor', 'Superior'],
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const cols = headers.length;

  return (
    <div style={{
      width: 936,
      fontFamily: 'Outfit, sans-serif',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        background: `${accent}18`,
        padding: '14px 0',
      }}>
        {headers.map((hdr, c) => (
          <div key={c} style={{
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: c === 0 ? bodyColor : accent,
            textTransform: 'uppercase',
            padding: '0 12px',
          }}>
            {hdr}
          </div>
        ))}
      </div>

      {/* Data rows */}
      {rows.map((row, r) => (
        <div key={r} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          background: r % 2 === 0 ? `${bodyColor}06` : 'transparent',
          borderBottom: `1px solid ${bodyColor}15`,
          padding: '16px 0',
        }}>
          {row.map((cell, c) => (
            <div key={c} style={{
              textAlign: 'center',
              fontSize: c === 0 ? 22 : 24,
              fontWeight: c === cols - 1 ? 700 : 400,
              color: c === cols - 1 ? accent : bodyColor,
              padding: '0 12px',
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}>
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default ComparisonTable;
