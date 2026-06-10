import LuniaLogo from "@/components/carousel/shared/LuniaLogo";
import SlideWrapper from "@/components/carousel/shared/SlideWrapper";
import ArrowIcons from "@/components/carousel/shared/ArrowIcons";
import { BrandStyle } from "@/lib/types";
import { isDarkColor, INK_LIGHT, INK_DARK } from "@/lib/color";

type Interaction = { type: "save" | "send" | "comment"; label: string };

type Props = {
  headline: string;
  points: string[];
  interaction: Interaction;
  scale?: number;
  id?: string;
  brandStyle?: BrandStyle;
  backgroundImage?: string | null;  // fal.ai generated background
  shimmer?: boolean;                // show shimmer while loading
  logoScale?: number;
  arrowScale?: number;
  darkBackground?: boolean;         // match hook slide dark background
  /** Override the slide background with any color. Auto-derives ink from luminance. */
  slideBgColor?: string;
  showLuniaLifeWatermark?: boolean;
  prominentWatermark?: boolean;
  reels?: boolean;                  // 9:16 Reels format (1920px height)
  stylePreset?: "default" | "editorial-scientific";
  showSlideArrows?: boolean;
};

// Stroke-only glyphs for the interaction ask. 24x24 viewBox, inherits stroke.
const INTERACTION_GLYPH: Record<Interaction["type"], string> = {
  save: "M6 3h12v18l-6-4-6 4z",                                     // bookmark
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4z",                          // paper plane
  comment: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", // speech bubble
};

const INTERACTION_VERB: Record<Interaction["type"], string> = {
  save: "SAVE",
  send: "SEND",
  comment: "COMMENT",
};

