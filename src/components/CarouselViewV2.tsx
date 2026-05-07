"use client";
import CarouselView from "@/components/CarouselView";
import { CarouselApiProvider } from "@/components/carousel/api-context";
import type { SavedCarousel } from "@/lib/types";

export default function CarouselViewV2({ initialCarousel, onCarouselLoaded }: { initialCarousel?: SavedCarousel | null; onCarouselLoaded?: () => void }) {
  return (
    <CarouselApiProvider apiBase="/api/carousel-v2">
      <CarouselView initialCarousel={initialCarousel} onCarouselLoaded={onCarouselLoaded} version="v2" />
    </CarouselApiProvider>
  );
}
