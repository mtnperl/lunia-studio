import { Script } from "./types";

const KEY = "lunia_scripts";

export function getLibrary(): Script[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Script[]) : [];
  } catch {
    return [];
  }
}

export function saveScript(script: Script): void {
  if (typeof window === "undefined") return;
  try {
    const lib = getLibrary();
    const idx = lib.findIndex((s) => s.id === script.id);
    if (idx >= 0) lib[idx] = script;
    else lib.unshift(script);
    localStorage.setItem(KEY, JSON.stringify(lib));
  } catch {
    // silently fail if storage is full
  }
}

export function getScript(id: string): Script | undefined {
  return getLibrary().find((s) => s.id === id);
}

export function generateId(): string {
  return Date.now().toString();
}
