import { Script } from "./types";

// Client-side API wrapper — replaces localStorage.
// All persistence goes through /api/scripts.

export async function getLibrary(): Promise<Script[]> {
  try {
    const res = await fetch("/api/scripts");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveScript(script: Script): Promise<void> {
  try {
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(script),
    });
  } catch {
    // fail silently — script may not persist but UI keeps working
  }
}

export function generateId(): string {
  // nanoid-lite using crypto.randomUUID (available in all modern browsers + Node)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
