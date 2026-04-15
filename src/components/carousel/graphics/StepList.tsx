import type { BrandStyle } from '@/lib/types';

interface Props {
  steps?: string[];
  brandStyle?: BrandStyle;
}

export function StepList({
  steps = [
    'Take magnesium glycinate',
    'Dim lights 90 min before bed',
    'Set room to 18-19°C',
    'Avoid screens after 9pm',
  ],
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const headlineColor = brandStyle?.headline ?? '#1a2535';

  return (
    <div style={{
      width: 936,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      fontFamily: 'Outfit, sans-serif',
    }}>
      {steps.map((step, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          paddingTop: 10,
          paddingBottom: 10,
        }}>
          {/* Number circle */}
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
            }}>
              {i + 1}
            </span>
          </div>
          {/* Step text */}
          <span style={{
            fontSize: 32,
            fontWeight: 400,
            color: headlineColor,
            lineHeight: 1.3,
          }}>
            {step}
          </span>
        </div>
      ))}
    </div>
  );
}

export default StepList;
