import type { BrandStyle } from '@/lib/types';

interface Props {
  labels?: string[];
  brandStyle?: BrandStyle;
}

const DEFAULT_LABELS = ['LIGHT SLEEP', 'DEEP SLEEP', 'REM'];

export function WaveGraphic({ labels, brandStyle }: Props) {
  const zones = labels && labels.length >= 2 ? labels.slice(0, 3) : DEFAULT_LABELS;
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const secondary = brandStyle?.secondary ?? '#a8d4da';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const width = 936;
  const height = 460;

  const generateWave = (amplitude: number, frequency: number, phase: number, opacity: number, color: string) => {
    const points = [];
    for (let x = 0; x <= width; x += 4) {
      const y = height / 2 + amplitude * Math.sin((x / width) * frequency * Math.PI * 2 + phase);
      points.push(`${x},${y}`);
    }
    return (
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity={opacity}
      />
    );
  };

  // Evenly space zone labels across the wave — 2 zones sit at the edges
  // (a clean before/after read), 3 sit at left/center/right like the
  // original fixed sleep-stage layout.
  const zoneX = (i: number) => {
    if (zones.length === 2) return i === 0 ? 12 : width - 12;
    if (i === 0) return 12;
    if (i === zones.length - 1) return width - 12;
    return width / 2;
  };
  const zoneAnchor = (i: number): 'start' | 'middle' | 'end' => {
    if (zones.length === 2) return i === 0 ? 'start' : 'end';
    if (i === 0) return 'start';
    if (i === zones.length - 1) return 'end';
    return 'middle';
  };

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ aspectRatio: `${width} / ${height}` }}>
      {generateWave(60, 2, 0, 0.3, secondary)}
      {generateWave(80, 1.5, 0.5, 0.5, secondary)}
      {generateWave(100, 2.5, 1, 0.9, accent)}
      {zones.map((zone, i) => (
        <text key={i} x={zoneX(i)} y={height - 16} textAnchor={zoneAnchor(i)} fontFamily="Outfit" fontSize="22" fill={bodyColor} fontStyle="italic">{zone}</text>
      ))}
    </svg>
  );
}

export default WaveGraphic;
