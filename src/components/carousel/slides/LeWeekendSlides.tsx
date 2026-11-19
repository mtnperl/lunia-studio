// "Le week-end": one page of a French weekend magazine's sleep column.
// Fixed furniture on every page (masthead, strip, footer), six templates in
// between. Type is never scaled to fit: a body that does not fit is clipped
// inside its box and marked data-lw-fit, and the studio measures that box
// and shows a warning instead.

import type { CSSProperties, ReactNode } from "react";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import {
  LW_COLORS as C, LW_COLUMN_LABEL, LW_H, LW_PAD, LW_SANS, LW_SERIF, pageNumber,
  type LwFigure, type LwPost, type LwSlide,
} from "@/lib/le-weekend";

// Bodoni Moda is variable on optical size. Left to itself the browser picks
// the display cut (opsz 96) at headline sizes, whose hairlines vanish once
// Instagram shows the page at phone width (about a third of 1080). The axis
// is pinned to a text cut so every stroke survives that reduction, and
// display sizes get a heavier weight for the same reason.
const serif = (size: number, italic = false, weight?: 400 | 500 | 600): CSSProperties => ({
  fontFamily: LW_SERIF, fontSize: size, fontStyle: italic ? "italic" : "normal", lineHeight: 1.1,
  fontWeight: weight ?? (size >= 60 ? 500 : 400),
  fontOpticalSizing: "none", fontVariationSettings: `"opsz" ${size >= 60 ? 14 : 11}`,
});
const sans = (size: number, weight: 400 | 500 | 600 = 400): CSSProperties => ({ fontFamily: LW_SANS, fontSize: size, fontWeight: weight });
const rule = (ink: string, width: number | string = "100%"): CSSProperties => ({ width, height: 0, borderTop: `1px solid ${ink}` });

type Tone = { ink: string; soft: string; ground: string; shadow?: string };
const IVORY_PAGE: Tone = { ink: C.deepNavy, soft: C.slate, ground: C.ivory };
const NAVY_PAGE: Tone = { ink: C.ivory, soft: C.ivory, ground: C.richNavy };

type Props = {
  post: LwPost;
  index: number;
  scale?: number;
  /** The photograph's src, when the caller proxies it. Defaults to post.imageUrl. */
  imageSrc?: string;
};

export function LeWeekendSlide({ post, index, scale = 1, imageSrc }: Props) {
  const slide = post.slides[index];
  if (!slide) return null;
  if (slide.template === "photo") return <PhotoPage post={post} slide={slide} index={index} scale={scale} src={imageSrc ?? post.imageUrl} />;
  const tone = slide.template === "courrier" ? NAVY_PAGE : IVORY_PAGE;
  return (
    <SlideWrapper scale={scale} height={LW_H} style={{ background: tone.ground }}>
      <Furniture post={post} index={index} tone={tone} footerRule>
        <Body slide={slide} tone={tone} />
      </Furniture>
    </SlideWrapper>
  );
}

function Furniture({ post, index, tone, footTone, footerRule, children }: { post: LwPost; index: number; tone: Tone; footTone?: Tone; footerRule: boolean; children: ReactNode }) {
  const t: CSSProperties = { color: tone.ink, textShadow: tone.shadow };
  return (
    <div style={{ position: "absolute", inset: 0, padding: `${LW_PAD.y}px ${LW_PAD.x}px`, display: "flex", flexDirection: "column", ...t }}>
      <div style={{ ...serif(56, true), lineHeight: 1, textAlign: "center" }}>Le week-end</div>
      <div style={{ marginTop: 22, borderTop: `1px solid ${tone.ink}`, borderBottom: `1px solid ${tone.ink}`, padding: "14px 0", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "baseline" }}>
        <span style={{ ...sans(19, 600), letterSpacing: "0.16em" }}>LUNIA LIFE</span>
        <span style={{ ...serif(26, true), lineHeight: 1 }}>{LW_COLUMN_LABEL[post.column]}</span>
        <span style={{ ...sans(19), justifySelf: "end" }}>{post.dateFr}</span>
      </div>
      <div data-lw-fit="body" style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", padding: "56px 0 40px" }}>
        {children}
      </div>
      <div style={{ ...(footerRule ? { borderTop: `1px solid ${tone.ink}` } : {}), paddingTop: 16, display: "flex", justifyContent: "space-between", ...sans(19), ...(footTone ? { color: footTone.ink, textShadow: footTone.shadow } : {}) }}>
        <span>lunialife.com</span>
        <span>p. {pageNumber(post, index)}</span>
      </div>
    </div>
  );
}

