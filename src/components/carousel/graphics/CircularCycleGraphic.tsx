import type { BrandStyle } from '@/lib/types';

interface Step { label: string }
interface Props {
  steps?: Step[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Step[] = [
  { label: 'Light exposure' },
  { label: 'Cortisol rises' },
  { label: 'Adenosine builds' },
  { label: 'Deep sleep' },
];

export function CircularCycleGraphic({ steps = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg = brandStyle?.background ?? '#f0ece6';

  const n = Math.min(Math.max((steps ?? []).length, 3), 5);
  const list = (steps ?? []).slice(0, n);

  const CX = 468, CY = 230;
  const RING_R = 165;   // distance from center to node center
  const NODE_R = 58;
  const W = 936, H = 460;

  const startAngle = -Math.PI / 2; // start at top
  const angleStep = (2 * Math.PI) / n;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" overflow="visible" style={{ aspectRatio: `${W} / ${H}` }}>
      {/* Dashed orbit ring */}
      <circle cx={CX} cy={CY} r={RING_R} fill="none"
        stroke={`${accent}25`} strokeWidth={2} strokeDasharray="6 6" />

      {list.map((step, i) => {
        const angle = startAngle + i * angleStep;
        const nx = CX + Math.cos(angle) * RING_R;
        const ny = CY + Math.sin(angle) * RING_R;

        // Arrow: from this node's edge toward next node
        const nextAngle = startAngle + (i + 1) * angleStep;
        // Midpoint angle between this and next node
        const midAngle = angle + angleStep * 0.5;
        // Arrow sits on the ring, slightly past midpoint toward next node
        const arrowAngle = angle + angleStep * 0.55;
        const ax = CX + Math.cos(arrowAngle) * RING_R;
        const ay = CY + Math.sin(arrowAngle) * RING_R;
        // Tangent direction at arrowAngle (perpendicular to radius, clockwise)
        const tx = -Math.sin(arrowAngle);
        const ty = Math.cos(arrowAngle);

        const words = step.label.split(' ');
        const mid = Math.ceil(words.length / 2);
        const ln1 = words.slice(0, mid).join(' ');
        const ln2 = words.length > 2 ? words.slice(mid).join(' ') : null;

        return (
          <g key={i}>
            {/* Arrowhead on ring */}
            <polygon
              points={`${ax + tx * 7},${ay + ty * 7} ${ax - tx * 7},${ay - ty * 7} ${ax + tx * 2 + Math.cos(arrowAngle) * 10},${ay + ty * 2 + Math.sin(arrowAngle) * 10}`}
              fill={accent} opacity={0.55}
            />
            {/* Node circle */}
            <circle cx={nx} cy={ny} r={NODE_R} fill={bg} stroke={accent} strokeWidth={2.5} />
            {/* Step number */}
            <circle cx={nx + NODE_R * 0.6} cy={ny - NODE_R * 0.6} r={12} fill={accent} />
            <text x={nx + NODE_R * 0.6} y={ny - NODE_R * 0.6 + 5} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="700" fill="#fff">
              {i + 1}
            </text>
            {/* Label */}
            <text x={nx} y={ln2 ? ny - 7 : ny + 6} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="15" fontWeight="600" fill={bodyColor}>
              {ln1}
            </text>
            {ln2 && (
              <text x={nx} y={ny + 12} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="15" fontWeight="600" fill={bodyColor}>
                {ln2}
              </text>
            )}
          </g>
        );
      })}

      {/* Center "cycle" label */}
      <circle cx={CX} cy={CY} r={46} fill={`${accent}12`} stroke={`${accent}30`} strokeWidth={1.5} />
      <text x={CX} y={CY - 7} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="700"
        fill={accent} letterSpacing="0.06em">
        THE
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="13" fontWeight="700"
        fill={accent} letterSpacing="0.06em">
        CYCLE
      </text>
    </svg>
  );
}

export default CircularCycleGraphic;
