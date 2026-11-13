import { expect, it, vi } from "vitest";
import { revealPhotoPage } from "./reveal-photo-page";

it("reveals the first newly added photo inside the grid and focuses it without scrolling the page", () => {
  const cards = Array.from({ length: 24 }, (_, index) => ({
    getBoundingClientRect: () => ({ top: 200 + Math.floor(index / 3) * 120 }),
    focus: vi.fn(),
  }));
  const grid = { querySelectorAll: () => cards, scrollTop: 100, clientTop: 1,
    getBoundingClientRect: () => ({ top: 200 }), scrollTo: vi.fn() };
  revealPhotoPage(grid as unknown as HTMLElement, 12, false);
  expect(grid.scrollTo).toHaveBeenCalledWith({ top: 579, behavior: "smooth" });
  expect(cards[12].focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(cards[0].focus).not.toHaveBeenCalled();
});

it("respects reduced motion and safely ignores an empty or filtered-out page", () => {
  const card = { getBoundingClientRect: () => ({ top: 40 }), focus: vi.fn() };
  const grid = { querySelectorAll: () => [card], scrollTop: 0, clientTop: 0,
    getBoundingClientRect: () => ({ top: 20 }), scrollTo: vi.fn() };
  revealPhotoPage(grid as unknown as HTMLElement, 0, true);
  expect(grid.scrollTo).toHaveBeenCalledWith({ top: 20, behavior: "instant" });
  grid.scrollTo.mockClear();
  revealPhotoPage(grid as unknown as HTMLElement, 12, false);
  expect(grid.scrollTo).not.toHaveBeenCalled();
});
