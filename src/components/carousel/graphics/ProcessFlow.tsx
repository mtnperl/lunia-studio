import type { BrandStyle } from '@/lib/types';

interface Props {
  steps?: string[];
  brandStyle?: BrandStyle;
}

const DEFAULTS = ['Magnesium binds', 'GABA activates', 'Brain waves slow', 'Deep sleep begins'];

function wrapStep(text: string): [string, string | null] {
  const words = text.split(' ');
  if (words.length <= 2) return [text, null];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export function ProcessFlow({ steps = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(Math.max(steps.length, 2), 5);
  const list = steps.slice(0, n);
  const W = 936, H = 220;
  const arrowW = 36, boxH = 80;
  const totalArrows = n - 1;
  const boxW = Math.floor((W - 20 - totalArrows * arrowW) / n);
  const cy = 120;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {list.map((step, i) => {
        const boxX = 10 + i * (boxW + arrowW);
        const boxCx = boxX + boxW / 2;
        const [line1, line2] = wrapStep(step);

        return (
          <g key={i}>
            {/* Box */}
            <rect x={boxX} y={cy - boxH / 2} width={boxW} height={boxH} rx={8}
              fill={`${accent}10`} stroke={accent} strokeWidth={2} />
            {/* Step number badge */}
            <circle cx={boxCx} cy={cy - boxH / 2 - 16} r={14} fill={accent} />
            <text x={boxCx} y={cy - boxH / 2 - 16 + 6} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="700" fill="#fff">
              {i + 1}
            </text>
            {/* Step text */}
            <text x={boxCx} y={line2 ? cy - 8 : cy + 7} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize={boxW < 130 ? '15' : '17'}
              fontWeight="600" fill={bodyColor}>
              {line1}
            </text>
            {line2 && (
              <text x={boxCx} y={cy + 12} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize={boxW < 130 ? '15' : '17'}
                fontWeight="600" fill={bodyColor}>
                {line2}
              </text>
            )}
            {/* Arrow to next */}
            {i < n - 1 && (() => {
              const ax1 = boxX + boxW + 4;
              const ax2 = boxX + boxW + arrowW - 4;
              return (
                <g>
                  <line x1={ax1} y1={cy} x2={ax2 - 6} y2={cy}
                    stroke={`${accent}80`} strokeWidth={2} />
                  <polygon points={`${ax2},${cy} ${ax2 - 8},${cy - 5} ${ax2 - 8},${cy + 5}`}
                    fill={accent} opacity={0.7} />
                </g>
              );
            })()}
          </g>
        );
      })}
    </svg>
  );
}

export default ProcessFlow;
