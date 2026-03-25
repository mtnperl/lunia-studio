type Props = { color?: string; sizeScale?: number };

export default function ArrowIcons({ color = "#4a7c8e", sizeScale = 1 }: Props) {
  const sz = Math.round(20 * sizeScale);
  return (
    <div style={{
      position: "absolute",
      top: 48,
      right: 48,
      display: "flex",
      gap: Math.round(6 * sizeScale),
    }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width={sz} height={sz} viewBox="0 0 20 20" fill="none">
          <polygon points="4,2 16,10 4,18" fill={color} />
        </svg>
      ))}
    </div>
  );
}
