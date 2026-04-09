import type { BrandStyle } from '@/lib/types';

interface Props {
  items?: string[];
  brandStyle?: BrandStyle;
}

export function ChecklistGraphic({
  items = [
    'Reduces sleep onset by up to 30 minutes',
    'Increases slow-wave deep sleep',
    'Lowers overnight cortisol',
    'No next-day grogginess',
  ],
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const bodyColor = brandStyle?.body     ?? '#4a5568';

  const w = 936;
  const rowH = 108;
  const h = rowH * items.length + 16;
  const circleR = 26;
  const textX = circleR * 2 + 20;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {items.map((item, i) => {
        const cy = i * rowH + rowH / 2 + 8;
        return (
          <g key={i}>
            {/* Check circle */}
            <circle cx={circleR} cy={cy} r={circleR} fill={`${accent}20`} />
            {/* Checkmark path */}
            <polyline
              points={`${circleR - 9},${cy} ${circleR - 2},${cy + 7} ${circleR + 10},${cy - 8}`}
              fill="none" stroke={accent} strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
            />
            {/* Item text */}
            <text
              x={textX} y={cy + 7}
              fontFamily="Outfit, sans-serif" fontSize="30"
              fill={bodyColor}
            >
              {item}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default ChecklistGraphic;
