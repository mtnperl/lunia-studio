export default function WaveGraphic() {
  const width = 936;
  const height = 420;
  const generateWave = (amplitude: number, frequency: number, phase: number, opacity: number, color: string) => {
    const points = [];
    for (let x = 0; x <= width; x += 4) {
      const y = height / 2 + amplitude * Math.sin((x / width) * frequency * Math.PI * 2 + phase);
      points.push(`${x},${y}`);
    }
    return (
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity={opacity}
      />
    );
  };

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {generateWave(60, 2, 0, 0.3, "#a8d4da")}
      {generateWave(80, 1.5, 0.5, 0.5, "#a8d4da")}
      {generateWave(100, 2.5, 1, 0.9, "#1e7a8a")}
      <text x={0} y={height - 8} fontFamily="Outfit" fontSize="22" fill="#4a5568" fontStyle="italic">LIGHT SLEEP</text>
      <text x={width / 2 - 60} y={height - 8} fontFamily="Outfit" fontSize="22" fill="#4a5568" fontStyle="italic">DEEP SLEEP</text>
      <text x={width - 100} y={height - 8} fontFamily="Outfit" fontSize="22" fill="#4a5568" fontStyle="italic">REM</text>
    </svg>
  );
}
