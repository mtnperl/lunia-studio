import type { BrandStyle } from '@/lib/types';

// Default icon paths — generic but recognizable for sleep/wellness
const DEFAULT_ICONS = [
  { path: 'M20 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c.34 0 .67.02 1 .05A6 6 0 0020 12z' },
  { path: 'M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3' },
  { path: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4' },
  { path: 'M12 22V12M12 12C12 6.48 7.52 2 2 2M12 12c0-5.52 4.48-10 10-10' },
];

interface Props {
  items?: { label: string }[];
  brandStyle?: BrandStyle;
}

export function IconGrid({
  items = [
    { label: 'Sleep' },
    { label: 'Rest' },
    { label: 'Recovery' },
    { label: 'Balance' },
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const cols = items.length;
  const cellW = 936 / cols;

  return (
    <svg width={936} height={420} viewBox="0 0 936 420">
      {items.map((item, i) => {
        const iconPath = DEFAULT_ICONS[i % DEFAULT_ICONS.length].path;
        const x = i * cellW + cellW / 2;
        return (
          <g key={i}>
            <svg x={x - 52} y={30} width={104} height={104} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPath} />
            </svg>
            <text x={x} y={200} textAnchor="middle" fontFamily="Outfit" fontSize="32" fill={bodyColor}>{item.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default IconGrid;
