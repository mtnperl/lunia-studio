import type { BrandStyle } from '@/lib/types';

interface Part {
  label: string;
  percent: number;   // numeric 0–100
  value?: string;    // display label e.g. "96%"
}

interface Props {
  parts?: Part[];
  brandStyle?: BrandStyle;
}

export function SplitBar({
  parts = [
    { label: 'WASTED',   percent: 96, value: '96%' },
    { label: 'ABSORBED', percent: 4,  value: '4%' },
  ],
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body     ?? '#4a5568';

  const w = 936;
  const h = 260;
  const barH = 56;
  const barY = (h - barH) / 2;
  const rx = barH / 2;

  const total = parts.reduce((s, p) => s + p.percent, 0) || 100;
  const fills = [accent, `${secondary}99`, `${bodyColor}40`, `${bodyColor}20`];

  let cursor = 0;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Segments */}
      {parts.map((p, i) => {
        const segW = (p.percent / total) * w;
        const x = cursor;
        cursor += segW;
        return (
          <rect
            key={i} x={x} y={barY}
            width={segW} height={barH}
            rx={i === 0 ? rx : 0}
            style={{ borderRadius: undefined }}
            fill={fills[i] ?? `${bodyColor}30`}
          />
        );
      })}
      {/* Round the last segment's right edge */}
      <rect x={w - rx} y={barY} width={rx} height={barH} rx={0} fill={fills[parts.length - 1] ?? `${bodyColor}30`} />
      <rect x={w - barH} y={barY} width={barH} height={barH} rx={rx} fill={fills[parts.length - 1] ?? `${bodyColor}30`} />

      {/* Labels above / below alternating */}
      {(() => {
        let cur2 = 0;
        return parts.map((p, i) => {
          const segW = (p.percent / total) * w;
          const midX = cur2 + segW / 2;
          cur2 += segW;
          const isAbove = i % 2 === 0;
          const valueY = isAbove ? barY - 18 : barY + barH + 38;
          const labelY = isAbove ? barY - 44 : barY + barH + 64;
          return (
            <g key={i}>
              <text x={midX} y={valueY} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="36" fontWeight="800" fill={i === 0 ? accent : bodyColor}>
                {p.value ?? `${p.percent}%`}
              </text>
              <text x={midX} y={labelY} textAnchor="middle" fontFamily="Outfit, sans-serif" fontSize="19" fontWeight="600" letterSpacing="0.08em" fill={bodyColor} opacity="0.6">
                {p.label}
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
}

export default SplitBar;
