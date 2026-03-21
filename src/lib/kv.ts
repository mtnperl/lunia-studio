import { kv as vercelKv } from "@vercel/kv";
import { Script } from "./types";

const SCRIPTS_KEY = "lunia:scripts";
const TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year

export async function getScripts(): Promise<Script[]> {
  try {
    const data = await vercelKv.get<Script[]>(SCRIPTS_KEY);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function saveScriptKv(script: Script): Promise<void> {
  const lib = await getScripts();
  const idx = lib.findIndex((s) => s.id === script.id);
  if (idx >= 0) lib[idx] = script;
  else lib.unshift(script);
  await vercelKv.set(SCRIPTS_KEY, lib, { ex: TTL_SECONDS });
}

export async function getScriptById(id: string): Promise<Script | null> {
  const lib = await getScripts();
  return lib.find((s) => s.id === id) ?? null;
}
