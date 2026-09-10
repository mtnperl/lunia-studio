// Chartbook: a serif question on paper, then one figure. Five frozen
// layouts, each drawn from its own fields; the model fills fields and
// never chooses a composition. Bars are ink, the bar the title is about
// is the accent, every numeral is Inter tabular.

import type { CSSProperties } from "react";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import { Kicker, MarkWords, PenChrome, PenGround, PenTitle, SourceLine, TitleBlock, numStyle, penPaper, penStyle, swipeStyle } from "@/components/carousel/shared/PenChrome";
import { PEN_COLORS as C, PEN_SERIF, PEN_SANS, PEN_TYPE as T, PEN_LAYOUT as L, type PaperSettings } from "@/lib/brand-tokens";
import type { ChartbookContent, ChartbookFigure } from "@/lib/types";

const H = 1350;
const COL_W = 1080 - 2 * L.padX;

type CoverProps = { content: ChartbookContent; paper?: Partial<PaperSettings>; scale?: number; fontScale?: number; id?: string };

export function ChartbookCoverSlide({ content, paper, scale = 1, fontScale = 1, id }: CoverProps) {
  const p = penPaper("chartbook", paper);
  const q = content.cover.question;
  const size = Math.round(T.coverQuestion * fontScale * (q.length > 44 ? 0.84 : 1));
  return (
    <SlideWrapper scale={scale} height={H} id={id} style={{ background: C.paper }}>
      <PenGround paper={p}>
        <div style={{ position: "absolute", left: L.padX, right: L.padX, top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 40 }}>
          <PenTitle text={q} underline={content.cover.underline} size={size} style={{ lineHeight: 1.08 }} />
          <Kicker text={content.cover.kicker} size={T.coverKicker} />
        </div>
        <PenChrome arrow />
      </PenGround>
    </SlideWrapper>
  );
}

type FigureProps = { content: ChartbookContent; paper?: Partial<PaperSettings>; scale?: number; fontScale?: number; id?: string };

export function ChartbookFigureSlide({ content, paper, scale = 1, fontScale = 1, id }: FigureProps) {
  const p = penPaper("chartbook", paper);
  const f = content.figure;
  const kicker = "unit" in f ? f.unit : f.kicker;
  return (
    <SlideWrapper scale={scale} height={H} id={id} style={{ background: C.paper }}>
      <PenGround paper={p}>
        <TitleBlock title={f.title} kicker={kicker} />
        <div style={{ position: "absolute", left: L.padX, right: L.padX, top: L.bodyTop, bottom: L.bodyBottom }}>
          <Figure figure={f} fontScale={fontScale} />
        </div>
        <SourceLine text={f.source.citation} />
        <PenChrome />
      </PenGround>
    </SlideWrapper>
  );
}

function Figure({ figure, fontScale }: { figure: ChartbookFigure; fontScale: number }) {
  switch (figure.layout) {
    case "pill-bars": return <PillBars bars={figure.bars} fontScale={fontScale} />;
    case "versus-bars": return <VersusBars series={figure.series} groups={figure.groups} fontScale={fontScale} />;
    case "ranked": return <Ranked items={figure.items} fontScale={fontScale} />;
    case "object-pair": return <ObjectPair pair={figure.pair} fontScale={fontScale} />;
    case "claim-check": return <ClaimCheck figure={figure} fontScale={fontScale} />;
  }
}

const labelSerif = (fontScale: number): CSSProperties => ({ fontFamily: PEN_SERIF, fontWeight: 500, fontSize: Math.round(T.label * fontScale), color: C.ink, textAlign: "center", lineHeight: 1.15 });
const valueNum = (fontScale: number): CSSProperties => ({ ...numStyle, fontSize: Math.round(T.value * fontScale), textAlign: "center", whiteSpace: "nowrap" });

/** A · pill bars. The tallest bar is the accent. */
function PillBars({ bars, fontScale }: { bars: { label: string; value: number; display: string }[]; fontScale: number }) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  const iMax = bars.findIndex((b) => b.value === max);
  const chartH = 520, barW = Math.min(110, Math.floor((COL_W - 60 * (bars.length - 1)) / bars.length));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: chartH, display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={valueNum(fontScale)}>{b.display}</div>
            <div style={{ width: barW, height: Math.max(barW / 2 + 8, Math.round((chartH - 80) * (b.value / max))), background: i === iMax ? C.barAccent : C.bar, borderRadius: `${barW / 2}px ${barW / 2}px 0 0` }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 40 + chartH, height: 3, background: C.ink }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 40 + chartH + 24, display: "flex", justifyContent: "space-around" }}>
        {bars.map((b, i) => <div key={i} style={{ ...labelSerif(fontScale), width: barW + 60 }}>{b.label}</div>)}
      </div>
    </div>
  );
}

/** B · two series across groups. The first series is ink, the second the accent. */
function VersusBars({ series, groups, fontScale }: { series: [string, string]; groups: { label: string; values: [number, number]; displays: [string, string] }[]; fontScale: number }) {
  const max = Math.max(...groups.flatMap((g) => g.values), 1);
  const chartH = 480, barW = groups.length >= 4 ? 64 : 84;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 30, height: chartH, display: "flex", justifyContent: "space-around", alignItems: "flex-end" }}>
        {groups.map((g, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
            {g.values.map((v, j) => (
              <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ ...valueNum(fontScale), fontSize: Math.round(30 * fontScale) }}>{g.displays[j]}</div>
                <div style={{ width: barW, height: Math.max(barW / 2 + 8, Math.round((chartH - 70) * (v / max))), background: j === 0 ? C.bar : C.barAccent, borderRadius: `${barW / 2}px ${barW / 2}px 0 0` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 30 + chartH, height: 3, background: C.ink }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 30 + chartH + 22, display: "flex", justifyContent: "space-around" }}>
        {groups.map((g, i) => <div key={i} style={labelSerif(fontScale)}>{g.label}</div>)}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 30 + chartH + 110, textAlign: "center", fontFamily: PEN_SERIF, fontStyle: "italic", fontWeight: 500, fontSize: Math.round(30 * fontScale), color: C.ink }}>
        <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 10, background: C.bar, verticalAlign: -2, marginRight: 10 }} />{series[0]}
        <span style={{ display: "inline-block", width: 44 }} />
        <span style={{ display: "inline-block", width: 20, height: 20, borderRadius: 10, background: C.barAccent, verticalAlign: -2, marginRight: 10 }} />{series[1]}
      </div>
    </div>
  );
}

