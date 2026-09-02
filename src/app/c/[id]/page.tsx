import StudioApp from "@/components/StudioApp";

/** A saved carousel, by URL. Opens the carousel editor on it. */
export default async function CarouselPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudioApp initialOpen={{ kind: "carousel", id }} />;
}
