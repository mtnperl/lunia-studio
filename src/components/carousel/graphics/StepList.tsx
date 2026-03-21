export default function StepList({ steps = ["Take magnesium glycinate", "Dim lights 90 min before bed", "Set room to 18-19°C", "Avoid screens after 9pm"] }: { steps?: string[] }) {
  const r = 24;
  const rowH = 70;
  return (
    <svg width={936} height={rowH * steps.length} viewBox={`0 0 936 ${rowH * steps.length}`}>
      {steps.map((step, i) => (
        <g key={i}>
          <circle cx={r} cy={i * rowH + r} r={r} fill="#1e7a8a" />
          <text x={r} y={i * rowH + r + 9} textAnchor="middle" fontFamily="Outfit" fontSize="26" fontWeight="700" fill="#ffffff">{i + 1}</text>
          <text x={r * 2 + 16} y={i * rowH + r + 9} fontFamily="Outfit" fontSize="28" fill="#1a2535">{step}</text>
        </g>
      ))}
    </svg>
  );
}
