// Layered overlays applied on top of the hook image (v2 builder).
// Each overlay is independent — toggle, recolor, or adjust opacity per
// overlay via the controls in PreviewStep.

export type HookOverlaySettings = {
  frame: { enabled: boolean; color: string; opacity: number; inset: number };
  vignette: { enabled: boolean; intensity: number };
  colorGrade: { enabled: boolean; intensity: number };
  grain: { enabled: boolean; opacity: number };
};

export const DEFAULT_HOOK_OVERLAYS: HookOverlaySettings = {
  frame:      { enabled: true, color: "#c8dde8", opacity: 0.55, inset: 30 },
  vignette:   { enabled: true, intensity: 0.30 },
  colorGrade: { enabled: true, intensity: 1.0 },
  grain:      { enabled: true, opacity: 0.06 },
};

// ─── Editorial frame ──────────────────────────────────────────────────────────
// Thin inset border — gives the image a "magazine plate" feel.
export function FrameOverlay({ color, opacity, inset }: { color: string; opacity: number; inset: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: inset, left: inset, right: inset, bottom: inset,
        border: `1.5px solid ${color}`,
        opacity,
        pointerEvents: "none",
        borderRadius: 2,
      }}
    />
  );
}

// ─── Soft vignette ────────────────────────────────────────────────────────────
// Radial darkening at corners; intensity 0–1.
export function VignetteOverlay({ intensity }: { intensity: number }) {
  const a = Math.max(0, Math.min(1, intensity));
  return (
    <div
      style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${a}) 100%)`,
      }}
    />
  );
}

// ─── Color grade ──────────────────────────────────────────────────────────────
// CSS filter pass — applied to the IMAGE itself, not as an overlay layer.
// Returns the filter string for the consumer to apply.
export function buildColorGradeFilter(intensity: number): string {
  const i = Math.max(0, Math.min(2, intensity));
  if (i === 0) return "none";
  const contrast = 1 + 0.08 * i;
  const saturate = 1 - 0.08 * i;
  const sepia = 0.05 * i;
  return `contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)}) sepia(${sepia.toFixed(3)})`;
}

// ─── Film grain ───────────────────────────────────────────────────────────────
// SVG turbulence pattern, sized to fill the slide. Opacity 0–0.2 typically.
export function GrainOverlay({ opacity }: { opacity: number }) {
  const a = Math.max(0, Math.min(0.3, opacity));
  // Inline SVG noise via feTurbulence — cheap, looks great at low opacity.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter>
    <rect width='100%' height='100%' filter='url(%23n)'/>
  </svg>`;
  const dataUri = `url("data:image/svg+xml;charset=utf-8,${svg.replace(/\n\s*/g, "").replace(/#/g, "%23")}")`;
  return (
    <div
      style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: dataUri,
        backgroundSize: "400px 400px",
        opacity: a,
        mixBlendMode: "overlay",
      }}
    />
  );
}
