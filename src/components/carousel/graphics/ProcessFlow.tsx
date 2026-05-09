import type { BrandStyle } from '@/lib/types';

interface Props {
  steps?: string[];
  brandStyle?: BrandStyle;
}

const DEFAULTS = ['Magnesium binds', 'GABA activates', 'Brain waves slow', 'Deep sleep begins'];

export function ProcessFlow({ steps = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const onAccent = brandStyle?.background ?? '#ffffff';

  const n = Math.min(Math.max(steps.length, 2), 5);
  const list = steps.slice(0, n);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {list.map((step, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {/* Step box */}
          <div style={{
            flex: 1,
            minHeight: 120,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 12px',
            borderRadius: 8,
            background: `${accent}10`,
            border: `2px solid ${accent}`,
            position: 'relative',
          }}>
            {/* Step number badge */}
            <div style={{
              position: 'absolute',
              top: -16,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 20,
                fontWeight: 700,
                color: onAccent,
                lineHeight: 1,
              }}>
                {i + 1}
              </span>
            </div>

            {/* Step text */}
            <span style={{
              fontSize: n > 3 ? 18 : 22,
              fontWeight: 600,
              color: bodyColor,
              textAlign: 'center',
              lineHeight: 1.3,
              marginTop: 8,
              wordBreak: 'break-word',
            }}>
              {step}
            </span>
          </div>

          {/* Arrow */}
          {i < n - 1 && (
            <div style={{
              width: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 24,
                color: `${accent}80`,
                lineHeight: 1,
              }}>
                →
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProcessFlow;
