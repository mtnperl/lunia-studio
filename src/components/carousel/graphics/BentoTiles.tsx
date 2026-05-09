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

export function BentoTiles({ tiles = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';
  const onAccent = brandStyle?.background ?? '#ffffff';

  const n = Math.min(Math.max((tiles ?? []).length, 2), 4) as 2 | 3 | 4;
  const list = (tiles ?? []).slice(0, n);

  // For 3 tiles: first tile spans full width, then 2 below
  // For 2 or 4: simple 2-column grid
  const isThree = n === 3;

  return (
    <div style={{
      width: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {list.map((tile, i) => {
        const isFeatured = (isThree && i === 0) || (!isThree && i === 0);
        const isWide = isThree && i === 0;

        return (
          <div key={i} style={{
            gridColumn: isWide ? '1 / -1' : undefined,
            display: 'flex',
            flexDirection: isWide ? 'row' : 'column',
            alignItems: isWide ? 'center' : 'center',
            justifyContent: isWide ? 'flex-start' : 'center',
            gap: isWide ? 20 : 8,
            padding: isWide ? '24px 32px' : '28px 20px',
            borderRadius: 10,
            background: isFeatured ? accent : `${accent}12`,
            border: isFeatured ? 'none' : `1.5px solid ${accent}`,
            minHeight: isWide ? undefined : 180,
          }}>
            {/* Icon */}
            <span style={{
              fontSize: isWide ? 46 : 42,
              lineHeight: 1,
              flexShrink: 0,
            }}>
              {tile.icon}
            </span>

            {/* Text */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              textAlign: isWide ? 'left' : 'center',
            }}>
              <span style={{
                fontSize: isWide ? 28 : 24,
                fontWeight: 700,
                color: isFeatured ? onAccent : accent,
                lineHeight: 1.2,
              }}>
                {tile.label}
              </span>
              {tile.body && (
                <span style={{
                  fontSize: isWide ? 22 : 18,
                  fontWeight: 400,
                  color: isFeatured ? onAccent : secondary,
                  opacity: isFeatured ? 0.75 : 1,
                  lineHeight: 1.3,
                }}>
                  {tile.body}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BentoTiles;