export default function TakeawaySlide({
  headline, points, interaction, scale = 1, id, brandStyle, backgroundImage, shimmer = false,
  logoScale = 1, arrowScale = 1, darkBackground = false, slideBgColor,
  showLuniaLifeWatermark = false, prominentWatermark = false, reels = false,
  stylePreset = "default", showSlideArrows = true,
}: Props) {
  const isEditorial = stylePreset === "editorial-scientific";
  const slideH = reels ? 1920 : 1350;
  const contentTop = reels ? 200 : 110;

  // Background + ink resolution mirrors CTASlide so the closing spread is consistent.
  const fallbackBg = darkBackground ? "#F7F4EF" : "#01253f";
  const brandBg = darkBackground ? brandStyle?.hookBackground : brandStyle?.background;
  const bg = isEditorial
    ? (slideBgColor ?? brandStyle?.background ?? "#EFEFF4")
    : (slideBgColor ?? brandBg ?? fallbackBg);
  const bgIsDark = isDarkColor(bg);
  const useAutoInk = slideBgColor !== undefined;
  const ink = bgIsDark ? INK_LIGHT : INK_DARK;

  const headlineColor = useAutoInk
    ? ink
    : (darkBackground ? (brandStyle?.headline ?? INK_DARK) : (brandStyle?.hookHeadline ?? INK_LIGHT));
  const bodyColor = bgIsDark ? "rgba(247,244,239,0.86)" : "rgba(1,37,63,0.84)";
  const mutedColor = bgIsDark ? "rgba(247,244,239,0.55)" : "rgba(1,37,63,0.5)";
  const useDarkInk = useAutoInk ? !bgIsDark : darkBackground;

  // Accent drives the numbered markers + interaction pill. Fall back to a teal
  // that holds contrast on both the dark and pearl backgrounds.
  const accent = brandStyle?.accent ?? (bgIsDark ? "#7FB5C4" : "#1e7a8a");
  const onAccentInk = isDarkColor(accent) ? "#F7F4EF" : "#01253f";

  const headlineFont = isEditorial
    ? { fontFamily: "Inter, system-ui, -apple-system, sans-serif", fontWeight: 300, fontSize: 64, textTransform: "none" as const, letterSpacing: "-0.015em" }
    : { fontFamily: "Jost, Montserrat, sans-serif", fontWeight: 400, fontSize: 60, textTransform: "uppercase" as const, letterSpacing: "0.12em" };
  const pointFont = isEditorial
    ? { fontFamily: "Inter, system-ui, -apple-system, sans-serif", fontWeight: 300, fontSize: 34 }
    : { fontFamily: "Cormorant Garamond, Lora, serif", fontWeight: 500, fontSize: 38 };

  return (
    <SlideWrapper scale={scale} height={slideH} id={id} style={{ background: bg }}>
      {/* fal.ai background image — 15% opacity, atmospheric */}
      {backgroundImage ? (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.15,
        }} />
      ) : shimmer ? (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.02) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s ease-in-out infinite",
        }} />
      ) : null}

      {!isEditorial && (
        <LuniaLogo variant={useDarkInk ? "dark" : "light"} sizeScale={logoScale} />
      )}
      {showSlideArrows && (
        <ArrowIcons color={brandStyle?.secondary ?? (bgIsDark ? "rgba(247,244,239,0.55)" : "rgba(1,37,63,0.45)")} sizeScale={arrowScale} />
      )}
      {showLuniaLifeWatermark && (
        <div style={{
          position: "absolute",
          bottom: prominentWatermark ? 30 : 24,
          left: 0, right: 0,
          textAlign: "center",
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: prominentWatermark ? 500 : 300,
          fontSize: prominentWatermark ? 22 : 18,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: useDarkInk ? "#01253f" : "#F7F4EF",
          opacity: prominentWatermark ? 0.55 : 0.13,
          pointerEvents: "none",
          userSelect: "none",
        }}>
          LUNIA LIFE
        </div>
      )}

      <div style={{ position: "absolute", top: contentTop, left: 72, right: 72 }}>
        {/* Eyebrow */}
        <div style={{
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 600,
          fontSize: 22,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: accent,
          marginBottom: 24,
        }}>
          The Takeaway
        </div>

        {/* Payoff headline */}
        <div style={{ ...headlineFont, color: headlineColor, lineHeight: 1.12 }}>
          {headline}
        </div>

        {/* Recap points — the save-bait. Numbered, skimmable, one line each. */}
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 30 }}>
          {points.filter((p) => p && p.trim().length > 0).slice(0, 3).map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
              <div style={{
                flexShrink: 0,
                width: 50, height: 50, borderRadius: "50%",
                background: accent,
                color: onAccentInk,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Jost, Montserrat, sans-serif",
                fontWeight: 600, fontSize: 26,
                marginTop: 2,
              }}>
                {i + 1}
              </div>
              <div style={{ ...pointFont, color: bodyColor, lineHeight: 1.3 }}>
                {p}
              </div>
            </div>
          ))}
        </div>

        {/* Interaction ask — the explicit engagement driver. */}
        <div style={{
          marginTop: 64,
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          padding: "22px 34px",
          borderRadius: 18,
          border: `2px solid ${accent}`,
          background: bgIsDark ? "rgba(255,255,255,0.04)" : "rgba(1,37,63,0.03)",
        }}>
          <div style={{
            flexShrink: 0,
            width: 60, height: 60, borderRadius: "50%",
            background: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={onAccentInk} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
              <path d={INTERACTION_GLYPH[interaction.type]} />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{
              fontFamily: "Jost, Montserrat, sans-serif",
              fontWeight: 700, fontSize: 20, letterSpacing: "0.18em",
              textTransform: "uppercase", color: accent,
            }}>
              {INTERACTION_VERB[interaction.type]}
            </div>
            <div style={{
              fontFamily: isEditorial ? "Inter, system-ui, -apple-system, sans-serif" : "Cormorant Garamond, Lora, serif",
              fontWeight: isEditorial ? 300 : 500,
              fontStyle: isEditorial ? "normal" : "italic",
              fontSize: 30,
              color: bodyColor,
              lineHeight: 1.25,
              maxWidth: 720,
            }}>
              {interaction.label}
            </div>
          </div>
        </div>

        {/* faint forward cue toward the closing CTA */}
        <div style={{
          marginTop: 40,
          fontFamily: "Jost, Montserrat, sans-serif",
          fontWeight: 500, fontSize: 18, letterSpacing: "0.22em",
          textTransform: "uppercase", color: mutedColor,
        }}>
          Keep swiping →
        </div>
      </div>
    </SlideWrapper>
  );
}
