import type { BrandStyle } from '@/lib/types';

interface Stage { label: string; value?: string; percent?: number }
interface Props {
  stages?: Stage[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Stage[] = [
  { label: 'Magnesium Supplemented', percent: 100 },
  { label: 'Absorbed into Bloodstream', percent: 75 },
  { label: 'Crosses Blood-Brain Barrier', percent: 45 },
  { label: 'Reaches Deep Sleep Stage', percent: 28 },
];

export function FunnelChart({ stages = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(stages.length, 5);
  const list = stages.slice(0, n);
  const W = 936, H = 360;
  const stageH = (H - 20) / n;
  const maxW = 740, minW = maxW * 0.3;
  const cx = W / 2;

  // Compute widths from percent or linear fallback
  const percents = list.map((s, i) => s.percent ?? Math.round(100 - i * (60 / (n - 1))));
  const maxP = Math.max(...percents, 1);
  const widths = percents.map(p => minW + (p / maxP) * (maxW - minW));

  const opacities = [1, 0.82, 0.64, 0.46, 0.32];

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {list.map((stage, i) => {
        const topW = widths[i];
        const botW = i < n - 1 ? widths[i + 1] : widths[i] * 0.75;
        const y = i * stageH + 10;
        const topL = cx - topW / 2, topR = cx + topW / 2;
        const botL = cx - botW / 2, botR = cx + botW / 2;

        const trapPath = `M ${topL} ${y} L ${topR} ${y} L ${botR} ${y + stageH - 4} L ${botL} ${y + stageH - 4} Z`;
        const fill = `${accent}${Math.round(opacities[i] * 255).toString(16).padStart(2, '0')}`;

        return (
          <g key={i}>
            <path d={trapPath} fill={fill} />
            {/* Label */}
            <text x={cx} y={y + stageH / 2 + 6} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="21" fontWeight="700"
              fill={i === 0 ? '#fff' : i === 1 ? '#fff' : bodyColor}>
              {stage.label}
            </text>
            {/* Value on right */}
            {stage.value && (
              <text x={topR + 16} y={y + stageH / 2 + 6}
                fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="700" fill={secondary}>
                {stage.value}
              </text>
            )}
            {/* Percent on right if no value */}
            {!stage.value && (
              <text x={topR + 16} y={y + stageH / 2 + 6}
                fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="700" fill={secondary}>
                {percents[i]}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default FunnelChart;
