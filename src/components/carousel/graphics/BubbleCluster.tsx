import type { BrandStyle } from '@/lib/types';

interface Bubble { label: string; size?: 1 | 2 | 3; sublabel?: string }
interface Props {
  items?: Bubble[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Bubble[] = [
  { label: 'Magnesium', size: 3 },
  { label: 'L-Theanine', size: 2 },
  { label: 'GABA', size: 1 },
];

// Pre-computed non-overlapping positions [cx, cy] for 2–5 bubbles
const POSITIONS: Record<number, [number, number][]> = {
  2: [[248, 165], [688, 165]],
  3: [[168, 168], [468, 155], [770, 168]],
  4: [[118, 165], [356, 148], [580, 165], [818, 148]],
  5: [[90, 165], [272, 150], [468, 162], [664, 150], [846, 165]],
};

const RADII: Record<number, Record<1|2|3, number>> = {
  2: { 1: 64, 2: 88, 3: 112 },
  3: { 1: 52, 2: 72, 3: 96 },
  4: { 1: 44, 2: 60, 3: 80 },
  5: { 1: 38, 2: 52, 3: 68 },
};

export function BubbleCluster({ items = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(Math.max(items.length, 2), 5) as 2|3|4|5;
  const list = items.slice(0, n);
  const pos = POSITIONS[n];
  const radMap = RADII[n];

  return (
    <svg width={936} height={340} viewBox="0 0 936 340">
      {list.map((item, i) => {
        const [cx, cy] = pos[i];
        const size = (item.size ?? 2) as 1|2|3;
        const r = radMap[size];
        const fontSize = r > 80 ? 22 : r > 56 ? 18 : 15;

        return (
          <g key={i}>
            {/* Glow */}
            <circle cx={cx} cy={cy} r={r + 8} fill={`${accent}08`} />
            {/* Ring */}
            <circle cx={cx} cy={cy} r={r} fill={`${accent}12`} stroke={accent} strokeWidth={2.5} />
            {/* Primary label */}
            <text x={cx} y={item.sublabel ? cy - 6 : cy + fontSize / 3}
              textAnchor="middle" fontFamily="Outfit, sans-serif"
              fontSize={fontSize} fontWeight="700" fill={accent}>
              {item.label}
            </text>
            {item.sublabel && (
              <text x={cx} y={cy + fontSize / 3 + 18}
                textAnchor="middle" fontFamily="Outfit, sans-serif"
                fontSize={Math.max(fontSize - 4, 12)} fill={secondary}>
                {item.sublabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default BubbleCluster;
