"use client";
import { createContext, useContext, type ReactNode } from "react";

const CarouselApiContext = createContext<string>("/api/carousel");

export function CarouselApiProvider({ apiBase, children }: { apiBase: string; children: ReactNode }) {
  return <CarouselApiContext.Provider value={apiBase}>{children}</CarouselApiContext.Provider>;
}

export function useCarouselApi(): string {
  return useContext(CarouselApiContext);
}
