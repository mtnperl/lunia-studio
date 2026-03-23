import type { BrandStyle } from '@/lib/types';

interface Event {
  time: string;
  label: string;
}

interface Props {
  events?: Event[];
  brandStyle?: BrandStyle;
}

export function TimelineGraphic({
  events = [
    { time: '9 PM',    label: 'Dim all lights' },
    { time: '9:30 PM', label: 'Take Lunia' },
    { time: '10 PM',   label: 'No screens' },
    { time: '10:30 PM', label: 'Asleep' },
  ],
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body     ?? '#4a5568';

  const w = 936;
  const h = 300;
  const n = events.length;
  const nodeY = h / 2;
  const padX = 60;
  const spacing = (w - padX * 2) / (n - 1 || 1);
  const nodeR = 18;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Track line */}
      <line
        x1={padX} y1={nodeY}
        x2={padX + spacing * (n - 1)} y2={nodeY}
        stroke={`${bodyColor}25`} strokeWidth="3"
      />

      {events.map((ev, i) => {
        const x = padX + i * spacing;
        const isLast = i === n - 1;
        const labelY = i % 2 === 0 ? nodeY - 44 : nodeY + 58;
        const timeY  = i % 2 === 0 ? nodeY - 68 : nodeY + 82;

        return (
          <g key={i}>
            {/* Connector tick */}
            <line
              x1={x} y1={nodeY - nodeR}
              x2={x} y2={i % 2 === 0 ? nodeY - 44 : nodeY + 44}
              stroke={isLast ? accent : `${secondary}80`} strokeWidth="2"
            />
            {/* Node circle */}
            <circle cx={x} cy={nodeY} r={nodeR} fill={isLast ? accent : `${secondary}60`} />
            {isLast && (
              <circle cx={x} cy={nodeY} r={nodeR - 6} fill={accent} />
            )}
            {/* Time label */}
            <text
              x={x} y={timeY} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="19" fontWeight="700"
              fill={isLast ? accent : secondary}
              letterSpacing="0.04em"
            >
              {ev.time}
            </text>
            {/* Event label */}
            <text
              x={x} y={labelY} textAnchor="middle"
              fontFamily="Outfit, sans-serif" fontSize="20"
              fill={isLast ? accent : bodyColor}
            >
              {ev.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default TimelineGraphic;
