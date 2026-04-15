import type { BrandStyle } from '@/lib/types';

interface Props {
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  xLabel?: string;
  yLabel?: string;
  brandStyle?: BrandStyle;
}

export function Matrix2x2({
  topLeft = 'Fast + Effective',
  topRight = 'Fast, Less Effective',
  bottomLeft = 'Slow + Effective',
  bottomRight = 'Avoid',
  xLabel = 'ABSORPTION SPEED →',
  yLabel = 'EFFECTIVENESS →',
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const cells = [
    { text: topLeft, highlight: true },
    { text: topRight, highlight: false },
    { text: bottomLeft, highlight: false },
    { text: bottomRight, highlight: false },
  ];

  return (
    <div style={{
      width: '100%',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginLeft: 36,
      }}>
        {cells.map((cell, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            borderRadius: 8,
            background: cell.highlight ? `${accent}18` : `${accent}06`,
            border: cell.highlight ? `2px solid ${accent}` : `1px solid ${bodyColor}20`,
            minHeight: 140,
          }}>
            <span style={{
              fontSize: 21,
              fontWeight: cell.highlight ? 700 : 600,
              color: cell.highlight ? accent : bodyColor,
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {cell.text}
            </span>
          </div>
        ))}
      </div>

      {/* X-axis label */}
      <div style={{
        textAlign: 'center',
        marginLeft: 36,
        fontSize: 17,
        letterSpacing: '0.08em',
        color: secondary,
        marginTop: 4,
      }}>
        {xLabel}
      </div>

      {/* Y-axis label (rotated via writing-mode) */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        transformOrigin: 'center',
        fontSize: 17,
        letterSpacing: '0.08em',
        color: secondary,
        whiteSpace: 'nowrap',
      }}>
        {yLabel}
      </div>
    </div>
  );
}

export default Matrix2x2;
