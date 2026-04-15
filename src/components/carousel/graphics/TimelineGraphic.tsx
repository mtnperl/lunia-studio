import type { BrandStyle } from '@/lib/types';

interface Event {
  time: string;
  label: string;
}

interface Props {
  events?: Event[];
  brandStyle?: BrandStyle;
}

const DEFAULTS: Event[] = [
  { time: '9 PM',     label: 'Dim all lights' },
  { time: '9:30 PM',  label: 'Take Lunia' },
  { time: '10 PM',    label: 'No screens' },
  { time: '10:30 PM', label: 'Wind down & sleep' },
];

export function TimelineGraphic({ events = DEFAULTS, brandStyle }: Props) {
  const accent    = brandStyle?.accent    ?? '#1e7a8a';
  const bodyColor = brandStyle?.body      ?? '#1a2535';
  const secondary = brandStyle?.secondary ?? '#6b7280';

  const list = (events ?? []).slice(0, 6);
  const n = list.length;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 56px',
      boxSizing: 'border-box',
      gap: 0,
    }}>
      {list.map((ev, i) => {
        const isLast = i === n - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: 24, minHeight: 0 }}>
            {/* Track column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 36 }}>
              {/* Node */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: isLast ? accent : `${accent}25`,
                border: `2.5px solid ${isLast ? accent : `${accent}70`}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}>
                {isLast && (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                )}
                {!isLast && (
                  <div style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 14,
                    fontWeight: 700,
                    color: accent,
                  }}>
                    {i + 1}
                  </div>
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div style={{
                  width: 2,
                  flex: 1,
                  minHeight: 16,
                  background: `${accent}30`,
                  marginTop: 0,
                }} />
              )}
            </div>

            {/* Content column */}
            <div style={{
              paddingTop: 6,
              paddingBottom: isLast ? 0 : 24,
              flex: 1,
            }}>
              <div style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 20,
                fontWeight: 700,
                color: isLast ? accent : secondary,
                lineHeight: 1.2,
                letterSpacing: '0.02em',
              }}>
                {ev.time}
              </div>
              <div style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 19,
                color: bodyColor,
                marginTop: 3,
                lineHeight: 1.35,
                wordBreak: 'break-word',
              }}>
                {ev.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TimelineGraphic;
