import { getCarouselById } from "@/lib/kv";
import { notFound } from "next/navigation";
import CarouselShareClient from "@/components/CarouselShareClient";

type Props = { params: Promise<{ id: string }> };

export default async function CarouselSharePage({ params }: Props) {
  const { id } = await params;
  const carousel = await getCarouselById(id);

  if (!carousel) {
    notFound();
  }

  return <CarouselShareClient carousel={carousel} />;
}
