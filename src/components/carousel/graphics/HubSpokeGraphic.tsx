import type { BrandStyle } from '@/lib/types';

interface Spoke { label: string }
interface Props {
  center?: string;
  spokes?: Spoke[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Spoke[] = [
  { label: 'Reduces cortisol' },
  { label: 'Improves REM' },
  { label: 'Slows heart rate' },
  { label: 'Lowers temp' },
];

function getAngle(i: number, n: number): number {
  // n=4: start at -60° so no node lands at the bottom-center
  const startDeg = n === 4 ? -60 : -90;
  return (startDeg + (360 / n) * i) * (Math.PI / 180);
}

export function HubSpokeGraphic({ center = 'Magnesium', spokes = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const bg = brandStyle?.background ?? '#f0ece6';

  const n = Math.min(Math.max((spokes ?? []).length, 3), 5);
  const list = (spokes ?? []).slice(0, n);

  const CX = 468, CY = 205, HUB_R = 58, SPOKE_R = 158, NODE_R = 50;

  return (
    <svg width={936} height={400} viewBox="0 0 936 400" overflow="visible">
      {list.map((spoke, i) => {
        const angle = getAngle(i, n);
        const nx = CX + Math.cos(angle) * SPOKE_R;
        const ny = CY + Math.sin(angle) * SPOKE_R;
        // Line starts at hub edge
        const lx = CX + Math.cos(angle) * (HUB_R + 6);
        const ly = CY + Math.sin(angle) * (HUB_R + 6);
        // Line ends at node edge
        const ex = CX + Math.cos(angle) * (SPOKE_R - NODE_R - 4);
        const ey = CY + Math.sin(angle) * (SPOKE_R - NODE_R - 4);

        // Split label into ≤2 lines
        const words = spoke.label.split(' ');
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.length > 2 ? words.slice(mid).join(' ') : null;

        return (
          <g key={i}>
            <line x1={lx} y1={ly} x2={ex} y2={ey} stroke={`${accent}50`} strokeWidth={2} />
            {/* Arrowhead */}
            <polygon
              points={`${nx + Math.cos(angle) * (NODE_R + 2)},${ny + Math.sin(angle) * (NODE_R + 2)} ${nx + Math.cos(angle) * (NODE_R + 8) + Math.sin(angle) * 4},${ny + Math.sin(angle) * (NODE_R + 8) - Math.cos(angle) * 4} ${nx + Math.cos(angle) * (NODE_R + 8) - Math.sin(angle) * 4},${ny + Math.sin(angle) * (NODE_R + 8) + Math.cos(angle) * 4}`}
              fill={`${accent}70`}
            />
            {/* Node */}
            <circle cx={nx} cy={ny} r={NODE_R} fill={bg} stroke={accent} strokeWidth={2} />
            <text x={nx} y={line2 ? ny - 7 : ny + 6} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="600" fill={bodyColor}>
              {line1}
            </text>
            {line2 && (
              <text x={nx} y={ny + 13} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="16" fontWeight="600" fill={bodyColor}>
                {line2}
              </text>
            )}
          </g>
        );
      })}

      {/* Hub glow */}
      <circle cx={CX} cy={CY} r={HUB_R + 10} fill={`${accent}12`} />
      {/* Hub */}
      <circle cx={CX} cy={CY} r={HUB_R} fill={accent} />
      {/* Center label */}
      {(() => {
        const words = center.split(' ');
        const mid = Math.ceil(words.length / 2);
        const lines = words.length > 1 ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')] : [center];
        return lines.map((ln, li) => (
          <text key={li}
            x={CX}
            y={CY + (li - (lines.length - 1) / 2) * 22 + 7}
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
            fontSize={lines.length > 1 ? 17 : 21}
            fontWeight="700"
            fill="#fff">
            {ln}
          </text>
        ));
      })()}
    </svg>
  );
}

export default HubSpokeGraphic;