/** C · horizontal ranked bars, the top item in the accent. Labels get the
 *  whole column, values sit at the bar end, no axis needed. */
function Ranked({ items, fontScale }: { items: { label: string; value: number; display: string }[]; fontScale: number }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((b) => b.value), 1);
  const rowH = Math.floor(720 / sorted.length);
  const barH = Math.min(34, rowH - 30);
  const labelW = 300, valueW = 130;
  const trackW = COL_W - labelW - valueW - 40;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
      {sorted.map((b, i) => (
        <div key={i} style={{ height: rowH, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: labelW, fontFamily: PEN_SERIF, fontWeight: 500, fontSize: Math.round(Math.min(T.label, rowH * 0.5) * fontScale), color: C.ink, lineHeight: 1.1, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.label}</div>
          <div style={{ width: trackW, height: barH, position: "relative" }}>
            <div style={{ width: Math.max(barH, Math.round(trackW * (b.value / max))), height: barH, background: i === 0 ? C.barAccent : C.bar, borderRadius: `0 ${barH / 2}px ${barH / 2}px 0` }} />
          </div>
          <div style={{ ...numStyle, width: valueW, fontSize: Math.round(Math.min(T.value, rowH * 0.5) * fontScale), whiteSpace: "nowrap" }}>{b.display}</div>
        </div>
      ))}
    </div>
  );
}

/** D · two choices, two numbers, on either side of a dashed divider. The
 *  first figure takes the pen, the second the swipe. Plain, no icons. */
function ObjectPair({ pair, fontScale }: { pair: [{ label: string; figure: string; note: string }, { label: string; figure: string; note: string }]; fontScale: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-around", alignItems: "center", textAlign: "center" }}>
      {pair.map((o, i) => (
        <div key={i} style={{ width: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ ...labelSerif(fontScale), fontSize: Math.round(44 * fontScale), lineHeight: 1.15 }}>{o.label}</div>
          <div style={{ ...numStyle, fontSize: Math.round(88 * fontScale), lineHeight: 1.25 }}><span style={i === 0 ? penStyle : swipeStyle}>{o.figure}</span></div>
          <Kicker text={o.note} />
        </div>
      ))}
      <div style={{ position: "absolute", left: "50%", top: 60, bottom: 60, borderLeft: `3px dashed ${C.hairline}` }} />
    </div>
  );
}

/** E · a quote, then two bars at an extreme ratio with a drawn note. The
 *  small bar never drops under 24px and the note anchors to its label. */
function ClaimCheck({ figure, fontScale }: { figure: Extract<ChartbookFigure, { layout: "claim-check" }>; fontScale: number }) {
  const { quote, kicker, small, large, annotation } = figure;
  const chartH = 380;
  const largeH = chartH, smallH = Math.max(24, Math.round(chartH * (small.value / Math.max(large.value, 1))));
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ textAlign: "center", fontFamily: PEN_SERIF, fontWeight: 500, fontSize: Math.round(48 * fontScale), color: C.ink, lineHeight: 1.2, padding: "0 20px" }}>
        &ldquo;<MarkWords text={quote} words={[quote.split(/\s+/).slice(-2).join(" ")]} mark="swipe" />&rdquo;
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, height: chartH + 40, display: "flex", justifyContent: "center", gap: 180, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ ...valueNum(fontScale), fontSize: Math.round(40 * fontScale) }}>{small.display}</div>
          <div style={{ width: 110, height: smallH, background: C.barAccent, borderRadius: "55px 55px 0 0" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ ...valueNum(fontScale), fontSize: Math.round(40 * fontScale) }}>{large.display}</div>
          <div style={{ width: 110, height: largeH, background: C.bar, borderRadius: "55px 55px 0 0" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200 + chartH + 40, height: 3, background: C.ink }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 200 + chartH + 64, display: "flex", justifyContent: "center", gap: 180 }}>
        <div style={{ ...labelSerif(fontScale), width: 240 }}><span style={penStyle}>{small.label}</span></div>
        <div style={{ ...labelSerif(fontScale), width: 240 }}><span style={penStyle}>{large.label}</span></div>
      </div>
      <div style={{ position: "absolute", left: 40, top: 280, width: 300, fontFamily: PEN_SERIF, fontStyle: "italic", fontWeight: 500, fontSize: Math.round(32 * fontScale), color: C.ink, lineHeight: 1.2 }}>{annotation}</div>
      <svg aria-hidden style={{ position: "absolute", left: 200, top: 360 }} width="200" height="150" viewBox="0 0 200 150" fill="none" stroke={C.ink} strokeWidth="3" strokeLinecap="round">
        <path d="M10 10 C 60 20, 130 70, 175 138" />
        <path d="M156 128 L175 138 L172 116" />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: -10, height: 0, fontFamily: PEN_SANS }} />
    </div>
  );
}
