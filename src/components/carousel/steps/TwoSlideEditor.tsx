"use client";

// Text editing for the Chartbook and Primer formats. Every field of the
// piece is an input bound to its path in the variant; a change replaces
// the variant and re-runs the lint, so the picker badge and the warnings
// under the fields stay honest. The renderers stay frozen: this edits the
// words and numbers, never the composition.

import { useMemo } from "react";
import { lintChartbook, lintPrimer } from "@/lib/two-slide-lint";
import type { ChartbookContent, PrimerContent } from "@/lib/types";

type Variant = ChartbookContent | PrimerContent;

type Props = {
  format: "chartbook" | "primer";
  variant: Variant;
  onChange: (next: Variant) => void;
};

/** Immutable set at a dotted path ("figure.bars.2.label"). */
function setAt<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const walk = (node: unknown, i: number): unknown => {
    if (i === keys.length) return value;
    const k = keys[i];
    if (Array.isArray(node)) {
      const copy = node.slice();
      copy[Number(k)] = walk(node[Number(k)], i + 1);
      return copy;
    }
    const o = (node ?? {}) as Record<string, unknown>;
    return { ...o, [k]: walk(o[k], i + 1) };
  };
  return walk(obj, 0) as T;
}

function getAt(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((n, k) => (n == null ? undefined : (n as Record<string, unknown>)[k]), obj);
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 } as const;
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", color: "var(--text)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6 } as const;
const groupStyle = { border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", background: "var(--surface)", display: "flex", flexDirection: "column", gap: 10 } as const;

export default function TwoSlideEditor({ format, variant, onChange }: Props) {
  const violations = useMemo(() => {
    const r = format === "chartbook" ? lintChartbook(variant as ChartbookContent) : lintPrimer(variant as PrimerContent);
    return r.violations;
  }, [format, variant]);

  function set(path: string, value: unknown) {
    const next = setAt(variant, path, value);
    const r = format === "chartbook" ? lintChartbook(next as ChartbookContent) : lintPrimer(next as PrimerContent);
    onChange({ ...next, violations: r.ok ? undefined : r.violations } as Variant);
  }

  const text = (path: string, label: string, opts: { rows?: number; number?: boolean; hint?: string } = {}) => {
    const raw = getAt(variant, path);
    const value = raw == null ? "" : String(raw);
    const common = {
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = e.target.value;
        set(path, opts.number ? (v.trim() === "" ? 0 : Number(v)) : v);
      },
      style: opts.rows ? { ...inputStyle, resize: "vertical" as const } : inputStyle,
      "aria-label": label,
    };
    return (
      <div key={path}>
        <label style={labelStyle}>{label}{opts.hint ? <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>{opts.hint}</span> : null}</label>
        {opts.rows ? <textarea rows={opts.rows} {...common} /> : <input type={opts.number ? "number" : "text"} step={opts.number ? "any" : undefined} {...common} />}
      </div>
    );
  };

  /** A list field edited as one comma-separated line (underline words). */
  const list = (path: string, label: string, hint: string) => {
    const raw = (getAt(variant, path) as string[] | undefined) ?? [];
    return (
      <div key={path}>
        <label style={labelStyle}>{label}<span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, marginLeft: 6 }}>{hint}</span></label>
        <input type="text" value={raw.join(", ")} aria-label={label} style={inputStyle}
          onChange={(e) => set(path, e.target.value.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2))} />
      </div>
    );
  };

  const grid = (children: React.ReactNode, cols = 2) => (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 10 }}>{children}</div>
  );

  let cover: React.ReactNode;
  let body: React.ReactNode;

  if (format === "chartbook") {
    const c = variant as ChartbookContent;
    cover = (
      <div style={groupStyle}>
        <div style={labelStyle}>Cover</div>
        {text("cover.question", "Question", { hint: "sentence case, at most 60 characters" })}
        {grid(<>{text("cover.kicker", "Kicker")}{list("cover.underline", "Pen under", "one or two words of the question, comma separated")}</>)}
      </div>
    );
    const f = c.figure;
    const header = (
      <>
        <div style={labelStyle}>Figure · {f.layout.replace("-", " ")}</div>
        {grid(<>{text("figure.title", "Title", { hint: "at most 34 characters" })}{"unit" in f ? text("figure.unit", "Unit line") : text("figure.kicker", "Kicker")}</>)}
      </>
    );
    const bars = (path: string, items: { label: string; value: number; display: string }[]) => items.map((_, i) => grid(
      <>
        {text(`${path}.${i}.label`, `Bar ${i + 1} label`)}
        {text(`${path}.${i}.value`, "Value", { number: true })}
        {text(`${path}.${i}.display`, "Shown as", { hint: "as the source reports it" })}
      </>, 3));
    body = (
      <div style={groupStyle}>
        {header}
        {f.layout === "pill-bars" && bars("figure.bars", f.bars)}
        {f.layout === "ranked" && bars("figure.items", f.items)}
        {f.layout === "versus-bars" && (
          <>
            {grid(<>{text("figure.series.0", "First series")}{text("figure.series.1", "Second series")}</>)}
            {f.groups.map((_, i) => grid(
              <>
                {text(`figure.groups.${i}.label`, `Group ${i + 1}`)}
                {text(`figure.groups.${i}.values.0`, "First value", { number: true })}
                {text(`figure.groups.${i}.displays.0`, "Shown as")}
                {text(`figure.groups.${i}.values.1`, "Second value", { number: true })}
                {text(`figure.groups.${i}.displays.1`, "Shown as")}
              </>, 5))}
          </>
        )}
        {f.layout === "object-pair" && f.pair.map((_, i) => grid(
          <>
            {text(`figure.pair.${i}.label`, `Object ${i + 1}`)}
            {text(`figure.pair.${i}.figure`, "Figure")}
            {text(`figure.pair.${i}.note`, "Note")}
          </>, 3))}
        {f.layout === "claim-check" && (
          <>
            {text("figure.quote", "The claim", { hint: "quoted on the slide" })}
            {grid(<>
              {text("figure.small.label", "Small bar label")}{text("figure.small.value", "Value", { number: true })}{text("figure.small.display", "Shown as")}
              {text("figure.large.label", "Large bar label")}{text("figure.large.value", "Value", { number: true })}{text("figure.large.display", "Shown as")}
            </>, 3)}
            {text("figure.annotation", "Note by the arrow")}
          </>
        )}
        {text("figure.source.citation", "Source", { hint: "a real, published source" })}
      </div>
    );
  } else {
    const p = variant as PrimerContent;
    cover = (
      <div style={groupStyle}>
        <div style={labelStyle}>Cover</div>
        {text("cover.title", "Title", { hint: p.slide.layout === "rows" ? "the row count is drawn beside it" : "sentence case, at most 40 characters" })}
        {grid(<>{text("cover.kicker", "Kicker")}{list("cover.underline", "Pen under", "one or two words of the title, comma separated")}</>)}
      </div>
    );
    const s = p.slide;
    body = (
      <div style={groupStyle}>
        <div style={labelStyle}>Slide · {s.layout}</div>
        {"kicker" in s ? grid(<>{text("slide.title", "Title", { hint: "at most 30 characters" })}{text("slide.kicker", "Kicker")}</>) : text("slide.title", "Title", { hint: "at most 30 characters" })}
        {s.layout === "rows" && s.rows.map((_, i) => grid(
          <>
            {text(`slide.rows.${i}.term`, `Row ${i + 1} term`)}
            {text(`slide.rows.${i}.definition`, "Definition", { hint: "term plus definition under 52 characters" })}
            {text(`slide.rows.${i}.key`, "Swiped phrase", { hint: "copied from the definition" })}
          </>, 3))}
        {s.layout === "definition" && (
          <>
            {grid(<>{text("slide.term", "Term")}{text("slide.definition", "Definition", { hint: "under 110 characters" })}</>)}
            {grid(<>{text("slide.formula.left", "Formula name")}{text("slide.formula.numerator", "Over")}{text("slide.formula.denominator", "Under")}{text("slide.formula.factor", "Factor", { hint: "optional, e.g. × 100" })}</>, 4)}
            {grid(<>{text("slide.threshold.label", "Threshold label")}{text("slide.threshold.value", "Threshold value", { hint: "swiped" })}{text("slide.example.label", "Example label")}{text("slide.example.value", "Example value")}</>, 4)}
          </>
        )}
        {s.layout === "versus" && s.columns.map((col, ci) => (
          <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {text(`slide.columns.${ci}.name`, `Column ${ci + 1} name`)}
            {grid(<>{col.rows.map((_, ri) => text(`slide.columns.${ci}.rows.${ri}`, `Best for ${ri + 1}`, { hint: ri === 0 ? "swiped" : undefined }))}</>, 2)}
            {text(`slide.columns.${ci}.footnote`, "Footnote")}
          </div>
        ))}
        {s.layout === "creed" && (
          <>
            {s.lines.map((_, i) => grid(<>{text(`slide.lines.${i}.condition`, `Line ${i + 1}: without`)}{text(`slide.lines.${i}.consequence`, "no")}</>))}
            {text("slide.closing", "Closing line")}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {cover}
      {body}
      <div style={groupStyle}>
        {text("caption", "Caption", { rows: 5 })}
      </div>
      {violations.length > 0 && (
        <div style={{ fontSize: 12, color: "#b85c5c", background: "rgba(184,92,92,0.08)", border: "1px solid rgba(184,92,92,0.25)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>The lint would send this back to the writer:</div>
          {violations.map((v, i) => <div key={i}>• {v}</div>)}
        </div>
      )}
    </div>
  );
}
