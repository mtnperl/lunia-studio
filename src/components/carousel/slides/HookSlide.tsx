import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";

type Props = { headline: string; subline: string; scale?: number; id?: string };

function WaveLines() {
  const width = 1080;
  const lines = Array.from({ length: 14 }, (_, i) => {
    const amp = 60 + i * 8;
    const freq = 1.5 + i * 0.1;
    const phase = i * 0.3;
    const opacity = 0.6 + (i / 14) * 0.3;
    const points = [];
    for (let x = 0; x <= width; x += 6) {
      const y = 200 + amp * Math.sin((x / width) * freq * Math.PI * 2 + phase);
      points.push(`${x},${y}`);
    }
    return (
      <polyline
        key={i}
        points={points.join(" ")}
        fill="none"
        stroke={i > 10 ? "#e8f4f8" : "#ffffff"}
        strokeWidth="0.8"
        opacity={opacity}
      />
    );
  });
  return (
    <svg
      style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "40%" }}
      viewBox={`0 0 ${width} 540`}
      preserveAspectRatio="none"
    >
      {lines}
    </svg>
  );
}

export default function HookSlide({ headline, subline, scale = 1, id }: Props) {
  return (
    <SlideWrapper scale={scale} id={id} style={{
      background: "linear-gradient(160deg, #0a1628 0%, #0d2137 40%, #0a2a3a 100%)",
    }}>
      <ArrowIcons color="#4a7c8e" />
      <div style={{
        position: "absolute",
        top: 110,
        left: 72,
        right: 72,
      }}>
        <div style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 700,
          fontSize: 64,
          color: "#ffffff",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          lineHeight: 1.15,
        }}>
          {headline}
        </div>
        <div style={{
          fontFamily: "Outfit, sans-serif",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 42,
          color: "#c8dde8",
          lineHeight: 1.3,
          marginTop: 32,
        }}>
          {subline}
        </div>
      </div>
      <WaveLines />
      <LuniaLogo />
    </SlideWrapper>
  );
}
