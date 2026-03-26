import type { BrandStyle } from '@/lib/types';

interface Tile { icon: string; label: string; body?: string }
interface Props {
  tiles?: Tile[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Tile[] = [
  { icon: '🌙', label: 'Deeper sleep', body: 'More time in slow-wave' },
  { icon: '🧠', label: 'Less cortisol', body: 'Lower stress response' },
  { icon: '⚡', label: 'More energy', body: 'Better ATP production' },
  { icon: '❤️', label: 'Heart health', body: 'Lower resting heart rate' },
];

// Layout configurations per tile count
const LAYOUTS: Record<number, { x: number; y: number; w: number; h: number }[]> = {
  2: [
    { x: 30, y: 20, w: 418, h: 200 },
    { x: 488, y: 20, w: 418, h: 200 },
  ],
  3: [
    { x: 30, y: 20, w: 876, h: 100 },
    { x: 30, y: 132, w: 418, h: 108 },
    { x: 488, y: 132, w: 418, h: 108 },
  ],
  4: [
    { x: 30, y: 20, w: 418, h: 108 },
    { x: 488, y: 20, w: 418, h: 108 },
    { x: 30, y: 140, w: 418, h: 108 },
    { x: 488, y: 140, w: 418, h: 108 },
  ],
};

export function BentoTiles({ tiles = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const bg = brandStyle?.background ?? '#f0ece6';

  const n = Math.min(Math.max((tiles ?? []).length, 2), 4) as 2 | 3 | 4;
  const list = (tiles ?? []).slice(0, n);
  const layout = LAYOUTS[n];
  const W = 936, H = n === 2 ? 240 : 268;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="visible">
      {list.map((tile, i) => {
        const { x, y, w, h } = layout[i];
        const cx = x + w / 2;
        const cy = y + h / 2;
        const isWide = w > 500;
        const hasBody = !!tile.body;

        // For wide tiles (tile 0 in 3-tile layout), horizontal icon+text layout
        if (isWide && n === 3 && i === 0) {
          return (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} rx={10}
                fill={accent} />
              <text x={x + 36} y={y + 38} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="34">
                {tile.icon}
              </text>
              <text x={x + 76} y={y + (hasBody ? 34 : 42)} textAnchor="start"
                fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="700" fill="#fff">
                {tile.label}
              </text>
              {hasBody && (
                <text x={x + 76} y={y + 62} textAnchor="start"
                  fontFamily="Outfit, sans-serif" fontSize="17" fill="rgba(255,255,255,0.75)">
                  {tile.body}
                </text>
              )}
            </g>
          );
        }

        // Standard tile — icon at top, label below
        const iconY = hasBody ? y + h * 0.3 : y + h * 0.38;
        const labelY = hasBody ? y + h * 0.58 : y + h * 0.7;
        const bodyY = y + h * 0.78;
        const isFilled = i === 0 && n !== 3;

        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx={10}
              fill={isFilled ? accent : `${accent}12`}
              stroke={isFilled ? 'none' : accent}
              strokeWidth={1.5}
            />
            <text x={cx} y={iconY + 14} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="28">
              {tile.icon}
            </text>
            <text x={cx} y={labelY} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="700"
              fill={isFilled ? '#fff' : accent}>
              {tile.label}
            </text>
            {hasBody && (
              <text x={cx} y={bodyY} textAnchor="middle"
                fontFamily="Outfit, sans-serif" fontSize="14"
                fill={isFilled ? 'rgba(255,255,255,0.75)' : secondary}>
                {tile.body}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default BentoTiles;
