"use client";

import React from "react";
import { StatCallout } from "@/components/carousel/graphics/StatCallout";
import { ComparisonBars } from "@/components/carousel/graphics/ComparisonBars";
import { StepList } from "@/components/carousel/graphics/StepList";
import { DotChainGraphic } from "@/components/carousel/graphics/DotChainGraphic";
import { WaveGraphic } from "@/components/carousel/graphics/WaveGraphic";
import { IconGrid } from "@/components/carousel/graphics/IconGrid";
import { DonutChart } from "@/components/carousel/graphics/DonutChart";
import { VersusCard } from "@/components/carousel/graphics/VersusCard";
import { TimelineGraphic } from "@/components/carousel/graphics/TimelineGraphic";
import { SplitBar } from "@/components/carousel/graphics/SplitBar";
import { ChecklistGraphic } from "@/components/carousel/graphics/ChecklistGraphic";
import { CalloutQuote } from "@/components/carousel/graphics/CalloutQuote";
import { ComparisonTable } from "@/components/carousel/graphics/ComparisonTable";
import { PyramidGraphic } from "@/components/carousel/graphics/PyramidGraphic";
import { RadialProgress } from "@/components/carousel/graphics/RadialProgress";
import { CircleStats } from "@/components/carousel/graphics/CircleStats";
import { SpectrumBar } from "@/components/carousel/graphics/SpectrumBar";
import { FunnelChart } from "@/components/carousel/graphics/FunnelChart";
import { ScoreCard } from "@/components/carousel/graphics/ScoreCard";
import { BubbleCluster } from "@/components/carousel/graphics/BubbleCluster";
import { IconStat } from "@/components/carousel/graphics/IconStat";
import { Matrix2x2 } from "@/components/carousel/graphics/Matrix2x2";
import { StackedBar } from "@/components/carousel/graphics/StackedBar";
import { ProcessFlow } from "@/components/carousel/graphics/ProcessFlow";
import { HeatGrid } from "@/components/carousel/graphics/HeatGrid";
import { VectorIllustration } from "@/components/carousel/graphics/VectorIllustration";
import { HubSpokeGraphic } from "@/components/carousel/graphics/HubSpokeGraphic";
import { IcebergGraphic } from "@/components/carousel/graphics/IcebergGraphic";
import { BridgeGraphic } from "@/components/carousel/graphics/BridgeGraphic";
import { CircularCycleGraphic } from "@/components/carousel/graphics/CircularCycleGraphic";
import { BentoTiles } from "@/components/carousel/graphics/BentoTiles";
import { ConceptFlowGraphic } from "@/components/carousel/graphics/ConceptFlowGraphic";
import { IconGraphic } from "@/components/carousel/graphics/IconGraphic";
import { IconLayout } from "@/components/carousel/graphics/IconLayout";
import type { BrandStyle, GraphicSpec } from "@/lib/types";

// Single source of truth for GraphicSpec.component → React component mapping.
// Used by both ContentSlide and EditorialContentSlide so any new graphic
// component lights up everywhere automatically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GRAPHIC_COMPONENT_MAP: Partial<Record<GraphicSpec["component"], React.FC<any>>> = {
  stat: StatCallout,
  bars: ComparisonBars,
  steps: StepList,
  dotchain: DotChainGraphic,
  wave: WaveGraphic,
  iconGrid: IconGrid,
  donut: DonutChart,
  versus: VersusCard,
  timeline: TimelineGraphic,
  split: SplitBar,
  checklist: ChecklistGraphic,
  callout: CalloutQuote,
  table: ComparisonTable,
  pyramid: PyramidGraphic,
  radial: RadialProgress,
  circleStats: CircleStats,
  spectrum: SpectrumBar,
  funnel: FunnelChart,
  scorecard: ScoreCard,
  bubbles: BubbleCluster,
  iconStat: IconStat,
  matrix2x2: Matrix2x2,
  stackedBar: StackedBar,
  processFlow: ProcessFlow,
  heatGrid: HeatGrid,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vector: VectorIllustration as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hubSpoke: HubSpokeGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iceberg: IcebergGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bridge: BridgeGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  circularCycle: CircularCycleGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bento: BentoTiles as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptFlow: ConceptFlowGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: IconGraphic as React.FC<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  iconLayout: IconLayout as React.FC<any>,
};

export function renderGraphicSpec(spec: GraphicSpec, brandStyle?: BrandStyle): React.ReactNode {
  const GraphicComponent = GRAPHIC_COMPONENT_MAP[spec.component];
  if (!GraphicComponent) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[GraphicSpec] No component registered for key: "${spec.component}"`);
    }
    return null;
  }
  return <GraphicComponent {...(spec.data as object)} brandStyle={brandStyle} />;
}
