import { randomUUID } from "crypto";
import { redis } from "./kv";

/**
 * Version history: every save of a carousel or email keeps a snapshot. Named
 * versions are kept for good; unnamed ones roll off after MAX_UNNAMED. A save
 * identical to the last snapshot records nothing, so autosave does not fill
 * the list with copies. One Redis key per document; additive.
 */
export type VersionKind = "carousel" | "email";
export type DocVersion<T = unknown> = { id: string; savedAt: string; name?: string; snapshot: T };
export type VersionMeta = { id: string; savedAt: string; name?: string };

const MAX_UNNAMED = 15;
const keyOf = (kind: VersionKind, id: string) => `lunia:versions:${kind}:${id}`;

async function readAll<T>(kind: VersionKind, id: string): Promise<DocVersion<T>[]> {
  try { return (await redis.get<DocVersion<T>[]>(keyOf(kind, id))) ?? []; } catch { return []; }
}

/** Keep every named version and the newest MAX_UNNAMED unnamed ones. */
export function prune<T>(list: DocVersion<T>[]): DocVersion<T>[] {
  let unnamed = 0;
  return list.filter((v) => v.name ? true : ++unnamed <= MAX_UNNAMED);
}

export async function recordVersion<T>(kind: VersionKind, id: string, snapshot: T): Promise<void> {
  const list = await readAll<T>(kind, id);
  const last = list[0];
  if (last && JSON.stringify(last.snapshot) === JSON.stringify(snapshot)) return;
  list.unshift({ id: randomUUID(), savedAt: new Date().toISOString(), snapshot });
  await redis.set(keyOf(kind, id), prune(list));
}

export async function listVersions(kind: VersionKind, id: string): Promise<VersionMeta[]> {
  return (await readAll(kind, id)).map(({ id: vid, savedAt, name }) => ({ id: vid, savedAt, name }));
}

export async function getVersion<T>(kind: VersionKind, id: string, versionId: string): Promise<DocVersion<T> | null> {
  return (await readAll<T>(kind, id)).find((v) => v.id === versionId) ?? null;
}

export async function nameVersion(kind: VersionKind, id: string, versionId: string, name: string): Promise<boolean> {
  const list = await readAll(kind, id);
  const v = list.find((x) => x.id === versionId);
  if (!v) return false;
  const trimmed = name.trim().slice(0, 60);
  if (trimmed) v.name = trimmed; else delete v.name;
  await redis.set(keyOf(kind, id), prune(list));
  return true;
}
