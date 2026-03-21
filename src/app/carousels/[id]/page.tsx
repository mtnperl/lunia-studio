import { getCarouselById } from "@/lib/kv";
import { notFound } from "next/navigation";
import HookSlide from "@/components/carousel/slides/HookSlide";
import ContentSlide from "@/components/carousel/slides/ContentSlide";
import CTASlide from "@/components/carousel/slides/CTASlide";

type Props = { params: Promise<{ id: string }> };

export default async function CarouselSharePage({ params }: Props) {
  const { id } = await params;
  const carousel = await getCarouselById(id);

  if (!carousel) {
    notFound();
  }

  const { content, selectedHook, graphicStyles, topic } = carousel;
  const safeGraphicStyles = graphicStyles ?? [];
  const hook = content.hooks[selectedHook];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px 24px 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 20, height: 20, background: "#000", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, lineHeight: 1 }}>L</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.02em" }}>Lunia Studio</span>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{topic}</h1>
          <p style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
            {carousel.hookTone} • saved {new Date(carousel.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Slides */}
        <div style={{ display: "flex", gap: 20, overflowX: "auto", paddingBottom: 16 }}>
          <HookSlide headline={hook.headline} subline={hook.subline} scale={0.5} />
          {content.slides.map((slide, i) => (
            <ContentSlide
              key={i}
              headline={slide.headline}
              body={slide.body}
              citation={slide.citation}
              graphic={slide.graphic}
              graphicStyle={safeGraphicStyles[i]}
              scale={0.5}
            />
          ))}
          <CTASlide headline={content.cta.headline} followLine={content.cta.followLine} scale={0.5} />
        </div>

        {/* Citations */}
        <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 10 }}>
            Citations
          </div>
          {content.slides.map((slide, i) => (
            slide.citation && (
              <div key={i} style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6, lineHeight: 1.5 }}>
                [{i + 1}] {slide.citation}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
