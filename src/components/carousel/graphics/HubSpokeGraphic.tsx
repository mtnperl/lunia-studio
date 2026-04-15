import type { BrandStyle } from '@/lib/types';

interface Spoke { label: string }
interface Props {
  center?: string;
  spokes?: Spoke[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Spoke[] = [
  { label: 'Reduces cortisol' },
  { label: 'Improves REM' },
  { label: 'Lowers heart rate' },
  { label: 'Regulates temp' },
];

export function HubSpokeGraphic({ center = 'Magnesium', spokes = DEFAULTS, brandStyle }: Props) {
  const accent    = brandStyle?.accent    ?? '#1e7a8a';
  const bodyColor = brandStyle?.body      ?? '#1a2535';

  const n = Math.min(Math.max((spokes ?? []).length, 2), 5);
  const list = (spokes ?? []).slice(0, n);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '28px 48px',
      boxSizing: 'border-box',
      gap: 0,
    }}>
      {/* Hub pill */}
      <div style={{
        background: accent,
        borderRadius: 14,
        padding: '14px 40px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        maxWidth: 480,
      }}>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 26,
          fontWeight: 700,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.25,
          wordBreak: 'break-word',
        }}>
          {center}
        </span>
      </div>

      {/* Connector */}
      <div style={{ width: 2, height: 28, background: `${accent}50`, flexShrink: 0 }} />

      {/* Spokes grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        width: '100%',
      }}>
        {list.map((spoke, i) => (
          <div
            key={i}
            style={{
              border: `2px solid ${accent}`,
              borderRadius: 12,
              padding: '12px 22px',
              background: `${accent}10`,
              textAlign: 'center',
              flex: '1 1 auto',
              minWidth: n <= 3 ? 180 : 150,
              maxWidth: n <= 2 ? 380 : 280,
            }}
          >
            <span style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: n <= 3 ? 20 : 17,
              fontWeight: 600,
              color: bodyColor,
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {spoke.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HubSpokeGraphic;
