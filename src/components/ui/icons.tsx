import type { CSSProperties } from "react";

/** Shared 1.5px line-icon set (DESIGN.md). Every icon takes a `size` (default
 *  16 to match IconButton) and inherits `currentColor`, so a button controls
 *  the icon color via its own text color. Moved out of CampaignEditor so the
 *  whole app draws from one icon vocabulary. */
export type IconProps = { size?: number; strokeWidth?: number; style?: CSSProperties };

const base = (size: number, sw: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: sw,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export const IcAlignLeft = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="14" y2="12" /><line x1="3" y1="18" x2="18" y2="18" /></svg>
);
export const IcAlignCenter = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><line x1="3" y1="6" x2="21" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
);
export const IcCopy = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
export const IcCheck = ({ size = 16, strokeWidth = 2.5, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IcTrash = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /></svg>
);
export const IcBookmarkPlus = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="12" y1="5" x2="12" y2="11" /></svg>
);
export const IcDragHandle = ({ size = 16, style }: IconProps) => (
  <svg {...base(size, 2)} style={style}><circle cx="9" cy="6" r="1.2" fill="currentColor" /><circle cx="15" cy="6" r="1.2" fill="currentColor" /><circle cx="9" cy="12" r="1.2" fill="currentColor" /><circle cx="15" cy="12" r="1.2" fill="currentColor" /><circle cx="9" cy="18" r="1.2" fill="currentColor" /><circle cx="15" cy="18" r="1.2" fill="currentColor" /></svg>
);
/** Chevron — points down by default; rotate via `style` for other directions. */
export const IcChevron = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><polyline points="6 9 12 15 18 9" /></svg>
);
export const IcDownload = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
/** Paper plane — replaces the rocket emoji for "Push / send". */
export const IcSend = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);
export const IcUndo = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></svg>
);
export const IcRedo = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><polyline points="15 14 20 9 15 4" /><path d="M4 20v-7a4 4 0 0 1 4-4h12" /></svg>
);
/** Two-arrow refresh — "Regenerate". */
export const IcRefresh = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
export const IcClose = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IcPlus = ({ size = 16, strokeWidth = 2, style }: IconProps) => (
  <svg {...base(size, strokeWidth)} style={style}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
