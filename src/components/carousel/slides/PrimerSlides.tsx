// Primer: a cover (a numeral beside the title for a list, the serif
// question otherwise), then one reference slide from four frozen layouts.
// Terms take the navy pen, one phrase per row takes the yellow swipe.

import type { CSSProperties } from "react";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { Kicker, MarkWords, PenChrome, PenGround, PenTitle, TitleBlock, numStyle, penPaper, penStyle, swipeStyle } from "@/components/carousel/shared/PenChrome";
import { PEN_COLORS as C, PEN_SERIF, PEN_SANS, PEN_TYPE as T, PEN_LAYOUT as L, type PaperSettings } from "@/lib/brand-tokens";
import type { PrimerContent, PrimerSlideContent } from "@/lib/types";

const H = 1350;

/** The count on the cover is the real row count, never typed. */
export function primerCount(content: PrimerContent): number | undefined {
  return content.slide.layout === "rows" ? content.slide.rows.length : undefined;
}

type CoverProps = { content: PrimerContent; paper?: Partial<PaperSettings>; scale?: number; fontScale?: number; id?: string };

export function PrimerCoverSlide({ content, paper, scale = 1, fontScale = 1, id }: CoverProps) {
  const p = penPaper("primer", paper);
  const count = primerCount(content);
  const title = content.cover.title;
  if (count !== undefined) {
    // Numeral form: the count at 400px, the title in two blocks beside and
    // below it, one word underlined in each.
    const words = title.split(/\s+/);
    const cut = Math.ceil(words.length / 2);
    const first = words.slice(0, cut).join(" "), rest = words.slice(cut).join(" ");
    const titleSize = Math.round(104 * fontScale * (title.length > 26 ? 0.8 : 1));
    return (
      <SlideWrapper scale={scale} height={H} id={id} style={{ background: C.paper }}>
        <PenGround paper={p}>
          <div style={{ position: "absolute", left: L.padX, right: L.padX, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
              {/* Inter, not the serif: Cormorant's 1 reads as a Roman I. */}
              <div style={{ ...numStyle, fontWeight: 400, fontSize: Math.round(T.numeral * fontScale * 0.9), lineHeight: 0.85, letterSpacing: "-0.06em" }}>{count}</div>
              <div style={{ fontFamily: PEN_SERIF, fontWeight: 500, fontSize: titleSize, lineHeight: 1.05, color: C.ink, maxWidth: 460 }}>
                <MarkWords text={first} words={content.cover.underline.filter((w) => first.includes(w))} mark="pen" />
              </div>
            </div>
            {rest && (
              <div style={{ fontFamily: PEN_SERIF, fontWeight: 500, fontSize: titleSize, lineHeight: 1.05, color: C.ink, textAlign: "center" }}>
                <MarkWords text={rest} words={content.cover.underline.filter((w) => rest.includes(w)).length ? content.cover.underline : [rest.split(/\s+/).slice(-1)[0]]} mark="pen" />
              </div>
            )}
            <Kicker text={content.cover.kicker} size={T.coverKicker} style={{ marginTop: 10 }} />
          </div>
          <PenChrome arrow />
        </PenGround>
      </SlideWrapper>
    );
  }
  const size = Math.round(T.coverQuestion * fontScale * (title.length > 44 ? 0.84 : 1));
  return (
    <SlideWrapper scale={scale} height={H} id={id} style={{ background: C.paper }}>
      <PenGround paper={p}>
        <div style={{ position: "absolute", left: L.padX, right: L.padX, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 40 }}>
          <PenTitle text={title} underline={content.cover.underline} size={size} style={{ lineHeight: 1.08 }} />
          <Kicker text={content.cover.kicker} size={T.coverKicker} />
        </div>
        <PenChrome arrow />
      </PenGround>
    </SlideWrapper>
  );
}

type BodyProps = { content: PrimerContent; paper?: Partial<PaperSettings>; scale?: number; fontScale?: number; id?: string };

export function PrimerBodySlide({ content, paper, scale = 1, fontScale = 1, id }: BodyProps) {
  const p = penPaper("primer", paper);
  const s = content.slide;
  const kicker = "kicker" in s ? s.kicker : undefined;
  return (
    <SlideWrapper scale={scale} height={H} id={id} style={{ background: C.paper }}>
      <PenGround paper={p}>
        <TitleBlock title={s.title} kicker={kicker} kickerItalic />
        <div style={{ position: "absolute", left: L.padX, right: L.padX, top: L.bodyTop, bottom: L.bodyBottom - 60, overflow: "hidden" }}>
          <Body slide={s} fontScale={fontScale} />
        </div>
        <PenChrome />
      </PenGround>
    </SlideWrapper>
  );
}

function Body({ slide, fontScale }: { slide: PrimerSlideContent; fontScale: number }) {
  switch (slide.layout) {
    case "rows": return <Rows rows={slide.rows} fontScale={fontScale} />;
    case "definition": return <Definition slide={slide} fontScale={fontScale} />;
    case "versus": return <Versus columns={slide.columns} fontScale={fontScale} />;
    case "creed": return <Creed lines={slide.lines} closing={slide.closing} fontScale={fontScale} />;
  }
}

const serif = (size: number): CSSProperties => ({ fontFamily: PEN_SERIF, fontWeight: 500, fontSize: size, color: C.ink, lineHeight: 1.25 });

/** A · rows. Fewer rows grow the type, never the gaps. The term takes the
 *  pen, the key phrase of the definition takes the swipe (P2). */
function Rows({ rows, fontScale }: { rows: { term: string; definition: string; key?: string }[]; fontScale: number }) {
  // Eleven rows must clear the 730px body box: size and padding both step
  // down with the count, and a row never wraps (the lint caps it at 58
  // characters; anything longer is cut with an ellipsis, not spilled).
  const n = rows.length;
  const size = Math.round(Math.min(44, Math.max(32, 44 - (n - 6) * 2.4)) * fontScale);
  const pad = n > 9 ? 11 : n > 7 ? 15 : 20;
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 26, padding: `${pad}px 0`, borderBottom: `3px dashed ${C.hairline}`, whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ ...numStyle, fontSize: T.rowNumber, color: C.inkMuted, minWidth: 44 }}>{i + 1}</span>
          <span style={{ ...serif(size) }}><span style={penStyle}>{r.term}</span></span>
          <span style={{ ...serif(size), color: C.inkSoft, marginLeft: 8, overflow: "hidden", textOverflow: "ellipsis" }}><MarkWords text={r.definition} words={r.key ? [r.key] : []} mark="swipe" /></span>
        </div>
      ))}
    </div>
  );
}

