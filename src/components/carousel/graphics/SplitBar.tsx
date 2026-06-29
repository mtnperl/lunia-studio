import type { BrandStyle } from '@/lib/types';

interface Part {
  label: string;
  percent: number;
  value?: string;
}

interface Props {
  parts?: Part[];
  brandStyle?: BrandStyle;
}

export function SplitBar({
  parts = [
    { label: 'WASTED', percent: 96, value: '96%' },
    { label: 'ABSORBED', percent: 4, value: '4%' },
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body ?? '#4a5568';

  const total = parts.reduce((s, p) => s + p.percent, 0) || 100;
  const fills = [accent, `${secondary}99`, `${bodyColor}40`, `${bodyColor}20`];

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 30,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {/* Hero numbers */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around' }}>
        {parts.map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 0.85, letterSpacing: '-0.02em', color: i === 0 ? accent : bodyColor }}>
              {p.value ?? `${p.percent}%`}
            </span>
            <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: bodyColor, opacity: 0.6 }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Thin split bar */}
      <div style={{
        width: '100%',
        height: 18,
        borderRadius: 9,
        background: `${bodyColor}10`,
        display: 'flex',
        overflow: 'hidden',
        gap: 3,
      }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            width: `${(p.percent / total) * 100}%`,
            height: '100%',
            background: fills[i % fills.length],
            borderRadius: 9,
          }} />
        ))}
      </div>
    </div>
  );
}

export default SplitBar;
