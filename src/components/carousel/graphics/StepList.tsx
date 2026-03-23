import type { BrandStyle } from '@/lib/types';

interface Props {
  steps?: string[];
  brandStyle?: BrandStyle;
}

export function StepList({
  steps = [
    'Take magnesium glycinate',
    'Dim lights 90 min before bed',
    'Set room to 18-19°C',
    'Avoid screens after 9pm',
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const headlineColor = brandStyle?.headline ?? '#1a2535';
  const r = 24;
  const rowH = 70;
  return (
    <svg width={936} height={rowH * steps.length} viewBox={`0 0 936 ${rowH * steps.length}`}>
      {steps.map((step, i) => (
        <g key={i}>
          <circle cx={r} cy={i * rowH + r} r={r} fill={accent} />
          <text x={r} y={i * rowH + r + 9} textAnchor="middle" fontFamily="Outfit" fontSize="26" fontWeight="700" fill="#ffffff">{i + 1}</text>
          <text x={r * 2 + 16} y={i * rowH + r + 9} fontFamily="Outfit" fontSize="28" fill={headlineColor}>{step}</text>
        </g>
      ))}
    </svg>
  );
}

export default StepList;
