"use client";

import { Series, AbsoluteFill } from "remotion";
import { VideoAdData, VideoAdSceneType } from "@/lib/types";
import { HookScene } from "./scenes/HookScene";
import { ScienceScene } from "./scenes/ScienceScene";
import { ProductScene } from "./scenes/ProductScene";
import { ProofScene } from "./scenes/ProofScene";
import { CTAScene } from "./scenes/CTAScene";

export function VideoAd(props: VideoAdData) {
  const { scenes, sceneImages } = props;

  function renderScene(type: VideoAdSceneType, idx: number) {
    const scene = scenes.find((s) => s.type === type) ?? scenes[idx];
    if (!scene) return null;
    const image = sceneImages?.[type];
    switch (type) {
      case "hook":    return <HookScene scene={scene} image={image} />;
      case "science": return <ScienceScene scene={scene} image={image} />;
      case "product": return <ProductScene scene={scene} image={image} />;
      case "proof":   return <ProofScene scene={scene} image={image} />;
      case "cta":     return <CTAScene scene={scene} image={image} />;
    }
  }

  const ORDER: VideoAdSceneType[] = ["hook", "science", "product", "proof", "cta"];

  return (
    <AbsoluteFill>
      <Series>
        {ORDER.map((type, idx) => {
          const scene = scenes.find((s) => s.type === type) ?? scenes[idx];
          if (!scene) return null;
          return (
            <Series.Sequence key={type} durationInFrames={scene.durationFrames}>
              {renderScene(type, idx)}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
}
