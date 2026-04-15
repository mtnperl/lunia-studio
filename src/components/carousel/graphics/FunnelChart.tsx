import type { BrandStyle } from '@/lib/types';

interface Stage { label: string; value?: string; percent?: number }
interface Props {
  stages?: Stage[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Stage[] = [
  { label: 'Magnesium Supplemented', percent: 100 },
  { label: 'Absorbed into Bloodstream', percent: 75 },
  { label: 'Crosses Blood-Brain Barrier', percent: 45 },
  { label: 'Reaches Deep Sleep Stage', percent: 28 },
];

export function FunnelChart({ stages = DEFAULTS, brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const n = Math.min(stages.length, 5);
  const list = stages.slice(0, n);

  // Compute widths from percent or linear fallback
  const percents = list.map((s, i) => s.percent ?? Math.round(100 - i * (60 / (n - 1))));
  const maxP = Math.max(...percents, 1);
  const widths = percents.map(p => Math.max(30, Math.round((p / maxP) * 100)));

  const opacities = [1, 0.82, 0.64, 0.46, 0.32];

  return (
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {list.map((stage, i) => {
        const widthPct = widths[i];
        const opacity = opacities[i] ?? 0.32;
        const isLight = opacity >= 0.6;

        return (
          <div key={i} style={{
            width: `${widthPct}%`,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: '16px 24px',
            borderRadius: 8,
            background: accent,
            opacity,
            position: 'relative',
          }}>
            {/* Label */}
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: isLight ? '#fff' : bodyColor,
              textAlign: 'center',
              lineHeight: 1.2,
            }}>
              {stage.label}
            </span>
            {/* Value or percent on the right */}
            {(stage.value || percents[i]) && (
              <span style={{
                position: 'absolute',
                right: -80,
                fontSize: 22,
                fontWeight: 700,
                color: secondary,
                whiteSpace: 'nowrap',
                opacity: 1 / opacity, // counteract parent opacity
              }}>
                {stage.value ?? `${percents[i]}%`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default FunnelChart;
