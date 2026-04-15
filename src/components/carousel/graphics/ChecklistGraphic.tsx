import type { BrandStyle } from '@/lib/types';

interface Props {
  items?: string[];
  brandStyle?: BrandStyle;
}

export function ChecklistGraphic({
  items = [
    'Reduces sleep onset by up to 30 minutes',
    'Increases slow-wave deep sleep',
    'Lowers overnight cortisol',
    'No next-day grogginess',
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          paddingTop: 12,
          paddingBottom: 12,
        }}>
          {/* Check circle */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `${accent}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {/* Checkmark SVG */}
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <polyline
                points="4,12 10,18 20,6"
                stroke={accent}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* Item text */}
          <span style={{
            fontSize: items.length > 4 ? 24 : 30,
            fontWeight: 400,
            color: bodyColor,
            lineHeight: 1.4,
          }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

export default ChecklistGraphic;
