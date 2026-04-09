import type { BrandStyle } from '@/lib/types';

interface Props {
  levels?: string[];   // top = most important / apex. Max 5 levels.
  brandStyle?: BrandStyle;
}

export function PyramidGraphic({
  levels = ['REM Sleep', 'Deep Sleep (N3)', 'Core Sleep (N2)', 'Light Sleep (N1)'],
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const bodyColor = brandStyle?.body     ?? '#4a5568';

  const w = 936;
  const h = 460;
  const n = Math.min(levels.length, 5);
  const rowH = (h - 40) / n;
  const baseW = w - 60;
  const apexX = w / 2;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {levels.slice(0, n).map((label, i) => {
        // i=0 is apex (narrowest), i=n-1 is base (widest)
        const segW = baseW * ((i + 1) / n);
        const x = (w - segW) / 2;
        const y = 20 + i * rowH;
        const opacity = 1 - (i / n) * 0.55;
        const isApex = i === 0;

        // Trapezoid points
        const nextW = baseW * ((i + 2) / n);
        const nextX = (w - nextW) / 2;
        const points = [
          `${x},${y + rowH}`,
          `${x + segW},${y + rowH}`,
          i < n - 1 ? `${nextX + nextW},${y + rowH}` : `${x + segW},${y + rowH}`,
          i > 0 ? `${x + segW - (segW - baseW * (i / n)) / 1},${y}` : `${apexX},${y}`,
          i > 0 ? `${x + (segW - baseW * (i / n)) / 1},${y}` : `${apexX},${y}`,
        ];
        // Simpler: just use rect with indented sides
        const topW = baseW * (i / n);
        const topX = (w - topW) / 2;

        return (
          <g key={i}>
            <polygon
              points={`${topX},${y} ${topX + topW},${y} ${x + segW},${y + rowH} ${x},${y + rowH}`}
              fill={accent}
              opacity={opacity}
            />
            {/* Divider */}
            {i > 0 && <line x1={x} y1={y} x2={x + segW} y2={y} stroke="white" strokeWidth="2" opacity="0.4" />}
            {/* Label */}
            <text
              x={w / 2} y={y + rowH / 2 + 8}
              textAnchor="middle"
              fontFamily="Outfit, sans-serif"
              fontSize={isApex ? "22" : "24"}
              fontWeight={isApex ? "700" : "500"}
              fill={isApex ? "white" : "white"}
              opacity={isApex ? 1 : 0.92}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default PyramidGraphic;
