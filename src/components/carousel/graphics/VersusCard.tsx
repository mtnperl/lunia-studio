import type { BrandStyle } from '@/lib/types';

interface Side {
  label: string;
  value: string;
  note?: string;
}

interface Props {
  left?: Side;
  right?: Side;
  brandStyle?: BrandStyle;
}

export function VersusCard({
  left = { label: 'Magnesium Oxide', value: '4%', note: 'barely absorbed' },
  right = { label: 'Magnesium Glycinate', value: '85%', note: 'highly bioavailable' },
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body ?? '#4a5568';

  return (
    <div style={{
      width: 936,
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* Left panel — muted */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 20px',
        borderRadius: 16,
        background: `${bodyColor}12`,
        minHeight: 380,
      }}>
        <span style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: bodyColor,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {left.label}
        </span>
        <span style={{
          fontSize: 80,
          fontWeight: 800,
          color: `${bodyColor}55`,
          lineHeight: 1,
        }}>
          {left.value}
        </span>
        {left.note && (
          <span style={{
            fontSize: 19,
            color: bodyColor,
            opacity: 0.6,
            textAlign: 'center',
          }}>
            {left.note}
          </span>
        )}
      </div>

      {/* VS divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: secondary,
        }}>
          VS
        </span>
      </div>

      {/* Right panel — accent */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '32px 20px',
        borderRadius: 16,
        background: `${accent}18`,
        border: `2px solid ${accent}80`,
        minHeight: 380,
      }}>
        <span style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: accent,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {right.label}
        </span>
        <span style={{
          fontSize: 80,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}>
          {right.value}
        </span>
        {right.note && (
          <span style={{
            fontSize: 19,
            color: accent,
            opacity: 0.75,
            textAlign: 'center',
          }}>
            {right.note}
          </span>
        )}
      </div>
    </div>
  );
}

export default VersusCard;
