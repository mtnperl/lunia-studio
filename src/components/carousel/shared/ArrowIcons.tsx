type Props = { color?: string };

export default function ArrowIcons({ color = "#4a7c8e" }: Props) {
  return (
    <div style={{
      position: "absolute",
      top: 48,
      right: 48,
      display: "flex",
      gap: 6,
    }}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width="20" height="20" viewBox="0 0 20 20" fill="none">
          <polygon points="4,2 16,10 4,18" fill={color} />
        </svg>
      ))}
    </div>
  );
}
