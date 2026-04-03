"use client";

import { Composition } from "remotion";
import { VideoAd } from "./VideoAd";
import { VideoAdData } from "@/lib/types";

const DEFAULT_PROPS: VideoAdData = {
  topic: "Better sleep with magnesium",
  fps: 30,
  durationFrames: 750,
  sceneImages: {},
  fontScale: 1,
  scenes: [
    { type: "hook",    durationFrames: 90,  headline: "You're not broken. Your sleep is.", subline: "Most people never fix the root cause." },
    { type: "science", durationFrames: 150, headline: "Magnesium helps promote deep sleep.", subline: "Low magnesium is linked to poor sleep quality.", stat: "68%", caption: "Journal of Sleep Research, 2022" },
    { type: "product", durationFrames: 150, headline: "Lunia Restore may support your sleep.", subline: "Magnesium bisglycinate, L-theanine, apigenin. No melatonin." },
    { type: "proof",   durationFrames: 150, headline: "Trusted by sleep-focused people.", stat: "78,000+", caption: "customers trust Lunia Life" },
    { type: "cta",     durationFrames: 210, headline: "Try Lunia tonight.", subline: "Under $1/serving. Free shipping on your first order." },
  ],
};

export function RemotionRoot() {
  return (
    <Composition
      id="VideoAd"
      component={VideoAd}
      durationInFrames={DEFAULT_PROPS.durationFrames}
      fps={DEFAULT_PROPS.fps}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS}
    />
  );
}
