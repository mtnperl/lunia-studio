import { Composition, registerRoot } from "remotion";
import { VideoAd } from "./VideoAd";
import { VideoAdCaptions } from "./VideoAdCaptions";
import { CarouselSlide, CarouselSlideProps } from "./CarouselSlide";
import { VideoAdData, VideoCaptionsData } from "@/lib/types";

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

const DEFAULT_CAPTIONS_PROPS: VideoCaptionsData = {
  topic: "Better sleep with magnesium",
  fps: 30,
  durationFrames: 375, // 5 captions * 75 frames
  captions: [
    "Stop telling yourself you're a bad sleeper.",
    "72% of adults wake up exhausted every morning.",
    "Magnesium may be the missing piece in your routine.",
    "Lunia Restore — magnesium, L-theanine, and apigenin.",
    "Try it at lunialife.com. Under $1 per serving.",
  ],
};

// Real saved content slide (carousel "REM REBOUND") so the composition renders
// authentic copy + a relevant graphic, not a placeholder.
const CAROUSEL_SLIDE_SAMPLE: CarouselSlideProps = {
  headline: "THE BRAIN REPAYS REM FIRST",
  body: "After REM deprivation, recovery nights show up to 30% more REM than baseline. The brain treats dream sleep as a debt, not a bonus.",
  citation: "Brunner DP, et al. Effect of partial sleep deprivation on sleep stages. Electroencephalogr Clin Neurophysiol. 1990;75(6):492-499.",
  graphic: JSON.stringify({
    component: "bars",
    data: { items: [{ label: "BASELINE REM", value: "100%" }, { label: "REBOUND NIGHT", value: "130%" }] },
  }),
  slideBgColor: "#01253f",
};

function RemotionRoot() {
  return (
    <>
      <Composition
        id="CarouselSlide"
        component={CarouselSlide}
        durationInFrames={1}
        fps={1}
        width={1080}
        height={1350}
        defaultProps={CAROUSEL_SLIDE_SAMPLE}
      />
      <Composition
        id="VideoAd"
        component={VideoAd}
        durationInFrames={DEFAULT_PROPS.durationFrames}
        fps={DEFAULT_PROPS.fps}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
      />
      <Composition
        id="VideoAdCaptions"
        component={VideoAdCaptions}
        durationInFrames={DEFAULT_CAPTIONS_PROPS.durationFrames}
        fps={DEFAULT_CAPTIONS_PROPS.fps}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_CAPTIONS_PROPS}
      />
    </>
  );
}

registerRoot(RemotionRoot);
