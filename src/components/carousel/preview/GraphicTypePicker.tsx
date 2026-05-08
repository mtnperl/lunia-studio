"use client";
import { useState } from "react";
import type { BrandStyle } from "@/lib/types";
import { GRAPHIC_TYPES, getGraphicsByTier, TIER_LABELS, TIER_HINTS, type GraphicTypeMeta } from "@/lib/graphic-types";

// Reuse the same graphic components ContentSlide uses
import { StatCallout } from "@/components/carousel/graphics/StatCallout";
import { ComparisonBars } from "@/components/carousel/graphics/ComparisonBars";
import { StepList } from "@/components/carousel/graphics/StepList";
import { DotChainGraphic } from "@/components/carousel/graphics/DotChainGraphic";
import { WaveGraphic } from "@/components/carousel/graphics/WaveGraphic";
import { IconGrid } from "@/components/carousel/graphics/IconGrid";
import { HubSpokeGraphic } from "@/components/carousel/graphics/HubSpokeGraphic";
import { IcebergGraphic } from "@/components/carousel/graphics/IcebergGraphic";
import { BridgeGraphic } from "@/components/carousel/graphics/BridgeGraphic";
import { CircularCycleGraphic } from "@/components/carousel/graphics/CircularCycleGraphic";
import { BentoTiles } from "@/components/carousel/graphics/BentoTiles";
import { ConceptFlowGraphic } from "@/components/carousel/graphics/ConceptFlowGraphic";
import { VectorIllustration } from "@/components/carousel/graphics/VectorIllustration";
import { DonutChart } from "@/components/carousel/graphics/DonutChart";
import VersusCard from "@/components/carousel/graphics/VersusCard";
import TimelineGraphic from "@/components/carousel/graphics/TimelineGraphic";
import SplitBar from "@/components/carousel/graphics/SplitBar";
import ChecklistGraphic from "@/components/carousel/graphics/ChecklistGraphic";
import CalloutQuote from "@/components/carousel/graphics/CalloutQuote";
import ComparisonTable from "@/components/carousel/graphics/ComparisonTable";
import PyramidGraphic from "@/components/carousel/graphics/PyramidGraphic";
import RadialProgress from "@/components/carousel/graphics/RadialProgress";
import CircleStats from "@/components/carousel/graphics/CircleStats";
import SpectrumBar from "@/components/carousel/graphics/SpectrumBar";
import FunnelChart from "@/components/carousel/graphics/FunnelChart";
import ScoreCard from "@/components/carousel/graphics/ScoreCard";
import BubbleCluster from "@/components/carousel/graphics/BubbleCluster";
import IconStat from "@/components/carousel/graphics/IconStat";
import Matrix2x2 from "@/components/carousel/graphics/Matrix2x2";
import StackedBar from "@/components/carousel/graphics/StackedBar";
import ProcessFlow from "@/components/carousel/graphics/ProcessFlow";
import HeatGrid from "@/components/carousel/graphics/HeatGrid";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENT_MAP: Record<string, React.FC<any>> = {
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
  vector: VectorIllustration,
  hubSpoke: HubSpokeGraphic,
  iceberg: IcebergGraphic,
  bridge: BridgeGraphic,
  circularCycle: CircularCycleGraphic,
  bento: BentoTiles,
  conceptFlow: ConceptFlowGraphic,
};

type Props = {
  currentComponent?: string;
  brandStyle?: BrandStyle;
  busy?: boolean;
  onPick: (componentKey: string) => void;
  onClose: () => void;
};

const THUMB_W = 160;
const THUMB_H = 200;
// Render the actual component in a much larger viewport, then scale down.
// This keeps text/labels readable in the thumbnail.
const RENDER_W = 540;
const RENDER_H = 680;
const SCALE = THUMB_W / RENDER_W;

