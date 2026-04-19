"use client";
import { useEffect, useState } from "react";

const FRAMES = ["▓░░░░░░░", "▓▓░░░░░░", "▓▓▓░░░░░", "▓▓▓▓░░░░", "▓▓▓▓▓░░░", "▓▓▓▓▓▓░░", "▓▓▓▓▓▓▓░", "▓▓▓▓▓▓▓▓"];

type Props = {
  label?: string;
  size?: "sm" | "md";
};

export default function UGCCRTLoader({ label = "LOADING", size = "md" }: Props) {
  const [frame, setFrame] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const t1 = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 120);
    const t2 = setInterval(() => setBlink((b) => !b), 530);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const mono: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    color: "#111",
    background: "#fff",
    display: "inline-block",
    userSelect: "none",
    letterSpacing: "0.04em",
  };

  const isSmall = size === "sm";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: isSmall ? 6 : 12, padding: isSmall ? "12px 0" : "32px 0" }}>
      <div style={{
        ...mono,
        fontSize: isSmall ? 11 : 13,
        padding: isSmall ? "6px 10px" : "10px 16px",
        border: "2px solid #111",
        lineHeight: 1,
        whiteSpace: "pre",
      }}>
        [{FRAMES[frame]}]
      </div>
      <div style={{
        ...mono,
        fontSize: isSmall ? 9 : 10,
        letterSpacing: "0.14em",
        opacity: blink ? 1 : 0.15,
        transition: "opacity 80ms linear",
      }}>
        {label}
        {blink ? "_" : " "}
      </div>
    </div>
  );
}
