'use client';

import { getIconById } from '@/lib/carousel-icons';
import { BrandStyle } from '@/lib/types';

type LayoutMode = 'row' | 'column' | 'grid' | 'scattered';

type IconEntry = { id: string };

type Props = {
  icons: IconEntry[];
  layout: LayoutMode;
  brandStyle?: BrandStyle;
};

// Scattered positions for 1–4 icons: [x%, y%, size, rotate]
const SCATTERED_CONFIGS: Record<number, Array<{ x: number; y: number; size: number; rotate: number }>> = {
  1: [{ x: 50, y: 50, size: 120, rotate: 0 }],
  2: [
    { x: 28, y: 45, size: 96, rotate: -8 },
    { x: 72, y: 55, size: 96, rotate: 8 },
  ],
  3: [
    { x: 20, y: 38, size: 88, rotate: -10 },
    { x: 50, y: 62, size: 104, rotate: 0 },
    { x: 80, y: 36, size: 88, rotate: 10 },
  ],
  4: [
    { x: 22, y: 32, size: 80, rotate: -12 },
    { x: 72, y: 28, size: 80, rotate: 8 },
    { x: 28, y: 72, size: 80, rotate: 6 },
    { x: 76, y: 72, size: 80, rotate: -8 },
  ],
};

function IconSvg({ id, size, color }: { id: string; size: number; color: string }) {
  const icon = getIconById(id);
  if (!icon) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
}

function IconCell({ id, size, color, textColor }: { id: string; size: number; color: string; textColor: string }) {
  const icon = getIconById(id);
  if (!icon) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <IconSvg id={id} size={size} color={color} />
      <div style={{
        fontFamily: 'Jost, Montserrat, sans-serif',
        fontWeight: 600,
        fontSize: Math.round(size * 0.2),
        color: textColor,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {icon.label}
      </div>
    </div>
  );
}

export function IconLayout({ icons, layout, brandStyle }: Props) {
  const color = brandStyle?.accent ?? '#1e7a8a';
  const textColor = brandStyle?.headline ?? '#1a2535';
  const count = icons.length;

  if (layout === 'row') {
    const iconSize = count <= 2 ? 110 : count === 3 ? 88 : 72;
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: count <= 2 ? 40 : 24,
        padding: '20px 0',
      }}>
        {icons.map((ic) => (
          <IconCell key={ic.id} id={ic.id} size={iconSize} color={color} textColor={textColor} />
        ))}
      </div>
    );
  }

  if (layout === 'column') {
    const iconSize = count <= 2 ? 96 : count === 3 ? 72 : 60;
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: count <= 2 ? 24 : 16,
        padding: '8px 0',
      }}>
        {icons.map((ic) => {
          const icon = getIconById(ic.id);
          return (
            <div key={ic.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <IconSvg id={ic.id} size={iconSize} color={color} />
              <div style={{
                fontFamily: 'Jost, Montserrat, sans-serif',
                fontWeight: 600,
                fontSize: Math.round(iconSize * 0.22),
                color: textColor,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {icon?.label}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (layout === 'grid') {
    const iconSize = 88;
    // 1 icon → center; 2 → row; 3 or 4 → 2×2 grid
    const cols = count <= 2 ? count : 2;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 24,
        padding: '16px 0',
        justifyItems: 'center',
      }}>
        {icons.map((ic) => (
          <IconCell key={ic.id} id={ic.id} size={iconSize} color={color} textColor={textColor} />
        ))}
      </div>
    );
  }

  // scattered — absolutely-positioned within a fixed-height container
  const configs = SCATTERED_CONFIGS[count] ?? SCATTERED_CONFIGS[1];
  return (
    <div style={{ position: 'relative', width: '100%', height: 260, flexShrink: 0 }}>
      {icons.map((ic, i) => {
        const cfg = configs[i];
        const icon = getIconById(ic.id);
        return (
          <div key={ic.id} style={{
            position: 'absolute',
            left: `${cfg.x}%`,
            top: `${cfg.y}%`,
            transform: `translate(-50%, -50%) rotate(${cfg.rotate}deg)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <IconSvg id={ic.id} size={cfg.size} color={color} />
            <div style={{
              fontFamily: 'Jost, Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: Math.round(cfg.size * 0.18),
              color: textColor,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              opacity: 0.85,
            }}>
              {icon?.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
