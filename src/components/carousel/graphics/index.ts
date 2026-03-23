// Component registry — single source of truth for all curated graphic components.
// When adding a new component type: also update src/lib/types.ts (Zod schema),
// src/lib/carousel-prompts.ts (component list Claude sees), and
// GRAPHIC_COMPONENT_MAP in ContentSlide.tsx.

export { StatCallout } from './StatCallout';
export { ComparisonBars } from './ComparisonBars';
export { StepList } from './StepList';
export { DotChainGraphic } from './DotChainGraphic';
export { WaveGraphic } from './WaveGraphic';
export { IconGrid } from './IconGrid';
export { GraphicErrorBoundary } from './GraphicErrorBoundary';
