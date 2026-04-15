import type { BrandStyle } from '@/lib/types';

interface Props {
  labels?: string[];
  brandStyle?: BrandStyle;
}

export function DotChainGraphic({ labels = ['Before', 'After'], brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';

  const dots = 5;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 40,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {labels.slice(0, 2).map((label, idx) => {
        const hasX = idx === 1;
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Label */}
            <span style={{
              fontSize: 30,
              fontWeight: 600,
              fontStyle: 'italic',
              color: bodyColor,
            }}>
              {label}
            </span>
            {/* Dot chain */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              position: 'relative',
            }}>
              {/* Connecting line */}
              <div style={{
                position: 'absolute',
                left: 24,
                right: 24,
                top: '50%',
                height: 3,
                background: accent,
                transform: 'translateY(-50%)',
              }} />
              {/* Dots */}
              {Array.from({ length: dots }).map((_, i) => {
                const isLast = i === dots - 1;
                return (
                  <div key={i} style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: isLast && hasX ? '#f0ece6' : accent,
                      border: `2.5px solid ${accent}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isLast && hasX && (
                        <span style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: '#e05555',
                          lineHeight: 1,
                        }}>
                          ✕
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DotChainGraphic;
