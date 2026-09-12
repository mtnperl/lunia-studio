// The last pen colour chosen for a format, kept in this browser so the next
// new piece starts with it. A saved piece carries its own `penColor` and
// never reads this. Every read and write is guarded: storage can be missing
// or throw (private windows, blocked site data).

const KEY = (format: string) => `lunia:pen:${format}`;
const HEX = /^#[0-9a-f]{6}$/i;

export function rememberedPen(format: string): string | undefined {
  try {
    const v = window.localStorage.getItem(KEY(format));
    return v && HEX.test(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

export function rememberPen(format: string, hex: string | undefined): void {
  try {
    if (hex && HEX.test(hex)) window.localStorage.setItem(KEY(format), hex.toLowerCase());
    else window.localStorage.removeItem(KEY(format));
  } catch {
    // storage unavailable: the choice still applies to this piece
  }
}
