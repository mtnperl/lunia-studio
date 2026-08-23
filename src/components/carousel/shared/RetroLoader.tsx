"use client";
import { useEffect, useState } from "react";

/**
 * Progress surfaces for image generation.
 *
 * These were a black CRT terminal — scanline overlay, `◆ LUNIA.EXE`, a
 * block-character progress bar in Courier, a blinking cursor and an
 * `EXIT CODE: 1` error screen. Charming in isolation and completely foreign to
 * a spec whose stated goal is "this feels expensive". DESIGN.md already
 * sanctions a shimmer for exactly this moment, so that is what it uses now.
 *
 * The export names are kept so callers across the batch, video and carousel
 * views don't all have to change in one go; the surface itself no longer
 * pretends to be a 1983 render farm.
 */

type LoaderItem = { label: string; done: boolean; error: string | null };

/** Sweeping highlight over a neutral base. No colour, no bounce. */
const shimmer: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--surface) 0%, var(--surface-h) 50%, var(--surface) 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.6s ease-in-out infinite",
};

function Elapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
      {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
    </span>
  );
}

const shellStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--surface)",
  borderRadius: "var(--r-lg)",
  padding: "28px 30px",
  maxWidth: 560,
  margin: "48px auto",
  fontFamily: "var(--font-ui)",
  color: "var(--text)",
};

const metaStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--subtle)",
};

export function RetroImageLoader({
  items,
  modelLabel = "fal-ai/recraft-v3",
}: {
  items: LoaderItem[];
  modelLabel?: string;
}) {
  const total = items.length;
  const loaded = items.filter((it) => it.done).length;

  return (
    <div style={shellStyle} aria-live="polite">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
        <h2 className="display display-md" style={{ margin: 0 }}>Rendering your slides</h2>
        <span style={metaStyle}><Elapsed /></span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {items.map((item, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                aria-hidden
                style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: item.error ? "var(--error)" : item.done ? "var(--success)" : "var(--accent)",
                  animation: item.done || item.error ? "none" : "pulse 1s ease-in-out infinite",
                }}
              />
              <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{item.label}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {item.error ? "Failed" : item.done ? "Done" : "Working"}
              </span>
            </div>
            {!item.done && !item.error && (
              <div style={{ ...shimmer, height: 3, borderRadius: 2, marginTop: 8, marginLeft: 19 }} />
            )}
            {item.error && (
              <div style={{ marginLeft: 19, marginTop: 6, fontSize: 12.5, color: "var(--error)", lineHeight: 1.5 }}>
                {item.error}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ ...metaStyle, display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <span>{loaded} of {total} complete</span>
        <span>{modelLabel}</span>
      </div>
    </div>
  );
}

export function RetroImageError({
  items,
  onRetry,
  modelLabel = "fal-ai/recraft-v3",
}: {
  items: LoaderItem[];
  onRetry: () => void;
  modelLabel?: string;
}) {
  const errored = items.filter((it) => !!it.error);
  // A refusal and an outage need different words and different advice. Telling
  // someone to check their API key when the engine declined the picture sends
  // them to the one place that cannot help.
  const declined = errored.some((it) => /declined this concept|content grounds/i.test(it.error ?? ""));
  return (
    <div style={{ ...shellStyle, borderColor: "var(--error)" }} role="alert">
      <h2 className="display display-md" style={{ margin: "0 0 8px" }}>
        {declined ? "The image engine declined this one" : "The images didn't render"}
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55 }}>
        {declined
          ? "Your copy is safe. Sleep imagery trips content filters more often than you would expect, and a fresh concept usually passes."
          : "Your copy is safe — only the backgrounds failed. Retrying usually clears it."}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 16, marginBottom: 20 }}>
        {errored.map((item, i) => (
          <div key={i}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</div>
            <div style={{ fontSize: 12.5, color: "var(--error)", marginTop: 3, lineHeight: 1.5 }}>{item.error}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="ui-btn ui-btn-primary" onClick={onRetry}>Try again</button>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {declined
            ? "The server already retried once without the written concept. Editing the prompt in Refine image is the next step."
            : `If it keeps failing, check the ${modelLabel} key and rate limits.`}
        </span>
      </div>
    </div>
  );
}

/** Compact variant for a card in the batch and video grids. */
export function MiniRetroLoader({ label = "Hook slide" }: { label?: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        background: "var(--surface)",
        padding: "14px 16px",
        fontFamily: "var(--font-ui)",
      }}
      aria-live="polite"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          aria-hidden
          style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: "var(--accent)", animation: "pulse 1s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 13, color: "var(--text)", minWidth: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={label}
        >
          {label}
        </span>
      </div>
      <div style={{ ...shimmer, height: 3, borderRadius: 2 }} />
    </div>
  );
}
