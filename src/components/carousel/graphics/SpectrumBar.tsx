import type { BrandStyle } from '@/lib/types';

interface Props {
  min?: number;
  max?: number;
  from?: number;
  to?: number;
  label?: string;
  unit?: string;
  brandStyle?: BrandStyle;
}

export function SpectrumBar({ min = 0, max = 12, from = 7, to = 9, label = 'OPTIMAL SLEEP RANGE', unit = 'hrs', brandStyle }: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const range = max - min;
  const hlLeftPct = ((from - min) / range) * 100;
  const hlWidthPct = ((to - from) / range) * 100;

  const fullLabel = unit ? `${label} (${unit})` : label;

  return (
    <div style={{
      width: 936,
      height: 460,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif',
      gap: 0,
    }}>
      {/* Highlight range label */}
      <div style={{
        fontSize: 72,
        fontWeight: 800,
        color: accent,
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {from}–{to}
      </div>

      {/* Unit */}
      {unit && (
        <div style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: `${accent}99`,
          marginBottom: 24,
        }}>
          {unit}
        </div>
      )}

      {/* Track */}
      <div style={{
        width: '88%',
        position: 'relative',
      }}>
        {/* Track background */}
        <div style={{
          width: '100%',
          height: 40,
          borderRadius: 20,
          background: `${bodyColor}12`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Highlight zone */}
          <div style={{
            position: 'absolute',
            left: `${hlLeftPct}%`,
            width: `${hlWidthPct}%`,
            height: '100%',
            borderRadius: 20,
            background: accent,
          }} />
        </div>

        {/* Tick marks */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          paddingLeft: 1,
          paddingRight: 1,
        }}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div key={t} style={{
              width: 1.5,
              height: 14,
              background: `${bodyColor}40`,
            }} />
          ))}
        </div>

        {/* Min / max labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
        }}>
          <span style={{ fontSize: 22, color: secondary }}>
            {min}{unit ? ` ${unit}` : ''}
          </span>
          <span style={{ fontSize: 22, color: secondary }}>
            {max}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      </div>

      {/* Main label */}
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: bodyColor,
        textAlign: 'center',
        marginTop: 28,
      }}>
        {fullLabel}
      </div>
    </div>
  );
}

export default SpectrumBar;
