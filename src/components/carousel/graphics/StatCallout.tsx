export default function StatCallout({ stat = "87%", label = "OF ADULTS ARE MAGNESIUM DEFICIENT" }: { stat?: string; label?: string }) {
  return (
    <svg width={936} height={360} viewBox="0 0 936 360">
      <line x1={120} y1={60} x2={816} y2={60} stroke="#1e7a8a" strokeWidth="1.5" />
      <text x={468} y={220} textAnchor="middle" fontFamily="Outfit" fontSize="140" fontWeight="700" fill="#1e7a8a">{stat}</text>
      <line x1={120} y1={270} x2={816} y2={270} stroke="#1e7a8a" strokeWidth="1.5" />
      <text x={468} y={330} textAnchor="middle" fontFamily="Outfit" fontSize="30" fill="#4a5568" letterSpacing="3">{label}</text>
    </svg>
  );
}
