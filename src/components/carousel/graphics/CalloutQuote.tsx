import type { BrandStyle } from '@/lib/types';

interface Props {
  text?: string;
  source?: string;
  brandStyle?: BrandStyle;
}

export function CalloutQuote({
  text   = 'Most people get less deep sleep than they realise — and that is where recovery happens.',
  source,
  brandStyle,
}: Props) {
  const accent    = brandStyle?.accent   ?? '#1e7a8a';
  const bodyColor = brandStyle?.body     ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const w = 936;
  const h = 320;
  const padX = 60;
  const textW = w - padX * 2;

  // Rough word-wrap: split into lines of ~40 chars
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > 42 && current) { lines.push(current); current = word; }
    else current = test;
  }
  if (current) lines.push(current);

  const lineH = 48;
  const blockH = lines.length * lineH;
  const startY = (h - blockH) / 2 + 20;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {/* Decorative left bar */}
      <rect x={0} y={startY - 16} width={6} height={blockH + 32} rx={3} fill={accent} />
      {/* Opening quote mark */}
      <text x={padX - 10} y={startY + 8} fontFamily="Georgia, serif" fontSize="80" fill={`${accent}30`} fontWeight="700">
        "
      </text>
      {/* Text lines */}
      {lines.map((line, i) => (
        <text
          key={i}
          x={padX + 32} y={startY + i * lineH + 36}
          fontFamily="Outfit, sans-serif" fontSize="32" fontWeight="500"
          fill={bodyColor} textAnchor="start"
        >
          {line}
        </text>
      ))}
      {/* Source */}
      {source && (
        <text
          x={padX + 32} y={startY + blockH + 52}
          fontFamily="Outfit, sans-serif" fontSize="19"
          fill={secondary}
        >
          — {source}
        </text>
      )}
    </svg>
  );
}

export default CalloutQuote;
