"use client";
import type { AssetMetadata } from "@/lib/types";
import PhotoLibrary from "./PhotoLibrary";

export default function AssetPicker(props: {
  selectedId?: string;
  onPick: (asset: AssetMetadata) => void;
  onClose: () => void;
}) {
  return <PhotoLibrary {...props} />;
}