function Body({ slide, tone }: { slide: Exclude<LwSlide, { template: "photo" }>; tone: Tone }) {
  switch (slide.template) {
    case "chronique": return <Chronique f={slide.fields} tone={tone} />;
    case "chronique-number": return <ChroniqueNumber f={slide.fields} tone={tone} />;
    case "lexique": return <Lexique f={slide.fields} tone={tone} />;
    case "courrier": return <Courrier f={slide.fields} tone={tone} />;
    case "regles": return <Regles f={slide.fields} tone={tone} />;
  }
}

type F<T extends LwSlide["template"]> = Extract<LwSlide, { template: T }>["fields"];
const centred: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", justifyContent: "safe center" };

// ─── A · chronique ───────────────────────────────────────────────────────────

function Chronique({ f, tone }: { f: F<"chronique">; tone: Tone }) {
  const body: CSSProperties = { ...sans(29), lineHeight: 1.5, flex: 1, minWidth: 0 };
  const [cap, ...rest] = Array.from(f.column1.trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
      <div style={{ ...serif(78), lineHeight: 1.1, letterSpacing: "-0.01em" }}>{f.headline}</div>
      {f.figure && <Curve fig={f.figure} tone={tone} />}
      <div style={{ display: "flex", gap: 48 }}>
        <p style={{ ...body, margin: 0 }}>
          <span style={{ ...serif(76), lineHeight: 0.82, float: "left", margin: "6px 10px 0 0" }}>{cap}</span>
          {rest.join("")}
        </p>
        <p style={{ ...body, margin: 0 }}>{f.column2}</p>
      </div>
    </div>
  );
}

