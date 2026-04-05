'use client';

import { getIconById } from '@/lib/carousel-icons';
import { BrandStyle } from '@/lib/types';

type Props = {
  id: string;
  label?: string;
  brandStyle?: BrandStyle;
};

export function IconGraphic({ id, label, brandStyle }: Props) {
  const icon = getIconById(id);
  if (!icon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[IconGraphic] Unknown icon id: "${id}"`);
    }
    return null;
  }

  const color = brandStyle?.accent ?? '#1e7a8a';
  const textColor = brandStyle?.headline ?? '#1a2535';
  const displayLabel = label ?? icon.label;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: '28px 0',
    }}>
      {/* Icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: 128, height: 128, flexShrink: 0 }}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
      {/* Label */}
      {displayLabel && (
        <div style={{
          fontFamily: 'Jost, Montserrat, sans-serif',
          fontWeight: 600,
          fontSize: 28,
          color: textColor,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}>
          {displayLabel}
        </div>
      )}
    </div>
  );
}
