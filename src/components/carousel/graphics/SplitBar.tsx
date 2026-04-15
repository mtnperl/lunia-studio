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
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      fontFamily: 'Outfit, sans-serif',
      minHeight: 340,
    }}>
      {/* Bar */}
      <div style={{
        width: '100%',
        height: 64,
        borderRadius: 32,
        background: `${bodyColor}08`,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            width: `${(p.percent / total) * 100}%`,
            height: '100%',
            background: fills[i % fills.length],
            borderRadius: i === 0 ? '32px 0 0 32px' : i === parts.length - 1 ? '0 32px 32px 0' : 0,
          }} />
        ))}
      </div>

      {/* Labels */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-around',
      }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{
              fontSize: 52,
              fontWeight: 800,
              color: i === 0 ? accent : bodyColor,
              lineHeight: 1,
            }}>
              {p.value ?? `${p.percent}%`}
            </span>
            <span style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: bodyColor,
              opacity: 0.6,
            }}>
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SplitBar;