/** One stroke through the heights, Catmull-Rom as cubic Béziers. */
function smoothPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Curve({ fig, tone }: { fig: LwFigure; tone: Tone }) {
  const W = 888, H = 210, top = 44, plotH = H - top - 8;
  const pts = fig.curve.map((v, i): [number, number] => [(i / (fig.curve.length - 1)) * W, top + (1 - v) * plotH]);
  return (
    <div style={{ position: "relative", width: W }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <path d={smoothPath(pts)} fill="none" stroke={tone.ink} strokeWidth={2} strokeLinecap="round" />
        <line x1={0} x2={W} y1={H} y2={H} stroke={tone.ink} strokeWidth={1} />
        {fig.marks.map((m, i) => {
          const p = pts[Math.min(m.at, pts.length - 1)];
          return <circle key={i} cx={p[0]} cy={p[1]} r={5} fill={tone.ink} />;
        })}
      </svg>
      {fig.marks.map((m, i) => {
        const p = pts[Math.min(m.at, pts.length - 1)];
        const edge = p[0] < 120 ? "left" : p[0] > W - 120 ? "right" : "mid";
        return (
          <div key={i} style={{ position: "absolute", top: p[1] - 40, left: edge === "right" ? undefined : p[0], right: edge === "right" ? W - p[0] : undefined, transform: edge === "mid" ? "translateX(-50%)" : undefined, ...serif(28, true), color: tone.soft, whiteSpace: "nowrap" }}>
            {m.label}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, ...sans(19), color: tone.soft }}>
        {fig.axis.map((a, i) => <span key={i}>{a}</span>)}
      </div>
      <div style={{ marginTop: 6, textAlign: "right", ...sans(16), color: tone.soft }}>Illustrative curve</div>
    </div>
  );
}

// ─── B · chronique-number ────────────────────────────────────────────────────

function ChroniqueNumber({ f, tone }: { f: F<"chronique-number">; tone: Tone }) {
  return (
    <div style={centred}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
        <div style={{ ...serif(300), lineHeight: 0.85, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>{f.figure}</div>
        <div style={{ ...serif(28, true), lineHeight: 1.3, color: tone.soft, whiteSpace: "pre-line", paddingBottom: 18 }}>{f.sideNote}</div>
      </div>
      <div style={{ ...rule(tone.ink, 120), marginTop: 56 }} />
      <div style={{ ...serif(66), marginTop: 44 }}>{f.headline}</div>
      <p style={{ ...sans(30), lineHeight: 1.5, margin: "28px 0 0", maxWidth: 840 }}>{f.body}</p>
    </div>
  );
}

// ─── C · lexique ─────────────────────────────────────────────────────────────

function Lexique({ f, tone }: { f: F<"lexique">; tone: Tone }) {
  return (
    <div style={centred}>
      <div data-lw-fit="word" style={{ ...serif(128), lineHeight: 1.05, textTransform: "lowercase", whiteSpace: "nowrap", overflow: "hidden" }}>{f.word}</div>
      <div style={{ ...serif(30, true), color: tone.soft, marginTop: 18 }}>{f.pronunciation}&ensp;{f.gender}</div>
      <div style={{ ...rule(tone.ink, 120), marginTop: 48 }} />
      <ol style={{ listStyle: "none", margin: "48px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 36 }}>
        {f.definitions.map((d, i) => (
          <li key={i} style={{ display: "grid", gridTemplateColumns: "64px 1fr", alignItems: "baseline" }}>
            <span style={{ ...serif(34, true), color: tone.soft }}>{i + 1}.</span>
            <span style={{ ...serif(40), lineHeight: 1.25 }}>{d}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── D · courrier (navy) ─────────────────────────────────────────────────────

function Courrier({ f, tone }: { f: F<"courrier">; tone: Tone }) {
  return (
    <div style={centred}>
      <div style={serif(30, true)}>Chère Lunia,</div>
      <div style={{ ...serif(46), lineHeight: 1.3, marginTop: 28 }}>{f.letter}</div>
      <div style={{ ...serif(26, true), textAlign: "right", marginTop: 24 }}>{f.signature}</div>
      <div style={{ ...rule(tone.ink, 120), marginTop: 52 }} />
      <div style={{ ...sans(20, 600), letterSpacing: "0.04em", marginTop: 40 }}>La réponse</div>
      <p style={{ ...sans(32), lineHeight: 1.5, margin: "18px 0 0" }}>{f.reply}</p>
    </div>
  );
}

// ─── E · règles ──────────────────────────────────────────────────────────────

function Regles({ f, tone }: { f: F<"regles">; tone: Tone }) {
  const col = (head: string, items: readonly string[]) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ ...serif(30, true), paddingBottom: 14, borderBottom: `1px solid ${tone.ink}` }}>{head}</div>
      {items.map((it, i) => (
        <div key={i} style={{ ...serif(36), lineHeight: 1.22, padding: "22px 0", borderBottom: i < items.length - 1 ? "1px solid rgba(16,38,53,0.25)" : undefined }}>{it}</div>
      ))}
    </div>
  );
  return (
    <div style={centred}>
      <div style={{ ...serif(150), lineHeight: 1, textAlign: "center", letterSpacing: "-0.02em" }}>{f.title}</div>
      <div style={{ display: "flex", gap: 64, marginTop: 64 }}>
        {col("Ce qui se fait", f.dos)}
        {col("Ce qui ne se fait pas", f.donts)}
      </div>
    </div>
  );
}

// ─── F · photo ───────────────────────────────────────────────────────────────

function PhotoPage({ post, slide, index, scale, src }: { post: LwPost; slide: Extract<LwSlide, { template: "photo" }>; index: number; scale: number; src?: string }) {
  const toneOf = (t?: "ivory" | "navy"): Tone => (t ?? "ivory") === "ivory"
    ? { ink: C.ivory, soft: C.ivory, ground: C.richNavy, shadow: "0 1px 12px rgba(16,38,53,0.55)" }
    : { ink: C.deepNavy, soft: C.deepNavy, ground: C.ivory };
  const tone = toneOf(post.photoTone);
  const footTone = toneOf(post.photoFootTone ?? post.photoTone);
  // Each wash is the opposite of the type it sits behind.
  const wash = (t: Tone, a: number) => (t.ink === C.ivory ? `rgba(16,38,53,${a})` : `rgba(252,252,248,${a})`);
  return (
    <SlideWrapper scale={scale} height={LW_H} style={{ background: src ? tone.ground : C.slate }}>
      {src
        ? <>
            <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            {/* A wash behind the type at the top and the footer at the bottom,
                in the opposite tone, so the words read over any photograph. */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${wash(tone, 0.78)} 0%, ${wash(tone, 0.55)} 30%, ${wash(tone, 0)} 58%)` }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${wash(footTone, 0.6)} 0%, ${wash(footTone, 0)} 16%)` }} />
          </>
        :<div style={{ position: "absolute", left: 0, right: 0, bottom: 200, textAlign: "center", ...sans(22), color: C.ivory }}>No photograph yet</div>}
      <Furniture post={post} index={index} tone={src ? tone : { ...IVORY_PAGE, ink: C.ivory, soft: C.ivory }} footTone={src ? footTone : undefined} footerRule={false}>
        <div style={{ paddingTop: 8 }}>
          <div style={{ ...serif(120), lineHeight: 1, letterSpacing: "-0.02em" }}>{slide.fields.headline}</div>
          <div style={{ ...serif(36, true), marginTop: 22 }}>{slide.fields.subline}</div>
        </div>
      </Furniture>
    </SlideWrapper>
  );
}
