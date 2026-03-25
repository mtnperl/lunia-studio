// Lunia Life logo — 8 four-pointed stars in a 2 · 2 · 4 centered pyramid
//
// All rows centered at x=176.
// vGap = 2r = 88 so vertically-stacked tips touch.
//
// Row 1 (top, 2):  cx=[132, 220],          cy=44
// Row 2 (mid, 2):  cx=[132, 220],          cy=132  ← directly below row 1, tips touch
// Row 3 (bot, 4):  cx=[44, 132, 220, 308], cy=220  ← wider base, centered

function sparkle(cx: number, cy: number, r: number): string {
  return [
    `M${cx},${cy - r}`,
    `Q${cx},${cy} ${cx + r},${cy}`,
    `Q${cx},${cy} ${cx},${cy + r}`,
    `Q${cx},${cy} ${cx - r},${cy}`,
    `Q${cx},${cy} ${cx},${cy - r}Z`,
  ].join(' ');
}

interface LuniaLogoProps {
  /** 'light' = white 50% opacity (dark hook/CTA slides).
   *  'dark'  = deep navy 50% opacity (light content slides). */
  variant?: 'light' | 'dark';
  /** Multiplier on the base 100px width. Default 1.0. */
  sizeScale?: number;
}

export default function LuniaLogo({ variant = 'light', sizeScale = 1 }: LuniaLogoProps) {
  const r    = 44;
  const vGap = r * 2;  // 88 — vertically-stacked tips touch (vGap = 2r)

  const y1 = r;             //  44
  const y2 = r + vGap;      // 132
  const y3 = r + vGap * 2;  // 220

  const stars = [
    // Row 1 — 2 stars (top, centered at x=176)
    { cx: 132, cy: y1 },
    { cx: 220, cy: y1 },
    // Row 2 — 2 stars (mid, directly below row 1)
    { cx: 132, cy: y2 },
    { cx: 220, cy: y2 },
    // Row 3 — 4 stars (bottom, wider base, centered at x=176)
    { cx: 44,  cy: y3 },
    { cx: 132, cy: y3 },
    { cx: 220, cy: y3 },
    { cx: 308, cy: y3 },
  ];

  const vbW = 352;  // 308 + r = 352 (right tip fits)
  const vbH = 264;  // y3 + r = 264

  const baseW = 100;
  const w = Math.round(baseW * sizeScale);
  const h = Math.round(w * vbH / vbW);

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ position: 'absolute', bottom: 58, left: 60 }}
    >
      <g fill={variant === 'dark' ? '#0d2137' : 'white'} fillOpacity={0.5}>
        {stars.map((s, i) => (
          <path key={i} d={sparkle(s.cx, s.cy, r)} />
        ))}
      </g>
    </svg>
  );
}
