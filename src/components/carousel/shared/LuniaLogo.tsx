export default function LuniaLogo() {
  const color = "#5a7a8a";
  const size = 10;
  const gap = 10;
  const positions = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      positions.push({ x: col * (size + gap), y: row * (size + gap) });
    }
  }
  const total = 3 * size + 2 * gap;
  return (
    <svg
      width={total}
      height={total}
      viewBox={`0 0 ${total} ${total}`}
      style={{ position: "absolute", bottom: 60, left: 60 }}
    >
      {positions.map((p, i) => (
        <rect
          key={i}
          x={p.x + size / 2}
          y={p.y}
          width={size / Math.sqrt(2)}
          height={size / Math.sqrt(2)}
          transform={`rotate(45, ${p.x + size / 2 + size / (2 * Math.sqrt(2))}, ${p.y + size / (2 * Math.sqrt(2))})`}
          fill={color}
        />
      ))}
    </svg>
  );
}
