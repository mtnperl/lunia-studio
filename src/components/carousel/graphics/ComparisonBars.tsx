export default function ComparisonBars({ items = [{ label: "Magnesium", value: "85%" }, { label: "Melatonin", value: "42%" }, { label: "Placebo", value: "18%" }] }: { items?: { label: string; value: string }[] }) {
  const width = 936;
  const barHeight = 32;
  const gap = 48;

  return (
    <svg width={width} height={(barHeight + gap) * items.length} viewBox={`0 0 ${width} ${(barHeight + gap) * items.length}`}>
      {items.map((item, i) => {
        const y = i * (barHeight + gap);
        const fill = i === 0 ? "#1e7a8a" : "#a8d4da";
        return (
          <g key={i}>
            <text x={0} y={y + barHeight / 2 + 6} fontFamily="Outfit" fontSize="26" fill="#4a5568">{item.label}</text>
            <rect x={200} y={y} width={640} height={barHeight} rx={barHeight / 2} fill={fill} />
            <text x={856} y={y + barHeight / 2 + 6} fontFamily="Outfit" fontSize="24" fontWeight="600" fill="#1e7a8a">{item.value}</text>
          </g>
        );
      })}
    </svg>
  );
}
