"use client";
// Version history for one document: every save, newest first. Name the ones
// worth keeping; restore any of them. Restoring writes the snapshot back as
// the live document and the owner reloads.
import { useEffect, useState } from "react";
import { Dialog, Button, Input, EmptyState, useConfirm, useToast } from "@/components/ui";
import type { VersionKind, VersionMeta } from "@/lib/versions";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function VersionsPanel({ kind, documentId, open, onClose, onRestored }: {
  kind: VersionKind; documentId: string; open: boolean; onClose: () => void; onRestored: () => void;
}) {
  const [versions, setVersions] = useState<VersionMeta[] | null>(null);
  const [naming, setNaming] = useState<{ id: string; value: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch(`/api/versions?kind=${kind}&id=${encodeURIComponent(documentId)}`).then((r) => r.json()).then((d) => { if (alive) setVersions(Array.isArray(d) ? d : []); }).catch(() => { if (alive) setVersions([]); });
    return () => { alive = false; };
  }, [open, kind, documentId]);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/versions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id: documentId, ...body }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
  }

  async function saveName() {
    if (!naming) return;
    setBusy(naming.id);
    try {
      await post({ action: "name", versionId: naming.id, name: naming.value });
      setVersions((v) => (v ?? []).map((x) => (x.id === naming.id ? { ...x, name: naming.value.trim() || undefined } : x)));
      setNaming(null);
    } catch (e) { toast({ title: e instanceof Error ? e.message : "Could not name the version", kind: "danger" }); }
    finally { setBusy(null); }
  }

  async function restore(v: VersionMeta) {
    const ok = await confirm({ title: "Restore this version?", description: `The document goes back to ${v.name ?? ago(v.savedAt)}. The current state is kept in the history, so this is reversible.`, confirmLabel: "Restore" });
    if (!ok) return;
    setBusy(v.id);
    try { await post({ action: "restore", versionId: v.id }); toast({ title: "Version restored", kind: "success" }); onClose(); onRestored(); }
    catch (e) { toast({ title: e instanceof Error ? e.message : "Could not restore", kind: "danger" }); }
    finally { setBusy(null); }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Version history" ariaLabel="Version history">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 360 }}>
        {versions === null && <div style={{ fontSize: 13, color: "var(--ui-text-3)" }}>Loading</div>}
        {versions && versions.length === 0 && <EmptyState title="No versions yet" description="Every save from now on is kept here." />}
        {versions?.map((v, i) => (
          <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid var(--ui-border)", borderRadius: "var(--ui-radius-2)", background: i === 0 ? "var(--ui-surface-2)" : "var(--ui-surface)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {naming?.id === v.id ? (
                <form onSubmit={(e) => { e.preventDefault(); saveName(); }} style={{ display: "flex", gap: 6 }}>
                  <Input size="sm" autoFocus value={naming.value} onChange={(e) => setNaming({ id: v.id, value: e.target.value })} placeholder="Name this version" aria-label="Version name" style={{ flex: 1 }} />
                  <Button size="sm" type="submit" variant="secondary" busy={busy === v.id}>Save</Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => setNaming(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: v.name ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name ?? (i === 0 ? "Current save" : "Save")}</div>
                  <div style={{ fontSize: 12, color: "var(--ui-text-3)" }}>{ago(v.savedAt)}</div>
                </>
              )}
            </div>
            {naming?.id !== v.id && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setNaming({ id: v.id, value: v.name ?? "" })}>{v.name ? "Rename" : "Name"}</Button>
                {i > 0 && <Button size="sm" variant="secondary" busy={busy === v.id} onClick={() => restore(v)}>Restore</Button>}
              </>
            )}
          </div>
        ))}
      </div>
    </Dialog>
  );
}