/** B · one term, a definition, a fraction, a threshold, an example. The
 *  threshold's value takes the swipe. */
function Definition({ slide, fontScale }: { slide: Extract<PrimerSlideContent, { layout: "definition" }>; fontScale: number }) {
  const f = slide.formula;
  const big = Math.round(40 * fontScale);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
      <div>
        <div style={{ ...serif(Math.round(56 * fontScale)) }}><span style={penStyle}>{slide.term}</span></div>
        <div style={{ ...serif(Math.round(36 * fontScale)), color: C.inkSoft, marginTop: 20, lineHeight: 1.35, maxWidth: 820 }}>{slide.definition}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, ...serif(big) }}>
        <span><span style={penStyle}>{f.left}</span> =</span>
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <span style={{ padding: "0 18px 8px" }}>{f.numerator}</span>
          <span style={{ width: "100%", height: 3, background: C.ink }} />
          <span style={{ padding: "8px 18px 0" }}>{f.denominator}</span>
        </span>
        {f.factor && <span>{f.factor}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, ...serif(big) }}>
        <span>{slide.threshold.label} =</span><span style={swipeStyle}>{slide.threshold.value}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 26, ...serif(big) }}>
        <span>{slide.example.label} =</span><span style={numStyle}>{slide.example.value}</span>
      </div>
    </div>
  );
}

/** C · two columns on a dashed divider. Names take the pen, the first row
 *  of each column takes the swipe, footnotes are italic lines. */
function Versus({ columns, fontScale }: { columns: [{ name: string; rows: string[]; footnote: string }, { name: string; rows: string[]; footnote: string }]; fontScale: number }) {
  const rowSize = Math.round(32 * fontScale);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", height: "100%" }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ width: 400, display: "flex", flexDirection: "column" }}>
          <div style={serif(Math.round(44 * fontScale))}><span style={penStyle}>{col.name}</span></div>
          <div style={{ ...serif(Math.round(30 * fontScale)), color: C.inkMuted, marginTop: 26, borderBottom: `2px solid ${C.ink}`, alignSelf: "flex-start" }}>Best for</div>
          {col.rows.map((r, i) => (
            <div key={i} style={{ ...serif(rowSize), marginTop: 24 }}>{i === 0 ? <span style={swipeStyle}>{r}</span> : r}</div>
          ))}
          <div style={{ ...serif(Math.round(26 * fontScale)), fontStyle: "italic", color: C.inkMuted, marginTop: "auto", paddingTop: 30 }}>{col.footnote}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, borderLeft: `3px dashed ${C.hairline}` }} />
      <div style={{ position: "absolute", left: "50%", top: -8, transform: "translateX(-50%)", background: C.paper, padding: "0 12px", fontFamily: PEN_SERIF, fontStyle: "italic", fontWeight: 500, fontSize: 40, color: C.ink }}>vs</div>
    </div>
  );
}

/** D · the creed as serif rows: the condition in the pen, the consequence swiped. */
function Creed({ lines, closing, fontScale }: { lines: { condition: string; consequence: string }[]; closing: string; fontScale: number }) {
  const size = Math.round(Math.min(40, 44 - (lines.length - 5) * 2) * fontScale);
  return (
    <div>
      {lines.map((l, i) => (
        <div key={i} style={{ ...serif(size), padding: "18px 0", borderBottom: `3px dashed ${C.hairline}` }}>
          Without <span style={penStyle}>{l.condition}</span>, no <span style={swipeStyle}>{l.consequence}</span>.
        </div>
      ))}
      <div style={{ ...serif(size), marginTop: 44, fontFamily: PEN_SANS, fontWeight: 500 }}>{closing}</div>
    </div>
  );
}
