"use client";
import type { AssetMetadata } from "@/lib/types";
import PhotoLibrary from "./PhotoLibrary";

export default function AssetBrowser({ target, ...props }: {
  selectedId?: string;
  currentUrl?: string;
  copy?: string;
  onPick: (asset: AssetMetadata) => void;
  target?: string;
  columns?: number;
}) {
  return <div className="assets">
    {target && <div className="assets__target">{target}</div>}
    <PhotoLibrary {...props} />
  </div>;
}
