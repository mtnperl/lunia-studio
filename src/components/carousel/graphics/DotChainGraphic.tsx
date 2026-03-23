import type { BrandStyle } from '@/lib/types';

interface Props {
  labels?: string[];
  brandStyle?: BrandStyle;
}

export function DotChainGraphic({ labels = ['Before', 'After'], brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const width = 936;
  const r = 18;
  const dots = 5;
  const spacing = (width - r * 2) / (dots - 1);

  const renderChain = (y: number, label: string, hasX = false) => (
    <g key={label}>
      <text x={0} y={y - 28} fontFamily="Outfit" fontSize="24" fill={bodyColor} fontStyle="italic">{label}</text>
      <line x1={r} y1={y} x2={width - r} y2={y} stroke={accent} strokeWidth="2" />
      {Array.from({ length: dots }).map((_, i) => {
        const cx = r + i * spacing;
        const isLast = i === dots - 1;
        return (
          <g key={i}>
            <circle cx={cx} cy={y} r={r} fill={isLast && hasX ? '#f0ece6' : accent} stroke={accent} strokeWidth="2" />
            {isLast && hasX && (
              <>
                <line x1={cx - 10} y1={y - 10} x2={cx + 10} y2={y + 10} stroke="#e05555" strokeWidth="2.5" />
                <line x1={cx + 10} y1={y - 10} x2={cx - 10} y2={y + 10} stroke="#e05555" strokeWidth="2.5" />
              </>
            )}
          </g>
        );
      })}
    </g>
  );

  return (
    <svg width={width} height={260} viewBox={`0 0 ${width} 260`}>
      {renderChain(80, labels[0] || 'Scenario A', false)}
      {renderChain(200, labels[1] || 'Scenario B', true)}
    </svg>
  );
}

export default DotChainGraphic;
