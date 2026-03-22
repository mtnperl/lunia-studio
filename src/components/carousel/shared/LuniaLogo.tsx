// Lunia sparkle logo — 5 four-pointed stars arranged in a triangle (2 top, 3 bottom)
// White at 50% opacity, positioned bottom-left of every slide

function sparkle(cx: number, cy: number, r: number): string {
  const k = r * 0.16; // control point — lower = pointier/deeper indentation
  return [
    `M${cx},${cy - r}`,
    `Q${cx + k},${cy - k} ${cx + r},${cy}`,
    `Q${cx + k},${cy + k} ${cx},${cy + r}`,
    `Q${cx - k},${cy + k} ${cx - r},${cy}`,
    `Q${cx - k},${cy - k} ${cx},${cy - r}Z`,
  ].join(" ");
}

export default function LuniaLogo() {
  const r = 52;
  const hSpacing = 90;  // horizontal center-to-center
  const vSpacing = 78;  // vertical center-to-center (≈ hSpacing * √3/2 → equilateral)

  // Bottom row: 3 sparkles
  const bx0 = r + 4;
  const by = r + 4 + vSpacing;
  const bottom = [
    { cx: bx0,               cy: by },
    { cx: bx0 + hSpacing,    cy: by },
    { cx: bx0 + hSpacing * 2, cy: by },
  ];

  // Top row: 2 sparkles, offset by hSpacing/2 to sit over the gaps in the bottom row
  const tx0 = bx0 + hSpacing / 2;
  const ty = r + 4;
  const top = [
    { cx: tx0,            cy: ty },
    { cx: tx0 + hSpacing, cy: ty },
  ];

  const allSparkles = [...top, ...bottom];
  const vbW = bx0 + hSpacing * 2 + r + 4;
  const vbH = by + r + 4;

  // Rendered at 120px wide on the full-size 1080px slide
  const displayW = 120;
  const displayH = Math.round((vbH / vbW) * displayW);

  return (
    <svg
      width={displayW}
      height={displayH}
      viewBox={`0 0 ${vbW} ${vbH}`}
      style={{ position: "absolute", bottom: 58, left: 60 }}
    >
      <g fill="white" fillOpacity={0.5}>
        {allSparkles.map((s, i) => (
          <path key={i} d={sparkle(s.cx, s.cy, r)} />
        ))}
      </g>
    </svg>
  );
}
