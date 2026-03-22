// Lunia sparkle logo — 5 four-pointed stars in a triangle (2 top, 3 bottom)
// Each sparkle uses the star-center as bezier control → very concave, sharp tips
// White at 50% opacity, bottom-left of every slide

function sparkle(cx: number, cy: number, r: number): string {
  // Quadratic bezier control at the star's own center → deep concave sides, sharp tips
  return [
    `M${cx},${cy - r}`,
    `Q${cx},${cy} ${cx + r},${cy}`,
    `Q${cx},${cy} ${cx},${cy + r}`,
    `Q${cx},${cy} ${cx - r},${cy}`,
    `Q${cx},${cy} ${cx},${cy - r}Z`,
  ].join(" ");
}

export default function LuniaLogo() {
  const r = 44;           // outer radius of each sparkle
  const hGap = 88;        // horizontal center-to-center (= 2r → tips just touch)
  const vGap = 76;        // vertical spacing (≈ hGap × √3/2 → equilateral triangle)

  // Bottom row: 3 sparkles
  const by = r + vGap;
  const bottom = [
    { cx: r,          cy: by },
    { cx: r + hGap,   cy: by },
    { cx: r + hGap*2, cy: by },
  ];

  // Top row: 2 sparkles, each centered over the gap between bottom pairs
  const ty = r;
  const top = [
    { cx: r + hGap / 2,       cy: ty },
    { cx: r + hGap / 2 + hGap, cy: ty },
  ];

  const vbW = r * 2 + hGap * 2;   // 264
  const vbH = r + vGap + r;        // 164

  return (
    <svg
      width={110}
      height={Math.round(110 * vbH / vbW)}
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ position: "absolute", bottom: 58, left: 60 }}
    >
      <g fill="white" fillOpacity={0.5}>
        {[...top, ...bottom].map((s, i) => (
          <path key={i} d={sparkle(s.cx, s.cy, r)} />
        ))}
      </g>
    </svg>
  );
}
