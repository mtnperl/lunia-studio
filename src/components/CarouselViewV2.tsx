"use client";
import CarouselView from "@/components/CarouselView";
import { CarouselApiProvider } from "@/components/carousel/api-context";
import type { SavedCarousel } from "@/lib/types";

export default function CarouselViewV2({ initialCarousel, onCarouselLoaded, onSaved, onExit }: { initialCarousel?: SavedCarousel | null; onCarouselLoaded?: () => void; onSaved?: (id: string) => void; onExit?: () => void }) {
  return (
    <CarouselApiProvider apiBase="/api/carousel-v2">
      <CarouselView initialCarousel={initialCarousel} onCarouselLoaded={onCarouselLoaded} onSaved={onSaved} onExit={onExit} version="v2" />
    </CarouselApiProvider>
  );
}
