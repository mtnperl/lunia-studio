import type { BrandStyle } from '@/lib/types';

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

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'space-evenly',
      alignItems: 'flex-start',
      fontFamily: 'Outfit, sans-serif',
      gap: 12,
    }}>
      {items.map((item, i) => {
        const iconPath = DEFAULT_ICONS[i % DEFAULT_ICONS.length].path;
        return (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}>
            <svg width={104} height={104} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={iconPath} />
            </svg>
            <span style={{
              fontSize: 32,
              color: bodyColor,
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default IconGrid;
