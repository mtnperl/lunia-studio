"use client";
import { Editable } from "./Shell";
import type { MockSlide } from "./mock-data";

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

/* Content palette only. Nothing from --ui-* is allowed inside this file. */
const C = {
  navy: "var(--lunia-rich-navy)",
  deep: "var(--lunia-deep-navy)",
  slate: "var(--lunia-slate-blue)",
  ivory: "var(--lunia-soft-ivory)",
  aqua: "var(--lunia-aqua)",
  yellow: "var(--lunia-signal-yellow)",
  font: "var(--lunia-font)",
};

export type SlideElement = "eyebrow" | "headline" | "body" | "bullets" | "citation" | "graphic" | "image";

/** One slide at true 1080 by 1350. Scale it with a CSS transform. When
 *  `editable`, every text run is a contentEditable region and the selected
 *  one gets the chrome selection outline; the outline is the only chrome
 *  colour allowed on top of the artwork, and it is not exported. */
export function SlideCanvas({ slide, editable = false, selected, onSelect, onChange, showArrows = true, showNumber, index, total, logoScale = 1 }: {
  slide: MockSlide;
  editable?: boolean;
  selected?: SlideElement | null;
  onSelect?: (el: SlideElement) => void;
  onChange?: (patch: Partial<MockSlide>) => void;
  showArrows?: boolean;
  showNumber?: boolean;
  index?: number;
  total?: number;
  logoScale?: number;
}) {
  const dark = slide.kind === "takeaway" || slide.dark;
  const ink = dark ? C.ivory : C.deep;
  const sub = dark ? "rgba(247,244,239,0.72)" : C.slate;
  const bg = dark ? C.navy : C.ivory;
  const cls = (el: SlideElement) => (editable ? `sel-hover${selected === el ? " sel-outline" : ""}` : undefined);
  const pick = (el: SlideElement) => () => onSelect?.(el);
  const text = (el: SlideElement, value: string, style: React.CSSProperties, as: "div" | "h1" | "p" = "div", multiline = false) =>
    editable ? (
      <Editable as={as} value={value} multiline={multiline} className={cls(el)} style={style} onFocus={pick(el)} onChange={(v) => onChange?.({ [el]: v } as Partial<MockSlide>)} placeholder={el} />
    ) : (
      <div style={style}>{value}</div>
    );

  const arrows = showArrows && slide.kind !== "takeaway" && (
    <div aria-hidden="true" style={{ position: "absolute", top: 84, right: 84, display: "flex", gap: 10, color: ink }}>
      {[0, 1, 2].map((i) => <svg key={i} width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3l12 9-12 9z" /></svg>)}
    </div>
  );
  const logo = (
    <div aria-hidden="true" style={{ position: "absolute", top: 84, left: 84, display: "flex", alignItems: "center", gap: 14, color: ink, transform: `scale(${logoScale})`, transformOrigin: "top left" }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="currentColor"><circle cx="20" cy="8" r="3" /><circle cx="8" cy="20" r="3" /><circle cx="32" cy="20" r="3" /><circle cx="20" cy="32" r="3" /><circle cx="20" cy="20" r="4" /></svg>
      <span style={{ fontFamily: C.font, fontWeight: 600, fontSize: 30, letterSpacing: "0.22em" }}>LUNIA LIFE</span>
    </div>
  );
  const number = showNumber && index !== undefined && total !== undefined && (
    <div aria-hidden="true" style={{ position: "absolute", bottom: 72, right: 84, fontFamily: C.font, fontSize: 22, letterSpacing: "0.1em", color: sub }}>{index + 1} / {total}</div>
  );

  if (slide.kind === "hook") {
    return (
      <div style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: C.ivory, fontFamily: C.font }}>
        <div className={cls("image")} onClick={editable ? pick("image") : undefined} style={{ position: "absolute", inset: 0 }}>
          {slide.imageUrl && <img src={slide.imageUrl} alt="" style={{ width: "100%", height: "58%", objectFit: "cover", display: "block" }} />}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", background: `linear-gradient(to bottom, rgba(247,244,239,0) 0%, ${C.ivory} 30%)` }} />
        </div>
        {arrows}
        <div style={{ position: "absolute", left: 84, right: 84, bottom: 100, color: C.deep }}>
          {text("eyebrow", slide.eyebrow ?? "", { fontSize: 24, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 400, marginBottom: 22, color: C.slate })}
          {text("headline", slide.headline, { fontSize: 104, lineHeight: 1.02, fontWeight: 300, letterSpacing: "-0.02em", textTransform: "uppercase" }, "h1")}
          {text("body", slide.body ?? "", { fontSize: 34, fontWeight: 300, marginTop: 28, color: C.slate })}
        </div>
      </div>
    );
  }

  if (slide.kind === "takeaway") {
    return (
      <div style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: bg, color: ink, fontFamily: C.font, padding: "84px 84px 72px" }}>
        {logo}
        <div style={{ position: "absolute", left: 84, right: 84, top: 300 }}>
          {text("eyebrow", slide.eyebrow ?? "", { fontSize: 24, letterSpacing: "0.28em", textTransform: "uppercase", marginBottom: 28, color: C.aqua })}
          {text("headline", slide.headline, { fontSize: 76, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 56 }, "h1")}
          <ol className={cls("bullets")} onClick={editable ? pick("bullets") : undefined} style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 34 }}>
            {(slide.bullets ?? []).map((b, i) => (
              <li key={i} style={{ display: "flex", gap: 28, alignItems: "flex-start", fontSize: 36, fontWeight: 300, lineHeight: 1.3 }}>
                <span style={{ width: 56, height: 56, borderRadius: "50%", background: C.aqua, color: C.navy, display: "grid", placeItems: "center", fontSize: 28, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                <span>{b}</span>
              </li>
            ))}
          </ol>
          {text("body", slide.body ?? "", { fontSize: 30, fontWeight: 300, marginTop: 64, color: sub, borderTop: `2px solid ${C.aqua}`, paddingTop: 32 }, "p", true)}
        </div>
        {number}
      </div>
    );
  }

  // content slide
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: "relative", overflow: "hidden", background: bg, color: ink, fontFamily: C.font }}>
      {logo}
      {arrows}
      <div style={{ position: "absolute", left: 84, right: 84, top: 236 }}>
        {text("headline", slide.headline, { fontSize: 78, lineHeight: 1.06, fontWeight: 400, letterSpacing: "-0.015em", textTransform: "uppercase" }, "h1")}
        <div aria-hidden="true" style={{ width: 96, height: 3, background: C.deep, margin: "40px 0" }} />
        {text("body", slide.body ?? "", { fontSize: 36, lineHeight: 1.42, fontWeight: 300, color: C.deep }, "p", true)}
        <div className={cls("graphic")} onClick={editable ? pick("graphic") : undefined} style={{ marginTop: 56 }}>
          <Graphic slide={slide} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 84, right: 84, bottom: 72 }}>
        {text("citation", slide.citation ?? "", { fontSize: 22, lineHeight: 1.4, fontWeight: 300, color: sub, borderTop: `1px solid ${C.slate}`, paddingTop: 20 }, "p", true)}
      </div>
      {number}
    </div>
  );
}

function Graphic({ slide }: { slide: MockSlide }) {
  const g = slide.graphic ?? "none";
  if (g === "stat") {
    return (
      <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
        <span style={{ fontSize: 168, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: C.deep }}>&lt;1%</span>
        <span style={{ fontSize: 28, letterSpacing: "0.2em", textTransform: "uppercase", color: C.slate }}>crosses the barrier</span>
      </div>
    );
  }
  if (g === "list") {
    return (
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px" }}>
        {(slide.bullets ?? []).map((b, i) => (
          <li key={i} style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 30, fontWeight: 300 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: C.deep, flexShrink: 0 }} />{b}
          </li>
        ))}
      </ul>
    );
  }
  if (g === "timeline") {
    const steps = ["Glutamate", "Gut bacteria + B6", "GABA", "Vagus nerve"];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: 190 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", border: `3px solid ${C.deep}`, background: i === 2 ? C.deep : "transparent" }} />
              <span style={{ fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center", color: C.slate }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 3, background: C.slate, marginTop: -44 }} />}
          </div>
        ))}
      </div>
    );
  }
  return null;
}
