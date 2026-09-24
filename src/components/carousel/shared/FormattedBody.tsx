import { type CSSProperties, type ReactNode } from "react";
import { parseBody } from "@/lib/body-format";

type Props = {
  body: string;
  /** Type for every line. The preset passes its own family, size, weight and color. */
  textStyle: CSSProperties;
  /** Line height before spacing, as the preset sets it (e.g. 1.5). */
  lineHeight: number;
  /** Author's line spacing multiplier; 1 is the preset's own leading. */
  lineSpacing?: number;
  fontSize: number;
  /** Bullet and number color. Defaults to the text color. */
  markerColor?: string;
  /** Weight for the first text line only (ContentSlide leads bold). */
  firstLineWeight?: CSSProperties["fontWeight"];
  align?: "left" | "center";
  /** Draw a line's text, e.g. to highlight the emphasis phrase. */
  renderText?: (text: string) => ReactNode;
};

/**
 * One body, drawn line by line: plain lines, bullets and numbered items with a
 * hanging indent, and blank lines as paragraph space. Shared by every content
 * slide so a list typed in the editor reads the same in each preset and in
 * the headless export, which renders these same components.
 */
export default function FormattedBody({
  body, textStyle, lineHeight, lineSpacing = 1, fontSize, markerColor, firstLineWeight, align = "left", renderText = (t) => t,
}: Props) {
  const blocks = parseBody(body);
  const lh = lineHeight * lineSpacing;
  // Space between list items / lines: a fraction of a line so items read as
  // separate without looking like paragraphs. Paragraph gap is roughly a line.
  const itemGap = Math.round(fontSize * 0.28 * lineSpacing);
  const paraGap = Math.round(fontSize * 0.7 * lineSpacing);
  const markerW = Math.round(fontSize * 1.1);
  let firstTextSeen = false;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "stretch" }}>
      {blocks.map((b, i) => {
        if (b.kind === "gap") return <div key={i} style={{ height: paraGap - itemGap, flexShrink: 0 }} />;
        const top = i === 0 ? 0 : itemGap;
        if (b.kind === "text") {
          const weight = !firstTextSeen && firstLineWeight !== undefined ? firstLineWeight : textStyle.fontWeight;
          firstTextSeen = true;
          return (
            <div key={i} style={{ ...textStyle, fontWeight: weight, lineHeight: lh, marginTop: top, textAlign: align }}>
              {renderText(b.text)}
            </div>
          );
        }
        firstTextSeen = true;
        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: Math.round(fontSize * 0.35), marginTop: top, maxWidth: "100%" }}>
            <span
              aria-hidden
              style={{
                ...textStyle,
                lineHeight: lh,
                color: markerColor ?? textStyle.color,
                flexShrink: 0,
                minWidth: b.kind === "number" ? markerW : Math.round(fontSize * 0.6),
                fontVariantNumeric: "tabular-nums",
                textAlign: b.kind === "number" ? "right" : "center",
              }}
            >
              {b.kind === "number" ? b.marker : "•"}
            </span>
            <span style={{ ...textStyle, lineHeight: lh, textAlign: "left", minWidth: 0 }}>{renderText(b.text)}</span>
          </div>
        );
      })}
    </div>
  );
}
