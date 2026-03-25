import type { BrandStyle } from '@/lib/types';

interface Cell { label: string; value: number }
interface Props {
  cells?: Cell[];
  title?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS: Cell[] = [
  { label: 'Mon', value: 2 }, { label: 'Tue', value: 3 }, { label: 'Wed', value: 1 },
  { label: 'Thu', value: 3 }, { label: 'Fri', value: 2 }, { label: 'Sat', value: 3 },
  { label: 'Sun', value: 3 },
];

export function HeatGrid({ cells = DEFAULTS, title, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(cells.length, 12);
  const list = cells.slice(0, n);

  // Layout: ≤4 cells = 1 row, ≤8 = 2 rows, else 3 rows
  const rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const cols = Math.ceil(n / rows);
  const cellW = Math.min(118, Math.floor(816 / cols));
  const cellH = 72;
  const gap = 10;
  const gridW = cols * cellW + (cols - 1) * gap;
  const gridX = (936 - gridW) / 2;
  const gridY = title ? 52 : 28;

  const cellColor = (v: number) => {
    if (v >= 3) return accent;
    if (v === 2) return `${accent}70`;
    return `${secondary}60`;
  };
  const textColor = (v: number) => v >= 2 ? '#fff' : bodyColor;

  return (
    <svg width={936} height={title ? 300 : 260} viewBox={`0 0 936 ${title ? 300 : 260}`}>
      {title && (
        <text x={468} y={34} textAnchor="middle"
          fontFamily="Outfit, sans-serif" fontSize="22" fontWeight="700"
          letterSpacing="0.1em" fill={bodyColor}>
          {title}
        </text>
      )}
      {list.map((cell, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = gridX + col * (cellW + gap) + cellW / 2;
        const cy = gridY + row * (cellH + gap) + cellH / 2;
        const x = gridX + col * (cellW + gap);
        const y = gridY + row * (cellH + gap);
        const fill = cellColor(cell.value);
        const txtColor = textColor(cell.value);

        return (
          <g key={i}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={8} fill={fill} />
            {/* Label */}
            <text x={cx} y={cy - 6} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="17" fontWeight="700" fill={txtColor}>
              {cell.label}
            </text>
            {/* Dots for intensity */}
            {[...Array(Math.min(cell.value, 3))].map((_, d) => (
              <circle key={d}
                cx={cx - (Math.min(cell.value, 3) - 1) * 7 + d * 14}
                cy={cy + 16} r={4}
                fill={cell.value >= 2 ? 'rgba(255,255,255,0.6)' : `${accent}80`}
              />
            ))}
          </g>
        );
      })}

      {/* Legend */}
      {[
        { label: 'Low', v: 1 }, { label: 'Mid', v: 2 }, { label: 'High', v: 3 }
      ].map((item, i) => (
        <g key={i}>
          <rect x={300 + i * 120} y={gridY + rows * (cellH + gap) + 16}
            width={14} height={14} rx={3} fill={cellColor(item.v)} />
          <text x={320 + i * 120} y={gridY + rows * (cellH + gap) + 28}
            fontFamily="Outfit, sans-serif" fontSize="15" fill={secondary}>
            {item.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default HeatGrid;
