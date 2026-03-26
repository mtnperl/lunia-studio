import type { BrandStyle } from '@/lib/types';

interface Node { label: string; sublabel?: string }
interface Props {
  nodes?: Node[];
  title?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS: Node[] = [
  { label: 'Blue light', sublabel: 'suppresses melatonin' },
  { label: 'Cortisol spikes', sublabel: 'delays sleep onset' },
  { label: 'Less REM', sublabel: 'poor memory consolidation' },
  { label: 'More stress', sublabel: 'cycle repeats' },
];

export function ConceptFlowGraphic({ nodes = DEFAULTS, title, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg = brandStyle?.background ?? '#f0ece6';

  const n = Math.min(Math.max((nodes ?? []).length, 3), 5);
  const list = (nodes ?? []).slice(0, n);

  const W = 936, H = title ? 240 : 210;
  const arrowW = 32;
  const nodeH = 80;
  const topY = title ? 48 : 26;
  const totalArrowW = (n - 1) * arrowW;
  const nodeW = Math.floor((W - 32 - totalArrowW) / n);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {title && (
        <text x={W / 2} y={22} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="700"
          fill={secondary} letterSpacing="0.08em">
          {title.toUpperCase()}
        </text>
      )}

      {list.map((node, i) => {
        const x = 16 + i * (nodeW + arrowW);
        const cx = x + nodeW / 2;
        const nodeY = topY;
        const sublabelY = nodeY + nodeH + 20;

        return (
          <g key={i}>
            {/* Node pill */}
            <rect x={x} y={nodeY} width={nodeW} height={nodeH} rx={nodeH / 2}
              fill={i === 0 ? accent : `${accent}14`}
              stroke={i === 0 ? 'none' : accent}
              strokeWidth={2}
            />
            {/* Label */}
            {(() => {
              const words = node.label.split(' ');
              const mid = Math.ceil(words.length / 2);
              const ln1 = words.slice(0, mid).join(' ');
              const ln2 = words.length > 2 ? words.slice(mid).join(' ') : null;
              return (
                <>
                  <text x={cx} y={ln2 ? nodeY + 30 : nodeY + 39} textAnchor="middle"
                    fontFamily="Outfit, sans-serif"
                    fontSize={nodeW < 130 ? 15 : 18}
                    fontWeight="700"
                    fill={i === 0 ? '#fff' : accent}>
                    {ln1}
                  </text>
                  {ln2 && (
                    <text x={cx} y={nodeY + 52} textAnchor="middle"
                      fontFamily="Outfit, sans-serif"
                      fontSize={nodeW < 130 ? 15 : 18}
                      fontWeight="700"
                      fill={i === 0 ? '#fff' : accent}>
                      {ln2}
                    </text>
                  )}
                </>
              );
            })()}

            {/* Sublabel below node */}
            {node.sublabel && (() => {
              const words = node.sublabel.split(' ');
              const mid = Math.ceil(words.length / 2);
              const sl1 = words.slice(0, mid).join(' ');
              const sl2 = words.length > 2 ? words.slice(mid).join(' ') : null;
              return (
                <>
                  <text x={cx} y={sublabelY} textAnchor="middle"
                    fontFamily="Outfit, sans-serif" fontSize="14"
                    fontStyle="italic" fill={secondary}>
                    {sl1}
                  </text>
                  {sl2 && (
                    <text x={cx} y={sublabelY + 18} textAnchor="middle"
                      fontFamily="Outfit, sans-serif" fontSize="14"
                      fontStyle="italic" fill={secondary}>
                      {sl2}
                    </text>
                  )}
                </>
              );
            })()}

            {/* Arrow to next */}
            {i < n - 1 && (() => {
              const ax1 = x + nodeW + 3;
              const ax2 = x + nodeW + arrowW - 3;
              const ay = nodeY + nodeH / 2;
              return (
                <g>
                  <line x1={ax1} y1={ay} x2={ax2 - 6} y2={ay}
                    stroke={`${accent}70`} strokeWidth={2} />
                  <polygon
                    points={`${ax2},${ay} ${ax2 - 8},${ay - 5} ${ax2 - 8},${ay + 5}`}
                    fill={accent} opacity={0.8}
                  />
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

export default ConceptFlowGraphic;
