import type { BrandStyle } from '@/lib/types';

interface Props {
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  xLabel?: string;
  yLabel?: string;
  brandStyle?: BrandStyle;
}

function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxLen) {
      if (current) lines.push(current.trim());
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 3);
}

export function Matrix2x2({
  topLeft = 'Fast + Effective',
  topRight = 'Fast, Less Effective',
  bottomLeft = 'Slow + Effective',
  bottomRight = 'Avoid',
  xLabel = 'ABSORPTION SPEED →',
  yLabel = 'EFFECTIVENESS →',
  brandStyle,
}: Props) {
  const accent = brandStyle?.accent ?? '#1e7a8a';
  const bodyColor = brandStyle?.body ?? '#4a5568';
  const secondary = brandStyle?.secondary ?? '#a8d4da';

  const cells = [
    { text: topLeft, x: 80, y: 30, highlight: true },
    { text: topRight, x: 480, y: 30, highlight: false },
    { text: bottomLeft, x: 80, y: 240, highlight: false },
    { text: bottomRight, x: 480, y: 240, highlight: false },
  ];
  const cellW = 376, cellH = 190;

  return (
    <svg width={936} height={460} viewBox="0 0 936 460" overflow="visible">
      {/* Axis lines */}
      <line x1={80} y1={430} x2={860} y2={430} stroke={`${bodyColor}30`} strokeWidth={1.5} />
      <line x1={80} y1={30} x2={80} y2={430} stroke={`${bodyColor}30`} strokeWidth={1.5} />
      {/* Axis arrows */}
      <polygon points="860,425 872,430 860,435" fill={`${bodyColor}40`} />
      <polygon points="75,30 80,18 85,30" fill={`${bodyColor}40`} />

      {cells.map((cell, i) => {
        const lines = wrapText(cell.text, 18);
        const textCx = cell.x + cellW / 2;
        const textCy = cell.y + cellH / 2;
        const lineH = 26;
        const totalH = lines.length * lineH;
        return (
          <g key={i}>
            <rect x={cell.x} y={cell.y} width={cellW} height={cellH} rx={8}
              fill={cell.highlight ? `${accent}18` : `${accent}06`}
              stroke={cell.highlight ? accent : `${bodyColor}20`}
              strokeWidth={cell.highlight ? 2 : 1}
            />
            {lines.map((line, li) => (
              <text key={li}
                x={textCx} y={textCy - totalH / 2 + li * lineH + lineH * 0.75}
                textAnchor="middle" fontFamily="Outfit, sans-serif"
                fontSize="21" fontWeight={cell.highlight ? '700' : '600'}
                fill={cell.highlight ? accent : bodyColor}>
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Center crosshair */}
      <line x1={464} y1={30} x2={464} y2={420} stroke={`${bodyColor}20`} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={80} y1={235} x2={856} y2={235} stroke={`${bodyColor}20`} strokeWidth={1} strokeDasharray="4 4" />

      {/* Axis labels */}
      <text x={468} y={450} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="17" letterSpacing="0.08em" fill={secondary}>
        {xLabel}
      </text>
      <text x={20} y={235} textAnchor="middle"
        fontFamily="Outfit, sans-serif" fontSize="17" letterSpacing="0.08em" fill={secondary}
        transform="rotate(-90, 20, 235)">
        {yLabel}
      </text>
    </svg>
  );
}

export default Matrix2x2;
