import type { BrandStyle } from '@/lib/types';

interface Props {
  labels?: string[];
  brandStyle?: BrandStyle;
}

export function DotChainGraphic({ labels = ['Before', 'After'], brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const width = 936;
  const r = 24;
  const dots = 5;
  const spacing = (width - r * 2) / (dots - 1);

  const renderChain = (y: number, label: string, hasX = false) => (
    <g key={label}>
      <text x={r} y={y - 36} fontFamily="Outfit" fontSize="30" fontWeight="600"
        fill={bodyColor} fontStyle="italic" textAnchor="start">
        {label}
      </text>
      <line x1={r} y1={y} x2={width - r} y2={y} stroke={accent} strokeWidth="3" />
      {Array.from({ length: dots }).map((_, i) => {
        const cx = r + i * spacing;
        const isLast = i === dots - 1;
        return (
          <g key={i}>
            <circle cx={cx} cy={y} r={r} fill={isLast && hasX ? '#f0ece6' : accent} stroke={accent} strokeWidth="2.5" />
            {isLast && hasX && (
              <>
                <line x1={cx - 12} y1={y - 12} x2={cx + 12} y2={y + 12} stroke="#e05555" strokeWidth="3" />
                <line x1={cx + 12} y1={y - 12} x2={cx - 12} y2={y + 12} stroke="#e05555" strokeWidth="3" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );

  return (
    <svg width={width} height={420} viewBox={`0 0 ${width} 420`}>
      {renderChain(150, labels[0] || 'Scenario A', false)}
      {renderChain(340, labels[1] || 'Scenario B', true)}
    </svg>
  );
}

export default DotChainGraphic;