export default function GraphicTypePicker({ currentComponent, brandStyle, busy = false, onPick, onClose }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const tiers: ("A" | "B" | "C")[] = ["A", "B", "C"];

  return (
    <div style={{
      marginTop: 8,
      border: "1px solid var(--accent-mid)",
      borderRadius: 8,
      overflow: "hidden",
      background: "var(--surface)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: "var(--accent-dim)",
        borderBottom: "1px solid var(--accent-mid)",
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Pick graphic type
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Click a thumbnail to lock that component on this slide. Claude will fill the data from your slide content.
          </div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 14, color: "var(--muted)", cursor: "pointer", lineHeight: 1, padding: "4px 6px" }}>✕</button>
      </div>

      {/* Tier sections */}
      <div style={{ padding: "12px 14px", display: "grid", gap: 18 }}>
        {tiers.map((tier) => (
          <TierSection
            key={tier}
            tier={tier}
            items={getGraphicsByTier(tier)}
            currentComponent={currentComponent}
            brandStyle={brandStyle}
            busy={busy}
            hover={hover}
            setHover={setHover}
            onPick={onPick}
          />
        ))}
      </div>
    </div>
  );
}

function TierSection({
  tier, items, currentComponent, brandStyle, busy, hover, setHover, onPick,
}: {
  tier: "A" | "B" | "C";
  items: GraphicTypeMeta[];
  currentComponent?: string;
  brandStyle?: BrandStyle;
  busy: boolean;
  hover: string | null;
  setHover: (s: string | null) => void;
  onPick: (k: string) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Tier {tier} — {TIER_LABELS[tier]}
        </span>
        <span style={{ fontSize: 10, color: "var(--subtle)" }}>{TIER_HINTS[tier]}</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, ${THUMB_W}px)`,
        gap: 10,
      }}>
        {items.map((meta) => (
          <GraphicThumbnail
            key={meta.key}
            meta={meta}
            isCurrent={meta.key === currentComponent}
            isHover={hover === meta.key}
            brandStyle={brandStyle}
            disabled={busy}
            onMouseEnter={() => setHover(meta.key)}
            onMouseLeave={() => setHover(null)}
            onPick={() => !busy && onPick(meta.key)}
          />
        ))}
      </div>
    </div>
  );
}

function GraphicThumbnail({ meta, isCurrent, isHover, brandStyle, disabled, onMouseEnter, onMouseLeave, onPick }: {
  meta: GraphicTypeMeta;
  isCurrent: boolean;
  isHover: boolean;
  brandStyle?: BrandStyle;
  disabled: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPick: () => void;
}) {
  const Component = COMPONENT_MAP[meta.key];
  return (
    <button
      onClick={onPick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      title={`${meta.label} — ${meta.description}`}
      style={{
        position: "relative",
        width: THUMB_W,
        background: "var(--bg)",
        border: `1.5px solid ${isCurrent ? "var(--accent)" : isHover ? "var(--accent-mid)" : "var(--border)"}`,
        borderRadius: 6,
        padding: 0,
        overflow: "hidden",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "border-color 0.12s, transform 0.12s",
        transform: isHover && !disabled ? "translateY(-1px)" : "none",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Thumbnail viewport */}
      <div style={{
        width: THUMB_W,
        height: THUMB_H - 50,
        position: "relative",
        overflow: "hidden",
        background: brandStyle?.background ?? "#f0ece6",
      }}>
        <div style={{
          width: RENDER_W,
          height: RENDER_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}>
          {Component ? <Component brandStyle={brandStyle} /> : <div style={{ padding: 20, color: "#999" }}>preview unavailable</div>}
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: "6px 8px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.02em" }}>
          {meta.label}
        </div>
        <div style={{ fontSize: 9, color: "var(--subtle)", marginTop: 1, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {meta.description}
        </div>
      </div>

      {isCurrent && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "var(--accent)", color: "#fff",
          fontSize: 9, fontWeight: 700,
          padding: "2px 6px", borderRadius: 3,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Current</div>
      )}
    </button>
  );
}
