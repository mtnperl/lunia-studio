/** Keep the next batch visible inside the contact sheet, without scrolling the editor. */
export function revealPhotoPage(grid: HTMLElement, index: number, reduceMotion: boolean) {
  const card = grid.querySelectorAll<HTMLButtonElement>("[data-photo-card]")[index];
  if (!card) return;
  const top = grid.scrollTop + card.getBoundingClientRect().top - grid.getBoundingClientRect().top - grid.clientTop;
  grid.scrollTo({ top, behavior: reduceMotion ? "instant" : "smooth" });
  card.focus({ preventScroll: true });
}
