// Headless render target for carousel content slides. Driven exclusively by
// api/carousel-v2/render-slide (Puppeteer) and the visual-regression harness;
// it is not linked from anywhere in the app UI.
//
// Props travel as ?props=<base64url(JSON)> so the page stays a plain GET and
// Puppeteer can navigate straight to it. The slide components are the SAME
// ones the in-app preview mounts — no parallel design, no pre-built bundle to
// drift out of date (the failure mode of the retired Remotion path).
import { GOOGLE_FONTS_CSS_URL } from "@/lib/brand-tokens";
import RenderSlideClient, { type RenderSlideProps } from "./RenderSlideClient";

export const dynamic = "force-dynamic";

function decodeProps(raw: string | undefined): RenderSlideProps {
  if (!raw) return { headline: "", body: "", citation: "" };
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as RenderSlideProps;
  } catch {
    return { headline: "", body: "", citation: "" };
  }
}

export default async function RenderCarouselSlidePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const raw = typeof params.props === "string" ? params.props : undefined;
  const props = decodeProps(raw);

  return (
    <>
      {/* React hoists these to <head>. display=block in the CSS URL keeps
          fallback metrics from ever painting in the capture. */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" precedence="default" href={GOOGLE_FONTS_CSS_URL} />
      <RenderSlideClient {...props} />
    </>
  );
}
