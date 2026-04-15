import type { BrandStyle } from '@/lib/types';

interface Segment { label: string; percent: number; value?: string }
interface Props {
  segments?: Segment[];
  title?: string;
  brandStyle?: BrandStyle;
}

const DEFAULTS: Segment[] = [
  { label: 'LIGHT SLEEP', percent: 55, value: '4 hrs' },
  { label: 'DEEP SLEEP', percent: 22, value: '1.5 hrs' },
  { label: 'REM SLEEP', percent: 23, value: '1.5 hrs' },
];

export function StackedBar({ segments = DEFAULTS, title, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const colors = [`${accent}50`, accent, `${accent}CC`, secondary];
  const total = segments.reduce((s, seg) => s + seg.percent, 0);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {title && (
        <span style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: bodyColor,
        }}>
          {title}
        </span>
      )}

      {/* Labels above bar */}
      <div style={{
        width: '88%',
        display: 'flex',
      }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            width: `${(seg.percent / total) * 100}%`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: bodyColor,
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {seg.label}
            </span>
          </div>
        ))}
      </div>

      {/* Bar */}
      <div style={{
        width: '88%',
        height: 68,
        borderRadius: 34,
        background: `${bodyColor}08`,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            width: `${(seg.percent / total) * 100}%`,
            height: '100%',
            background: colors[i % colors.length],
          }} />
        ))}
      </div>

      {/* Values below bar */}
      <div style={{
        width: '88%',
        display: 'flex',
      }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            width: `${(seg.percent / total) * 100}%`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{
              fontSize: 34,
              fontWeight: 800,
              color: accent,
              lineHeight: 1,
            }}>
              {seg.percent}%
            </span>
            {seg.value && (
              <span style={{
                fontSize: 20,
                color: secondary,
                textAlign: 'center',
              }}>
                {seg.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StackedBar;
