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
  const onAccent = brandStyle?.background ?? '#ffffff';

  const n = Math.min(stages.length, 5);
  const list = stages.slice(0, n);

  const percents = list.map((s, i) => s.percent ?? Math.round(100 - i * (60 / (n - 1))));
  const maxP = Math.max(...percents, 1);
  const widths = percents.map(p => Math.max(34, Math.round((p / maxP) * 100)));

  // Gentle fade only — deeper stages stay legible (was fading to 0.32).
  const opacities = [1, 0.9, 0.8, 0.7, 0.62];

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {list.map((stage, i) => (
        <div key={i} style={{
          width: `${widths[i]}%`,
          minWidth: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          padding: '18px 30px',
          borderRadius: 10,
          background: accent,
          opacity: opacities[i] ?? 0.6,
        }}>
          <span style={{ fontSize: 23, fontWeight: 600, color: onAccent, lineHeight: 1.15 }}>
            {stage.label}
          </span>
          {(stage.value || percents[i]) && (
            <span style={{ fontSize: 32, fontWeight: 700, color: onAccent, whiteSpace: 'nowrap', letterSpacing: '-0.01em', flexShrink: 0 }}>
              {stage.value ?? `${percents[i]}%`}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default FunnelChart;
