const ICONS = [
  { label: "Sleep", path: "M20 12a8 8 0 01-8 8 8 8 0 01-8-8 8 8 0 018-8c.34 0 .67.02 1 .05A6 6 0 0020 12z" },
  { label: "Rest", path: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" },
  { label: "Recovery", path: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" },
  { label: "Balance", path: "M12 22V12M12 12C12 6.48 7.52 2 2 2M12 12c0-5.52 4.48-10 10-10" },
];

export default function IconGrid() {
  const cols = 4;
  const cellW = 936 / cols;
  return (
    <svg width={936} height={160} viewBox="0 0 936 160">
      {ICONS.map((icon, i) => {
        const x = i * cellW + cellW / 2;
        return (
          <g key={i}>
            <svg x={x - 28} y={10} width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="#1e7a8a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={icon.path} />
            </svg>
            <text x={x} y={100} textAnchor="middle" fontFamily="Outfit" fontSize="24" fill="#4a5568">{icon.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
