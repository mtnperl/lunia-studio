import type { BrandStyle } from '@/lib/types';

interface Props {
  surface?: string[];
  hidden?: string[];
  surfaceLabel?: string;
  hiddenLabel?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS = {
  surface: ['You feel tired'],
  hidden: ['Cortisol too high', 'Adenosine blocked', 'Blue light exposure'],
  surfaceLabel: 'WHAT YOU NOTICE',
  hiddenLabel: 'THE REAL CAUSE',
};

export function IcebergGraphic({
  surface = DEFAULTS.surface,
  hidden = DEFAULTS.hidden,
  surfaceLabel = DEFAULTS.surfaceLabel,
  hiddenLabel = DEFAULTS.hiddenLabel,
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent     ?? '#1e7a8a';
  const bodyColor = brandStyle?.body       ?? '#1a2535';
  const secondary = brandStyle?.secondary  ?? '#6b7280';
  const slideBg   = brandStyle?.background ?? '#f0ece6';

  const sItems = (surface ?? []).slice(0, 3);
  const hItems = (hidden  ?? []).slice(0, 4);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 48px 28px',
      boxSizing: 'border-box',
      gap: 0,
    }}>
      {/* Surface section label */}
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color: secondary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {surfaceLabel}
      </div>

      {/* Surface items */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {sItems.map((item, i) => (
          <div
            key={i}
            style={{
              background: `${accent}14`,
              border: `1.5px solid ${accent}55`,
              borderRadius: 10,
              padding: '10px 22px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 18,
              fontWeight: 600,
              color: accent,
              lineHeight: 1.3,
              wordBreak: 'break-word',
              flex: '1 1 auto',
              textAlign: 'center',
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Waterline divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: 12 }}>
        <div style={{ flex: 1, height: 2, background: accent, opacity: 0.35, borderRadius: 1 }} />
        <div style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 18,
          color: accent,
          opacity: 0.55,
          flexShrink: 0,
          lineHeight: 1,
        }}>
          ▼
        </div>
        <div style={{ flex: 1, height: 2, background: accent, opacity: 0.35, borderRadius: 1 }} />
      </div>

      {/* Hidden section label */}
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color: secondary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        {hiddenLabel}
      </div>

      {/* Hidden items */}
      <div style={{
        background: `${accent}08`,
        borderRadius: 14,
        padding: '16px',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        flex: 1,
      }}>
        {hItems.map((item, i) => (
          <div
            key={i}
            style={{
              background: slideBg,
              border: `2px solid ${accent}`,
              borderRadius: 10,
              padding: '12px 20px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 17,
              fontWeight: 600,
              color: bodyColor,
              flex: '1 1 auto',
              minWidth: 110,
              textAlign: 'center',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default IcebergGraphic;
