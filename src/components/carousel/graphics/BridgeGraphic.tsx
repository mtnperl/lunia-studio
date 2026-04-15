import type { BrandStyle } from '@/lib/types';

interface Props {
  from?: string;
  to?: string;
  label?: string;
  brandStyle?: BrandStyle;
}

export function BridgeGraphic({
  from = 'Poor sleep',
  to = 'More cortisol',
  label = 'disrupts recovery',
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';

  return (
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
      fontFamily: 'Outfit, sans-serif',
      position: 'relative',
      minHeight: 320,
      justifyContent: 'center',
    }}>
      {/* Bridge label above the arc */}
      {label && (
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          fontStyle: 'italic',
          color: secondary,
          textAlign: 'center',
          marginBottom: 16,
        }}>
          {label}
        </div>
      )}

      {/* Arc connector (SVG for the curve only) */}
      <div style={{
        width: '100%',
        height: 60,
        position: 'relative',
      }}>
        <svg
          width="100%"
          height="60"
          viewBox="0 0 936 60"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <path
            d="M 168 55 C 268 -20, 668 -20, 768 55"
            fill="none"
            stroke={accent}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            opacity={0.6}
          />
          {/* Arrowhead */}
          <polygon
            points="768,55 758,46 756,58"
            fill={accent}
            opacity={0.8}
          />
        </svg>
      </div>

      {/* Blocks row */}
      <div style={{
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        gap: 80,
        justifyContent: 'center',
      }}>
        {/* From block */}
        <div style={{
          flex: 1,
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: '100%',
            padding: '32px 24px',
            borderRadius: 12,
            background: `${accent}15`,
            border: `2.5px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}>
            <span style={{
              fontSize: 28,
              fontWeight: 700,
              color: accent,
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {from}
            </span>
          </div>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: secondary,
          }}>
            THE PROBLEM
          </span>
        </div>

        {/* To block */}
        <div style={{
          flex: 1,
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: '100%',
            padding: '32px 24px',
            borderRadius: 12,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 120,
          }}>
            <span style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}>
              {to}
            </span>
          </div>
          <span style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: secondary,
          }}>
            THE RESULT
          </span>
        </div>
      </div>
    </div>
  );
}

export default BridgeGraphic;
