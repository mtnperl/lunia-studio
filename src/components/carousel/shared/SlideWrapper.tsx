import { CSSProperties, ReactNode } from "react";

type Props = {
  scale?: number;
  height?: number;
  children: ReactNode;
  style?: CSSProperties;
  id?: string;
};

export default function SlideWrapper({ scale = 1, height = 1350, children, style, id }: Props) {
  return (
    <div
      style={{
        width: 1080 * scale,
        height: height * scale,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div
        id={id}
        style={{
          width: 1080,
          height: height,
          position: "relative",
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          overflow: "hidden",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
