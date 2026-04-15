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

  const rows = n <= 4 ? 1 : n <= 8 ? 2 : 3;
  const cols = Math.ceil(n / rows);

  const cellColor = (v: number) => {
    if (v >= 3) return accent;
    if (v === 2) return `${accent}70`;
    return `${secondary}60`;
  };
  const textColor = (v: number) => v >= 2 ? '#fff' : bodyColor;

  return (
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {title && (
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: bodyColor,
        }}>
          {title}
        </span>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
        width: '90%',
      }}>
        {list.map((cell, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '16px 8px',
            borderRadius: 8,
            background: cellColor(cell.value),
            minHeight: 90,
          }}>
            <span style={{
              fontSize: 22,
              fontWeight: 700,
              color: textColor(cell.value),
              lineHeight: 1,
            }}>
              {cell.label}
            </span>
            {/* Dots for intensity */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[...Array(Math.min(cell.value, 3))].map((_, d) => (
                <div key={d} style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: cell.value >= 2 ? 'rgba(255,255,255,0.6)' : `${accent}80`,
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 24,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Low', v: 1 },
          { label: 'Mid', v: 2 },
          { label: 'High', v: 3 },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: cellColor(item.v),
            }} />
            <span style={{ fontSize: 15, color: secondary }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeatGrid;
